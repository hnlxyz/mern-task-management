const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const UploadedFile = require("../models/UploadedFile");
const ExcelJS = require("exceljs");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

// RATE LIMITERS
const taskReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many requests. Please try again later."
    }
});

const taskWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many changes. Please try again later."
    }
});

// AUTHENTICATION
router.use(authMiddleware);

// HELPERS
const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "title",
    "priority"
];

const allowedSortOrders = [
    "asc",
    "desc"
];

// POST - CREATE TASK
router.post("/", taskWriteLimiter, async (req, res) => {
    try {
        const title =
            typeof req.body.title === "string"
                ? req.body.title.trim()
                : req.body.title;

        // Validate title
        if (!title) {
            return res.status(400).json({
                message: "Title is required"
            });
        }

        // Check duplicate title ONLY for current user
        const existingTask = await Task.findOne({
            user: req.user.id,
            title: {
                $regex: `^${escapeRegex(title)}$`,
                $options: "i"
            }
        });

        if (existingTask) {
            return res.status(409).json({
                message: "Task title already exists"
            });
        }

        // IMPORTANT:
        // Ownership comes from authenticated user.
        // Do not trust req.body.user.
        const task = await Task.create({
            title,
            description: req.body.description,
            status: req.body.status,
            priority: req.body.priority,
            dueDate: req.body.dueDate,
            user: req.user.id
        });

        res.status(201).json(task);

    } catch (error) {
        if (error.name === "ValidationError") {
            const errors = {};

            for (const field in error.errors) {
                errors[field] =
                    error.errors[field].message;
            }

            return res.status(400).json({
                message: "Validation failed",
                errors
            });
        }

        console.error("Error creating task:", error);

        res.status(500).json({
            message: "Failed to create task"
        });
    }
});

// GET /api/tasks/export/excel
// EXPORT TASKS USING CURRENT FILTERS
router.get(
    "/export/excel",
    taskReadLimiter,
    async (req, res) => {
        try {
            const {
                status,
                priority,
                search,
                startDate,
                endDate,
                sortBy = "createdAt",
                sortOrder = "desc"
            } = req.query;

            // Validate sorting
            if (!allowedSortFields.includes(sortBy)) {
                return res.status(400).json({
                    message: "Invalid sort field"
                });
            }

            if (!allowedSortOrders.includes(sortOrder)) {
                return res.status(400).json({
                    message: "Invalid sort order"
                });
            }

            // IMPORTANT:
            // Only export tasks belonging to current user
            const filter = {
                user: req.user.id
            };

            if (status) {
                filter.status = status;
            }

            if (priority) {
                filter.priority = priority;
            }

            // Search
            if (search) {
                filter.title = {
                    $regex: escapeRegex(search),
                    $options: "i"
                };
            }

            // Date filter
            if (startDate || endDate) {
                filter.createdAt = {};

                if (startDate) {
                    const start = new Date(
                        `${startDate}T00:00:00.000Z`
                    );

                    if (Number.isNaN(start.getTime())) {
                        return res.status(400).json({
                            message: "Invalid start date"
                        });
                    }

                    filter.createdAt.$gte = start;
                }

                if (endDate) {
                    const end = new Date(
                        `${endDate}T00:00:00.000Z`
                    );

                    if (Number.isNaN(end.getTime())) {
                        return res.status(400).json({
                            message: "Invalid end date"
                        });
                    }

                    end.setUTCDate(
                        end.getUTCDate() + 1
                    );

                    filter.createdAt.$lt = end;
                }
            }

            // Fetch tasks
            let tasks;

            if (sortBy === "priority") {
                const priorityOrder =
                    sortOrder === "asc"
                        ? {
                              low: 1,
                              medium: 2,
                              high: 3
                          }
                        : {
                              high: 1,
                              medium: 2,
                              low: 3
                          };

                tasks = await Task.aggregate([
                    {
                        $match: filter
                    },
                    {
                        $addFields: {
                            priorityOrder: {
                                $switch: {
                                    branches: [
                                        {
                                            case: {
                                                $eq: [
                                                    "$priority",
                                                    "low"
                                                ]
                                            },
                                            then:
                                                priorityOrder.low
                                        },
                                        {
                                            case: {
                                                $eq: [
                                                    "$priority",
                                                    "medium"
                                                ]
                                            },
                                            then:
                                                priorityOrder.medium
                                        },
                                        {
                                            case: {
                                                $eq: [
                                                    "$priority",
                                                    "high"
                                                ]
                                            },
                                            then:
                                                priorityOrder.high
                                        }
                                    ],
                                    default: 0
                                }
                            }
                        }
                    },
                    {
                        $sort: {
                            priorityOrder: 1
                        }
                    }
                ]);
            } else {
                tasks = await Task.find(filter).sort({
                    [sortBy]:
                        sortOrder === "asc"
                            ? 1
                            : -1
                });
            }

            // CREATE EXCEL WORKBOOK
            const workbook = new ExcelJS.Workbook();

            const worksheet =
                workbook.addWorksheet("Tasks");

            worksheet.columns = [
                {
                    header: "Title",
                    key: "title",
                    width: 25
                },
                {
                    header: "Description",
                    key: "description",
                    width: 40
                },
                {
                    header: "Status",
                    key: "status",
                    width: 15
                },
                {
                    header: "Priority",
                    key: "priority",
                    width: 15
                },
                {
                    header: "Due Date",
                    key: "dueDate",
                    width: 15
                },
                {
                    header: "Created At",
                    key: "createdAt",
                    width: 20
                },
                {
                    header: "Updated At",
                    key: "updatedAt",
                    width: 20
                }
            ];

            // Add tasks
            tasks.forEach((task) => {
                worksheet.addRow({
                    title: task.title,
                    description: task.description || "",
                    status: task.status,
                    priority: task.priority,
                    dueDate: task.dueDate
                        ? new Date(task.dueDate)
                        : "",
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                });
            });

            // Header style
            worksheet.getRow(1).font = {
                bold: true
            };

            // Date formats
            worksheet.getColumn("dueDate").numFmt =
                "dd-mmm-yyyy";

            worksheet.getColumn("createdAt").numFmt =
                "dd-mmm-yyyy hh:mm";

            worksheet.getColumn("updatedAt").numFmt =
                "dd-mmm-yyyy hh:mm";

            // Response headers
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                'attachment; filename="tasks.xlsx"'
            );

            await workbook.xlsx.write(res);

            res.end();

        } catch (error) {
            console.error(
                "Error exporting tasks:",
                error
            );

            res.status(500).json({
                message: "Failed to export tasks"
            });
        }
    }
);

// GET - GET TASKS
router.get("/", taskReadLimiter, async (req, res) => {
    try {
        const {
            status,
            priority,
            search,
            startDate,
            endDate,
            sortBy = "createdAt",
            sortOrder = "desc",
            page = 1,
            limit = 10
        } = req.query;

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        // VALIDATE SORTING
        if (!allowedSortFields.includes(sortBy)) {
            return res.status(400).json({
                message: "Invalid sort field"
            });
        }

        if (!allowedSortOrders.includes(sortOrder)) {
            return res.status(400).json({
                message: "Invalid sort order"
            });
        }

        // VALIDATE PAGINATION
        if (
            !Number.isInteger(pageNumber) ||
            pageNumber < 1
        ) {
            return res.status(400).json({
                message: "Invalid page",
                error: "Page must be a positive integer"
            });
        }

        if (
            !Number.isInteger(limitNumber) ||
            limitNumber < 1 ||
            limitNumber > 100
        ) {
            return res.status(400).json({
                message: "Invalid limit",
                error: "Limit must be between 1 and 100"
            });
        }

        // USER FILTER
        const filter = {
            user: req.user.id
        };

        if (status) {
            filter.status = status;
        }

        if (priority) {
            filter.priority = priority;
        }

        // Escape search regex
        if (search) {
            filter.title = {
                $regex: escapeRegex(search),
                $options: "i"
            };
        }

        // DATE FILTER
        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                const start = new Date(
                    `${startDate}T00:00:00.000Z`
                );

                if (Number.isNaN(start.getTime())) {
                    return res.status(400).json({
                        message: "Invalid start date"
                    });
                }

                filter.createdAt.$gte = start;
            }

            if (endDate) {
                const end = new Date(
                    `${endDate}T00:00:00.000Z`
                );

                if (Number.isNaN(end.getTime())) {
                    return res.status(400).json({
                        message: "Invalid end date"
                    });
                }

                end.setUTCDate(
                    end.getUTCDate() + 1
                );

                filter.createdAt.$lt = end;
            }
        }

        // PAGINATION
        const skip =
            (pageNumber - 1) * limitNumber;

        // FETCH TASKS
        let tasks;

        if (sortBy === "priority") {
            const priorityOrder =
                sortOrder === "asc"
                    ? {
                          low: 1,
                          medium: 2,
                          high: 3
                      }
                    : {
                          high: 1,
                          medium: 2,
                          low: 3
                      };

            tasks = await Task.aggregate([
                {
                    $match: filter
                },
                {
                    $addFields: {
                        priorityOrder: {
                            $switch: {
                                branches: [
                                    {
                                        case: {
                                            $eq: [
                                                "$priority",
                                                "low"
                                            ]
                                        },
                                        then:
                                            priorityOrder.low
                                    },
                                    {
                                        case: {
                                            $eq: [
                                                "$priority",
                                                "medium"
                                            ]
                                        },
                                        then:
                                            priorityOrder.medium
                                    },
                                    {
                                        case: {
                                            $eq: [
                                                "$priority",
                                                "high"
                                            ]
                                        },
                                        then:
                                            priorityOrder.high
                                    }
                                ],
                                default: 0
                            }
                        }
                    }
                },
                {
                    $sort: {
                        priorityOrder: 1
                    }
                },
                {
                    $skip: skip
                },
                {
                    $limit: limitNumber
                }
            ]);
        } else {
            tasks = await Task.find(filter)
                .sort({
                    [sortBy]:
                        sortOrder === "asc"
                            ? 1
                            : -1
                })
                .skip(skip)
                .limit(limitNumber);
        }

        // COUNT
        const total =
            await Task.countDocuments(filter);

        const totalPages =
            Math.ceil(total / limitNumber);

        // RESPONSE
        res.status(200).json({
            tasks,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages
            }
        });

    } catch (error) {
        console.error(
            "Error fetching tasks:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch tasks"
        });
    }
});

// GET /api/tasks/stats
router.get(
    "/stats",
    taskReadLimiter,
    async (req, res) => {
        try {
            const total =
                await Task.countDocuments({
                    user: req.user.id
                });

            const todo =
                await Task.countDocuments({
                    user: req.user.id,
                    status: "todo"
                });

            const inProgress =
                await Task.countDocuments({
                    user: req.user.id,
                    status: "in-progress"
                });

            const completed =
                await Task.countDocuments({
                    user: req.user.id,
                    status: "completed"
                });

            const lowPriority =
                await Task.countDocuments({
                    user: req.user.id,
                    priority: "low"
                });

            const mediumPriority =
                await Task.countDocuments({
                    user: req.user.id,
                    priority: "medium"
                });

            const highPriority =
                await Task.countDocuments({
                    user: req.user.id,
                    priority: "high"
                });


            // OVERDUE
            const today = new Date();

            today.setUTCHours(
                0,
                0,
                0,
                0
            );

            const overdue =
                await Task.countDocuments({
                    user: req.user.id,
                    dueDate: {
                        $lt: today
                    },
                    status: {
                        $ne: "completed"
                    }
                });

            res.status(200).json({
                total,
                status: {
                    todo,
                    inProgress,
                    completed
                },
                priority: {
                    low: lowPriority,
                    medium: mediumPriority,
                    high: highPriority
                },
                overdue
            });

        } catch (error) {
            console.error(
                "Error fetching task statistics:",
                error
            );

            res.status(500).json({
                message: "Failed to fetch task statistics"
            });
        }
    }
);

// GET /api/tasks/:id
router.get(
    "/:id",
    taskReadLimiter,
    async (req, res) => {
        try {
            // Validate ObjectId
            if (!isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    message: "Invalid task ID"
                });
            }

            // Only retrieve task belonging to current user
            const task =
                await Task.findOne({
                    _id: req.params.id,
                    user: req.user.id
                });

            if (!task) {
                return res.status(404).json({
                    message: "Task not found"
                });
            }

            res.status(200).json(task);

        } catch (error) {
            console.error(
                "Error fetching task:",
                error
            );

            res.status(500).json({
                message: "Failed to fetch task"
            });
        }
    }
);

// PUT /api/tasks/:id
router.put(
    "/:id",
    taskWriteLimiter,
    async (req, res) => {
        try {
            // Validate ObjectId
            if (!isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    message: "Invalid task ID"
                });
            }

            const title =
                typeof req.body.title === "string"
                    ? req.body.title.trim()
                    : req.body.title;

            // Validate title
            if (!title) {
                return res.status(400).json({
                    message: "Title is required"
                });
            }

            // CHECK DUPLICATE TITLE
            const existingTask =
                await Task.findOne({
                    user: req.user.id,
                    title: {
                        $regex:
                            `^${escapeRegex(title)}$`,
                        $options: "i"
                    },
                    _id: {
                        $ne: req.params.id
                    }
                });

            if (existingTask) {
                return res.status(409).json({
                    message: "Task title already exists"
                });
            }

            // UPDATE ONLY USER'S TASK
            const task =
                await Task.findOneAndUpdate(
                    {
                        _id: req.params.id,
                        user: req.user.id
                    },
                    {
                        title,
                        description:
                            req.body.description,
                        status:
                            req.body.status,
                        priority:
                            req.body.priority,
                        dueDate:
                            req.body.dueDate
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                );

            if (!task) {
                return res.status(404).json({
                    message: "Task not found"
                });
            }

            res.status(200).json(task);

        } catch (error) {
            if (error.name === "ValidationError") {
                const errors = {};

                for (const field in error.errors) {
                    errors[field] =
                        error.errors[field].message;
                }

                return res.status(400).json({
                    message: "Validation failed",
                    errors
                });
            }

            console.error(
                "Error updating task:",
                error
            );

            res.status(500).json({
                message: "Failed to update task"
            });
        }
    }
);

// DELETE /api/tasks/:id
router.delete(
    "/:id",
    taskWriteLimiter,
    async (req, res) => {
        try {
            // Validate ObjectId
            if (!isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    message: "Invalid task ID"
                });
            }

            // FIND TASK OWNED BY CURRENT USER
            const task =
                await Task.findOne({
                    _id: req.params.id,
                    user: req.user.id
                });

            if (!task) {
                return res.status(404).json({
                    message: "Task not found"
                });
            }

            // FIND ASSOCIATED FILES
            const files =
                await UploadedFile.find({
                    taskId: req.params.id
                });

            // DELETE PHYSICAL FILES
            for (const file of files) {
                if (
                    file.filePath &&
                    fs.existsSync(file.filePath)
                ) {
                    try {
                        await fs.promises.unlink(
                            file.filePath
                        );
                    } catch (fileError) {
                        console.error(
                            "Error deleting physical file:",
                            fileError
                        );

                        // Continue deleting other files
                    }
                }
            }

            // DELETE FILE RECORDS
            await UploadedFile.deleteMany({
                taskId: req.params.id
            });

            // DELETE TASK
            await Task.findOneAndDelete({
                _id: req.params.id,
                user: req.user.id
            });

            // RESPONSE
            res.status(200).json({
                message:
                    "Task and associated files deleted successfully",
                deletedFiles:
                    files.length
            });

        } catch (error) {
            console.error(
                "Error deleting task:",
                error
            );

            res.status(500).json({
                message: "Failed to delete task"
            });
        }
    }
);

// EXPORT ROUTER

module.exports = router;