import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { connectDb } from './config/db.js';
import userRoutes from "./routes/user.routes.js";
import companyRoutes from "./routes/company.routes.js";
import jobRoutes from "./routes/job.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import recruiterAiRoutes from "./routes/recruiterAi.routes.js";
import healthRoutes from "./routes/health.routes.js";

import { jobSearchService } from './services/jobSearch.service.js';
import { redisService } from './services/redis.service.js';
import { llmService } from './services/llm.service.js';
import { startAllWorkers, stopAllWorkers } from './workers/index.js';
import { closeBullConnection } from './config/queue.js';

import { initClamAV, isClamAvEnabled } from './utils/clamav.js';

dotenv.config();

const app = express();

const isProd = process.env.NODE_ENV === 'production';

// Environment-aware CORS allow-list.
// - Development: localhost dev servers.
// - Production: the deployed frontend origin(s).
// CORS_ORIGINS (comma-separated) always overrides the defaults when provided.
const defaultDevOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const defaultProdOrigins = ['https://jobhunt-frontend-three.vercel.app'];

const allowedOrigins = (process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : (isProd ? defaultProdOrigins : defaultDevOrigins))
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true); // allow non-browser clients (curl, Postman)
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/user', userRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/application', applicationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai/recruiter', recruiterAiRoutes);
app.use('/api/health', healthRoutes);

app.get("/", (req, res) => {
    res.send("JobHunt Backend Running");
});

const PORT = process.env.PORT || 8000;

let server;

const startServer = async () => {
    try {
        await connectDb();
        console.log("MongoDB connected");

        await redisService.connect();

        try {
            await initClamAV();
        } catch (err) {
            console.error("[clamav] initialization failed (continuing without scan):", err?.message || err);
        }

        await jobSearchService.init({
            refreshMs: process.env.JOB_TRIE_REFRESH_MS
        });
        console.log("Trie initialized");

        const workersInlineFlag = (process.env.WORKERS_INLINE || 'false').toLowerCase() === 'true';

        server = app.listen(PORT, () => {
            console.log('────────────────────────────────────────────');
            console.log(' JobHunt backend started');
            console.log(`  • NODE_ENV       : ${process.env.NODE_ENV || 'development'}`);
            console.log(`  • Port           : ${PORT}`);
            console.log(`  • ClamAV scan    : ${isClamAvEnabled() ? 'ENABLED' : 'DISABLED'}`);
            console.log(`  • Inline workers : ${workersInlineFlag ? 'ENABLED' : 'DISABLED'}`);
            console.log(`  • CORS origins   : ${allowedOrigins.join(', ') || '(none)'}`);
            console.log('────────────────────────────────────────────');
        });

        llmService.warmup().catch(() => {});

        // Inline workers are OFF by default in BOTH dev and production.
        //  - Dev: nodemon hot-reload leaks blocking BZPOPMIN connections to Upstash,
        //    multiplying billed commands.
        //  - Production (Render): the API web service must run independently; workers
        //    run as a separate process via `npm run worker`.
        // Set WORKERS_INLINE=true to opt into running workers inside the API process.
        if (workersInlineFlag) {
            try {
                startAllWorkers();
                console.log('[workers] inline workers ENABLED (running inside API process)');
            } catch (err) {
                console.error('[workers] failed to start inline:', err?.message || err);
            }
        } else {
            console.log('[workers] inline workers DISABLED (run `npm run worker` in a separate process)');
        }

    } catch (error) {
        console.error("Server failed to start:", error);
        process.exit(1);
    }
};

startServer();

const shutdown = async () => {
    console.log("\nShutting down server...");

    try {
        if (server) {
            server.close(() => {
                console.log("HTTP server closed");
            });
        }

        await stopAllWorkers();
        await closeBullConnection();
        await redisService.disconnect();

        console.log("Cleanup completed");
        process.exit(0);

    } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
    }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);