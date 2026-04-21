import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import { connectDb } from './config/db.js';
import userRoutes from "./routes/user.routes.js";
import companyRoutes from "./routes/company.routes.js";
import jobRoutes from "./routes/job.routes.js";
import applicationRoutes from "./routes/application.routes.js";

import { jobSearchService } from './services/jobSearch.service.js';
import { redisService } from './services/redis.service.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/user', userRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/application', applicationRoutes);

app.get("/", (req, res) => {
    res.send("JobHunt Backend Running");
});

const PORT = process.env.PORT || 8000;

const startServer = async () => {
    try {
        await connectDb();
        console.log("MongoDB connected");

        try {
            await redisService.connect();
        } catch (err) {
            console.error("Redis connection failed (continuing without cache):", err);
        }

        try {
            await jobSearchService.init({
                refreshMs: process.env.JOB_TRIE_REFRESH_MS
            });
            console.log("Trie initialized");
        } catch (err) {
            console.error("Trie initialization failed:", err);
        }

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server failed to start:", error);
        process.exit(1);
    }
};

startServer();

const shutdown = async () => {
    console.log("\nShutting down server...");

    try {
        await redisService.disconnect();
        console.log("Redis disconnected");
    } catch (err) {
        console.error("Error during Redis shutdown:", err);
    }

    process.exit(0);
};

process.on("SIGINT", shutdown);   
process.on("SIGTERM", shutdown); 