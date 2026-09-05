const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UploadedFile = require("../models/UploadedFile");
const Task = require("../models/Task");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* AUTHENTICATION */
router.use(authMiddleware);

/* UPLOAD DIRECTORY */
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true,
    });
}

/* PATH SECURITY */

/*
 * Ensures a file path is physically located inside
 * the application's upload directory.
 *
 * This prevents paths such as:
 *
 * C:\secret.txt
 * ../../secret.txt
 *
 * from being accessed through a database record.
 */

const isPathInsideUploadDir = (filePath) => {
    if (!filePath || typeof filePath !== "string") {
        return false;
    }

    const resolvedUploadDir = path.resolve(uploadDir);
    const resolvedFilePath = path.resolve(filePath);

    return (
        resolvedFilePath === resolvedUploadDir ||
        resolvedFilePath.startsWith(
            `${resolvedUploadDir}${path.sep}`
        )
    );
};

/* FILENAME VALIDATION */

/*
 * Validate user-provided filenames.
 *
 * Prevents:
 *
 * - Empty filenames
 * - Very long filenames
 * - Control characters
 * - Windows path separators
 * - Linux/Unix path separators
 * - Windows-invalid characters
 * - "." and ".."
 */

const isValidFileName = (fileName) => {
    if (!fileName || typeof fileName !== "string") {
        return false;
    }

    if (fileName.length > 255) {
        return false;
    }

    if (fileName === "." || fileName === "..") {
        return false;
    }

    /*
     * Control characters:
     *
     * \u0000-\u001F
     * \u007F
     */
    if (/[\u0000-\u001F\u007F]/.test(fileName)) {
        return false;
    }

    /*
     * Windows-invalid filename characters:
     *
     * < > : " / \ | ? *
     */
    if (/[<>:"/\\|?*]/.test(fileName)) {
        return false;
    }

    /*
     * Windows reserved device names.
     *
     * Examples:
     *
     * CON
     * PRN
     * AUX
     * NUL
     * COM1
     * LPT1
     */

    const nameWithoutExtension = fileName
        .split(".")[0]
        .trim()
        .toUpperCase();

    const reservedNames = new Set([
        "CON",
        "PRN",
        "AUX",
        "NUL",
        "COM1",
        "COM2",
        "COM3",
        "COM4",
        "COM5",
        "COM6",
        "COM7",
        "COM8",
        "COM9",
        "LPT1",
        "LPT2",
        "LPT3",
        "LPT4",
        "LPT5",
        "LPT6",
        "LPT7",
        "LPT8",
        "LPT9",
    ]);

    if (reservedNames.has(nameWithoutExtension)) {
        return false;
    }

    /*
     * Windows filenames should not end with
     * a space or period.
     */
    if (/[ .]$/.test(fileName)) {
        return false;
    }

    return true;
};

/* MULTER STORAGE */

/*
 * Files are first stored using a temporary UUID filename.
 *
 * Example:
 *
 * Temporary:
 * 550e8400-e29b-41d4-a716-446655440000.tmp
 *
 * Final:
 * Project Report.xlsx
 */

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const tempName = `${crypto.randomUUID()}.tmp`;

        cb(null, tempName);
    },
});

/* ALLOWED FILE TYPES */
const allowedMimeTypes = new Set([
    "application/pdf",

    "application/msword",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",

    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    "image/jpeg",

    "image/png",

    "image/gif",

    "image/webp",

    "application/zip",

    "application/x-zip-compressed",
]);

/* FILE FILTER */
const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
        return cb(null, true);
    }

    const error = new Error(
        "File type is not allowed."
    );

    error.code = "INVALID_FILE_TYPE";

    return cb(error);
};

/* MULTER */
const upload = multer({
    storage,

    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10,
    },

    fileFilter,
});

/* CLEANUP UPLOADED FILES */
const cleanupUploadedFiles = async (files = []) => {
    for (const file of files) {
        const possiblePaths = [
            file?.path,
            file?.finalPath,
        ].filter(Boolean);

        for (const filePath of possiblePaths) {
            /*
             * Only remove files inside upload directory.
             */

            if (!isPathInsideUploadDir(filePath)) {
                continue;
            }

            try {
                await fs.promises.unlink(filePath);
            } catch (error) {
                /*
                 * File may already have been removed.
                 */

                if (error.code !== "ENOENT") {
                    console.error(
                        "Error cleaning up uploaded file:",
                        error.message
                    );
                }
            }
        }
    }
};

/* MULTER WRAPPER */

/*
 * Ensures partially uploaded files are cleaned up
 * when Multer itself fails.
 */

const uploadFiles = (req, res, next) => {
    upload.array("files", 10)(
        req,
        res,
        async (error) => {
            if (error) {
                const files =
                    req.files ||
                    (req.file ? [req.file] : []);

                await cleanupUploadedFiles(files);

                return next(error);
            }

            return next();
        }
    );
};

/* GET OWNED TASK */
const getOwnedTask = async (taskId, userId) => {
    return Task.findOne({
        _id: taskId,
        user: userId,
    });
};

/* FILE RATE LIMITING */

/*
 * Simple in-memory rate limiter.
 *
 * This protects the application from excessive file
 * operations during development and portfolio deployment.
 *
 * Production note:
 * For multiple server instances, use a shared store
 * such as Redis.
 */

const fileRateLimitStore = new Map();

const createFileRateLimiter = ({
    windowMs,
    max,
    message,
}) => {
    return (req, res, next) => {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "Authentication required.",
            });
        }

        const key = `${userId}:${req.method}:${req.route?.path || req.path}`;

        const now = Date.now();

        const existing =
            fileRateLimitStore.get(key);

        if (
            !existing ||
            now - existing.windowStart >= windowMs
        ) {
            fileRateLimitStore.set(key, {
                windowStart: now,
                count: 1,
            });

            return next();
        }

        if (existing.count >= max) {
            return res.status(429).json({
                message,
            });
        }

        existing.count += 1;

        return next();
    };
};

/*
 * Uploads:
 *
 * 20 upload requests per 15 minutes per user.
 */

const uploadRateLimiter = createFileRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message:
        "Too many upload requests. Please try again later.",
});

/*
 * File reads:
 *
 * 120 requests per 15 minutes per user.
 */

const fileReadRateLimiter = createFileRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 120,
    message:
        "Too many file requests. Please try again later.",
});

/*
 * File deletes:
 *
 * 30 requests per 15 minutes per user.
 */

const fileDeleteRateLimiter = createFileRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message:
        "Too many delete requests. Please try again later.",
});

/* CHECK FILE NAME */

/*
 * This endpoint checks whether a filename already exists
 * in the global uploads directory.
 *
 * Current project design:
 *
 * All physical filenames must be globally unique.
 */

router.get(
    "/check-name",
    fileReadRateLimiter,
    async (req, res) => {
        try {
            const fileName = String(
                req.query.fileName || ""
            ).trim();

            if (!fileName) {
                return res.status(200).json({
                    exists: false,
                });
            }

            /*
             * Remove any path components.
             */

            const safeFileName =
                path.basename(fileName);

            /*
             * Validate filename.
             */

            if (!isValidFileName(safeFileName)) {
                return res.status(400).json({
                    message:
                        "Invalid file name.",
                });
            }

            const finalPath = path.join(
                uploadDir,
                safeFileName
            );

            /*
             * Final containment check.
             */

            if (
                !isPathInsideUploadDir(
                    finalPath
                )
            ) {
                return res.status(400).json({
                    message:
                        "Invalid file name.",
                });
            }

            const exists =
                await fs.promises
                    .access(finalPath)
                    .then(() => true)
                    .catch(() => false);

            return res.status(200).json({
                exists,
                fileName: safeFileName,
            });
        } catch (error) {
            console.error(
                "Error checking filename:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to check filename.",
            });
        }
    }
);

/* UPLOAD FILES */
router.post(
    "/upload",
    uploadRateLimiter,
    uploadFiles,
    async (req, res) => {
        try {
            const { taskId } = req.body;

            /* Validate Task ID */
            if (
                !taskId ||
                typeof taskId !== "string"
            ) {
                await cleanupUploadedFiles(
                    req.files || []
                );

                return res.status(400).json({
                    message:
                        "Task ID is required.",
                });
            }

            /* Validate Uploaded Files */
            if (
                !Array.isArray(req.files) ||
                req.files.length === 0
            ) {
                return res.status(400).json({
                    message:
                        "No files were uploaded.",
                });
            }

            /* Verify Task Ownership */
            const task =
                await getOwnedTask(
                    taskId,
                    req.user.id
                );

            if (!task) {
                await cleanupUploadedFiles(
                    req.files
                );

                return res.status(404).json({
                    message:
                        "Task not found.",
                });
            }

            /* Completed Tasks Cannot Receive Files */
            if (
                task.status === "completed"
            ) {
                await cleanupUploadedFiles(
                    req.files
                );

                return res.status(400).json({
                    message:
                        "Files cannot be uploaded to a completed task.",
                });
            }

            /*Get Custom File Names */
            let fileNames =
                req.body.fileNames || [];

            if (
                !Array.isArray(fileNames)
            ) {
                fileNames = [fileNames];
            }

            /* Validate File Name Count */
            if (
                fileNames.length !==
                req.files.length
            ) {
                await cleanupUploadedFiles(
                    req.files
                );

                return res.status(400).json({
                    message:
                        "File names do not match the uploaded files.",
                });
            }

            /* Create Database Records */
            const uploadedFiles = [];

            /*
             * Prevent duplicate filenames within
             * the same upload request.
             */
            const namesUsedInThisUpload =
                new Set();

            try {
                for (
                    let i = 0;
                    i < req.files.length;
                    i++
                ) {
                    const file =
                        req.files[i];

                    /* User Filename */
                    const safeOriginalName =
                        path
                            .basename(
                                String(
                                    fileNames[i] ||
                                        ""
                                )
                            )
                            .trim();

                    /* Validate Filename */
                    if (
                        !isValidFileName(
                            safeOriginalName
                        )
                    ) {
                        const error =
                            new Error(
                                "Invalid file name."
                            );

                        error.code =
                            "INVALID_FILE_NAME";

                        throw error;
                    }

                    /* Normalize Filename For Comparison */
                    const normalizedName =
                        safeOriginalName.toLowerCase();

                    /* Duplicate Within Current Upload */
                    if (
                        namesUsedInThisUpload.has(
                            normalizedName
                        )
                    ) {
                        const error =
                            new Error(
                                `A file named "${safeOriginalName}" already exists in this upload.`
                            );

                        error.code =
                            "DUPLICATE_FILE_NAME";

                        throw error;
                    }

                    namesUsedInThisUpload.add(
                        normalizedName
                    );

                    /* Final Physical Path*/
                    const finalPath =
                        path.join(
                            uploadDir,
                            safeOriginalName
                        );

                    /* Final Path Security Check */
                    if (
                        !isPathInsideUploadDir(
                            finalPath
                        )
                    ) {
                        const error =
                            new Error(
                                "Invalid file path."
                            );

                        error.code =
                            "INVALID_FILE_PATH";

                        throw error;
                    }

                    /* GLOBAL FOLDER DUPLICATE CHECK */
                    const folderFileExists =
                        await fs.promises
                            .access(
                                finalPath
                            )
                            .then(
                                () => true
                            )
                            .catch(
                                () => false
                            );

                    if (
                        folderFileExists
                    ) {
                        const error =
                            new Error(
                                `A file named "${safeOriginalName}" already exists in the upload folder.`
                            );

                        error.code =
                            "DUPLICATE_FILE_NAME";

                        throw error;
                    }

                    /* DATABASE DUPLICATE CHECK */
                    const escapedName =
                        safeOriginalName.replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        );

                    const existingFile =
                        await UploadedFile.findOne({
                            originalName: {
                                $regex:
                                    `^${escapedName}$`,
                                $options: "i",
                            },
                        });

                    if (
                        existingFile
                    ) {
                        const error =
                            new Error(
                                `A file named "${safeOriginalName}" already exists.`
                            );

                        error.code =
                            "DUPLICATE_FILE_NAME";

                        throw error;
                    }

                    /* Temporary Physical File */
                    const tempPath =
                        file.path;

                    /* Verify Temporary Path */
                    if (
                        !isPathInsideUploadDir(
                            tempPath
                        )
                    ) {
                        const error =
                            new Error(
                                "Invalid temporary file path."
                            );

                        error.code =
                            "INVALID_FILE_PATH";

                        throw error;
                    }

                    /* Rename To User Filename */
                    await fs.promises.rename(
                        tempPath,
                        finalPath
                    );

                    /*
                     * Store final path so cleanup can
                     * remove it if database creation fails.
                     */

                    file.finalPath =
                        finalPath;

                    /* Create Database Record */
                    const uploadedFile =
                        await UploadedFile.create({
                            taskId: task._id,

                            /*
                             * User-visible filename.
                             */

                            originalName:
                                safeOriginalName,

                            /*
                             * Physical filename.
                             */

                            fileName:
                                safeOriginalName,

                            /*
                             * Full physical path.
                             */

                            filePath:
                                finalPath,

                            mimeType:
                                file.mimetype,

                            size:
                                file.size,
                        });

                    uploadedFiles.push(
                        uploadedFile
                    );
                }
            } catch (error) {
                /* Cleanup Physical Files */
                await cleanupUploadedFiles(
                    req.files || []
                );

                /* Cleanup Database Records */
                if (
                    uploadedFiles.length >
                    0
                ) {
                    await UploadedFile.deleteMany({
                        _id: {
                            $in:
                                uploadedFiles.map(
                                    (file) =>
                                        file._id
                                ),
                        },
                    });
                }

                throw error;
            }

            /* Success */
            return res.status(201).json({
                message:
                    "Files uploaded successfully.",
                files:
                    uploadedFiles,
            });
        } catch (error) {
            console.error(
                "File upload error:",
                error
            );

            /* Duplicate Filename */
            if (
                error?.code ===
                "DUPLICATE_FILE_NAME"
            ) {
                return res.status(400).json({
                    message:
                        error.message,
                });
            }

            /* Invalid Filename */
            if (
                error?.code ===
                "INVALID_FILE_NAME"
            ) {
                return res.status(400).json({
                    message:
                        error.message ||
                        "Invalid file name.",
                });
            }

            /* Invalid File Path */
            if (
                error?.code ===
                "INVALID_FILE_PATH"
            ) {
                return res.status(400).json({
                    message:
                        "Invalid file path.",
                });
            }

            /* Generic Error */
            return res.status(500).json({
                message:
                    "Upload failed. Please try again.",
            });
        }
    }
);

/* GET FILES FOR A TASK */
router.get(
    "/task/:taskId",
    fileReadRateLimiter,
    async (req, res) => {
        try {
            const {
                taskId,
            } = req.params;

            /*
             * Verify task ownership first.
             */

            const task =
                await getOwnedTask(
                    taskId,
                    req.user.id
                );

            if (!task) {
                return res.status(404).json({
                    message:
                        "Task not found.",
                });
            }

            const files =
                await UploadedFile.find({
                    taskId: task._id,
                }).sort({
                    createdAt: -1,
                });

            return res.status(200).json({
                files,
            });
        } catch (error) {
            console.error(
                "Error fetching task files:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to fetch task files.",
            });
        }
    }
);

/* DOWNLOAD FILE */
router.get(
    "/:id",
    fileReadRateLimiter,
    async (req, res) => {
        try {
            const file =
                await UploadedFile.findById(
                    req.params.id
                );

            if (!file) {
                return res.status(404).json({
                    message:
                        "File not found.",
                });
            }

            /* Verify Ownership Through Task*/
            const task =
                await getOwnedTask(
                    file.taskId,
                    req.user.id
                );

            if (!task) {
                return res.status(404).json({
                    message:
                        "File not found.",
                });
            }

            /* Verify File Path */
            if (
                !file.filePath ||
                !isPathInsideUploadDir(
                    file.filePath
                )
            ) {
                console.error(
                    "Blocked invalid file path:",
                    file.filePath
                );

                return res.status(404).json({
                    message:
                        "File not found.",
                });
            }

            /* Verify Physical File */
            try {
                await fs.promises.access(
                    file.filePath,
                    fs.constants.R_OK
                );
            } catch (error) {
                return res.status(404).json({
                    message:
                        "Physical file not found.",
                });
            }

            /* Download Using User Filename */
            return res.download(
                file.filePath,
                file.originalName,
                (error) => {
                    if (error) {
                        console.error(
                            "File download error:",
                            error
                        );

                        /*
                         * Do not attempt another response
                         * if headers were already sent.
                         */

                        if (!res.headersSent) {
                            return res.status(500).json({
                                message:
                                    "Failed to download file.",
                            });
                        }
                    }
                }
            );
        } catch (error) {
            console.error(
                "Error downloading file:",
                error
            );

            if (!res.headersSent) {
                return res.status(500).json({
                    message:
                        "Failed to download file.",
                });
            }
        }
    }
);

/* DELETE FILE */
router.delete(
    "/:id",
    fileDeleteRateLimiter,
    async (req, res) => {
        try {
            const file =
                await UploadedFile.findById(
                    req.params.id
                );

            if (!file) {
                return res.status(404).json({
                    message:
                        "File not found.",
                });
            }

            /* Verify Task Ownership*/
            const task =
                await getOwnedTask(
                    file.taskId,
                    req.user.id
                );

            if (!task) {
                return res.status(404).json({
                    message:
                        "File not found.",
                });
            }

            /* Completed Tasks Cannot Delete Attachments */
            if (
                task.status === "completed"
            ) {
                return res.status(400).json({
                    message:
                        "Files cannot be deleted from a completed task.",
                });
            }

            /* Verify Physical Path */
            if (
                file.filePath &&
                !isPathInsideUploadDir(
                    file.filePath
                )
            ) {
                console.error(
                    "Blocked invalid delete path:",
                    file.filePath
                );

                return res.status(404).json({
                    message:
                        "File not found.",
                });
            }

            /* Delete Physical File */
            if (file.filePath) {
                try {
                    await fs.promises.unlink(
                        file.filePath
                    );
                } catch (fileError) {
                    /*
                     * If the physical file is already gone,
                     * we can still remove the database record.
                     */

                    if (
                        fileError.code !==
                        "ENOENT"
                    ) {
                        console.error(
                            "Error deleting physical file:",
                            fileError
                        );

                        return res.status(500).json({
                            message:
                                "Failed to delete physical file.",
                        });
                    }
                }
            }

            /* Delete Database Record */

            /*
             * Ownership was already verified through
             * the task above.
             */

            await UploadedFile.findByIdAndDelete(
                file._id
            );

            return res.status(200).json({
                message:
                    "File deleted successfully.",
            });
        } catch (error) {
            console.error(
                "Error deleting file:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to delete file.",
            });
        }
    }
);

/* GET ALL FILES BELONGING TO CURRENT USER */
router.get(
    "/",
    fileReadRateLimiter,
    async (req, res) => {
        try {
            /*
             * Get only tasks belonging to
             * the authenticated user.
             */

            const tasks =
                await Task.find({
                    user: req.user.id,
                }).select("_id");

            const taskIds =
                tasks.map(
                    (task) => task._id
                );

            /*
             * Get files only for those tasks.
             */

            const files =
                await UploadedFile.find({
                    taskId: {
                        $in: taskIds,
                    },
                }).sort({
                    createdAt: -1,
                });

            return res.status(200).json({
                files,
            });
        } catch (error) {
            console.error(
                "Error fetching uploaded files:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to fetch uploaded files.",
            });
        }
    }
);

/* MULTER ERROR HANDLER */
router.use(
    (
        error,
        req,
        res,
        next
    ) => {
        /*
         * Multer errors
         */

        if (
            error instanceof
            multer.MulterError
        ) {
            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {
                return res.status(400).json({
                    message:
                        "File size must not exceed 10 MB.",
                });
            }

            if (
                error.code ===
                "LIMIT_FILE_COUNT"
            ) {
                return res.status(400).json({
                    message:
                        "You can upload a maximum of 10 files at once.",
                });
            }

            if (
                error.code ===
                "LIMIT_UNEXPECTED_FILE"
            ) {
                return res.status(400).json({
                    message:
                        "Unexpected file upload.",
                });
            }

            return res.status(400).json({
                message:
                    "File upload failed.",
            });
        }

        /*
         * Invalid MIME type
         */

        if (
            error?.code ===
            "INVALID_FILE_TYPE"
        ) {
            return res.status(400).json({
                message:
                    "This file type is not allowed.",
            });
        }

        /*
         * Invalid filename
         */

        if (
            error?.code ===
            "INVALID_FILE_NAME"
        ) {
            return res.status(400).json({
                message:
                    error.message ||
                    "Invalid file name.",
            });
        }

        /*
         * Invalid path
         */

        if (
            error?.code ===
            "INVALID_FILE_PATH"
        ) {
            return res.status(400).json({
                message:
                    "Invalid file path.",
            });
        }

        /*
         * Generic file-route error
         */

        console.error(
            "File route error:",
            error
        );

        return res.status(500).json({
            message:
                "File operation failed.",
        });
    }
);

/* EXPORT ROUTER */

module.exports = router;