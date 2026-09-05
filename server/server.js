const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const taskRoutes = require("./routes/taskRoutes");
const fileRoutes = require("./routes/fileRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// MIDDLEWARE
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

// Limit JSON request body size
app.use(
    express.json({
        limit: "1mb",
    })
);

app.use(cookieParser());

// HEALTH CHECK
app.get("/", (req, res) => {
    res.status(200).send(
        "Task Management API is running!"
    );
});


// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/admin", adminRoutes);


// 404 - ROUTE NOT FOUND
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found",
    });
});


// GLOBAL ERROR HANDLER
app.use((error, req, res, next) => {
    console.error(
        "Unhandled server error:",
        error
    );

    res.status(500).json({
        message: "Internal server error",
    });
});


// MONGODB CONNECTION
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log(
            "MongoDB connected successfully"
        );

        const server = app.listen(
            PORT,
            "127.0.0.1",
            () => {
                console.log(
                    `Server is running on port ${PORT}`
                );
            }
        );

        // GRACEFUL SHUTDOWN
        const shutdown = async (signal) => {
            console.log(
                `${signal} received. Shutting down server...`
            );

            server.close(async () => {
                try {
                    await mongoose.connection.close();

                    console.log(
                        "MongoDB connection closed."
                    );

                    process.exit(0);
                } catch (error) {
                    console.error(
                        "Error during shutdown:",
                        error.message
                    );

                    process.exit(1);
                }
            });
        };

        process.on(
            "SIGINT",
            () => shutdown("SIGINT")
        );

        process.on(
            "SIGTERM",
            () => shutdown("SIGTERM")
        );
    })
    .catch((error) => {
        console.error(
            "MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    });