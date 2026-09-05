const mongoose = require("mongoose");

const uploadedFileSchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true,
        },

        originalName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },

        fileName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },

        filePath: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },

        mimeType: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        size: {
            type: Number,
            required: true,
            min: 1,
            max: 10 * 1024 * 1024,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "UploadedFile",
    uploadedFileSchema
);