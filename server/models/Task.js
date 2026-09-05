const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 200,
        },

        // Ownership
        // This value must always come from the authenticated user.
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 5000,
        },

        status: {
            type: String,
            enum: ["todo", "in-progress", "completed"],
            default: "todo",
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },

        dueDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// DATABASE INDEXES
// Most task queries start with the authenticated user.
taskSchema.index({
    user: 1,
    createdAt: -1,
});

// Useful for status filtering.
taskSchema.index({
    user: 1,
    status: 1,
});

// Useful for priority filtering.
taskSchema.index({
    user: 1,
    priority: 1,
});

// Useful for overdue/due-date queries.
taskSchema.index({
    user: 1,
    dueDate: 1,
});

// MODEL
module.exports = mongoose.model("Task", taskSchema);