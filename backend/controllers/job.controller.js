import { Job } from '../models/job.model.js';
import { Company } from '../models/company.model.js';
import { ReadModels } from '../db/index.js';
import { jobSearchService } from '../services/jobSearch.service.js';
import { redisService } from '../services/redis.service.js';
import { getEmbedding } from '../utils/embedding.js';
import { enqueueJobEmbedding } from '../queues/job.queue.js';

export const postJob = async (req, res) => {
    try {
        const { title, description, location, salary, experienceLevel, requirements, jobType, positions, companyId } = req.body;
        const created_by = req.userId;
        if (
            !title?.trim() ||
            !description?.trim() ||
            !location?.trim() ||
            salary == null ||
            !experienceLevel ||
            !requirements ||
            !jobType ||
            !positions ||
            !companyId ||
            !created_by
        ) {
            return res.status(400).json({
                message: "All required fields must be provided",
                success: false
            });
        }

        const company = await Company.findById(companyId);

        if (!company) {
            return res.status(404).json({
                message: "Company not found",
                success: false
            });
        }

        if (company.created_by.toString() !== created_by) {
            return res.status(403).json({
                message: "Not authorized to post jobs for this company",
                success: false
            });
        }

        let parsedRequirements = [];
        if (Array.isArray(requirements)) {
            parsedRequirements = requirements;
        } else {
            parsedRequirements = requirements
                .split(",")
                .map(r => r.trim())
                .filter(r => r.length > 0);
        }

        const job = await Job.create({
            title,
            description,
            location,
            salary: Number(salary),
            experienceLevel,
            requirements: parsedRequirements,
            jobType,
            positions,
            company: companyId,
            created_by,
        })

        jobSearchService.insertTitle(job);

        try {
            await enqueueJobEmbedding(job._id);
        } catch (err) {
            console.error('Job embedding enqueue failed:', err?.message || err);
        }

        await redisService.delByPrefix('jobhunt:jobs:search:');
        await redisService.del(`jobhunt:jobs:detail:${job._id.toString()}`);
        await redisService.delByPrefix('jobhunt:ai:search:');
        await redisService.delByPrefix('jobhunt:ai:recommendation:');
        return res.status(200).json({
            message: "New Job Created Successfully",
            job,
            success: true
        })
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}

export const suggestJobTitles = async (req, res) => {
    try {
        const { prefix = "", limit } = req.query;

        if (!prefix.trim()) {
            return res.status(200).json({
                suggestions: [],
                success: true
            });
        }

        const items = jobSearchService.suggest(prefix, { limit });

        // The trie stores objects ({ title, jobId }); the frontend expects unique strings.
        const seen = new Set();
        const suggestions = [];
        for (const it of items) {
            const t = (it?.title || '').trim();
            if (!t) continue;
            const key = t.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            suggestions.push(t);
        }

        return res.status(200).json({
            suggestions,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};

export const getAllJobs = async (req, res) => {
    try {
        const { keyword, location, jobType, page = 1, limit = 10 } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const cacheTtlSeconds = Number(process.env.JOB_CACHE_TTL_SECONDS) || 300;
        const cacheKey = `jobhunt:jobs:search:keyword=${encodeURIComponent(keyword || "")}:location=${encodeURIComponent(location || "")}:jobType=${encodeURIComponent(jobType || "")}:page=${pageNum}:limit=${limitNum}`;

        const cached = await redisService.getJson(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }

        // Escape any regex metachars so user input like "c++" or "(senior)" doesn't blow up.
        const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let query = {};

        if (keyword) {
            const kw = escapeRegex(keyword.trim());
            // Word-boundary match against TITLE only. \b ensures the term marks the start of a word,
            // so "sof" matches "Software Engineer" / "Senior Software Eng" but doesn't leak random
            // jobs whose description happens to contain common substrings. Description-text matching
            // is delegated to semantic search (/ai/search), which is purpose-built for that.
            query.title = { $regex: `\\b${kw}`, $options: "i" };
        }

        if (location) {
            const loc = escapeRegex(location.trim());
            query.location = { $regex: loc, $options: "i" };
        }

        if (jobType) {
            query.jobType = jobType
        }

        // Read-heavy listing: route to the read-replica connection.
        // Falls back to primary automatically if the replica is unhealthy.
        const [jobs, totalJobs] = await Promise.all([
            ReadModels.Job.find(query)
                .populate("company")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ReadModels.Job.countDocuments(query)
        ]);

        const payload = {
            jobs,
            totalJobs,
            currentPage: pageNum,
            totalPages: totalJobs === 0 ? 1 : Math.ceil(totalJobs / limitNum),
            success: true
        };

        await redisService.setJson(cacheKey, payload, cacheTtlSeconds);

        return res.status(200).json(payload);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

export const getAdminJobs = async (req, res) => {
    try {
        const adminId = req.userId;
        // Recruiter dashboard analytics read -> replica.
        const jobs = await ReadModels.Job.find({ created_by: adminId })
            .populate("company")
            .sort({ createdAt: -1 })
            .lean();
        if (jobs.length === 0) {
            return res.status(404).json({
                message: "Jobs not found",
                success: false
            });
        }
        return res.status(200).json({
            jobs,
            success: true
        })
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}

export const getJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.userId;
        const userRole = req.userRole;

        const cacheTtlSeconds = Number(process.env.JOB_CACHE_TTL_SECONDS) || 300;
        const cacheKey = `jobhunt:jobs:detail:${jobId}`;

        const cached = await redisService.getJson(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }
        
        const job = await Job.findById(jobId).populate("company");

        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            });
        }

        if (
            userRole === "recruiter" &&
            job.created_by.toString() === userId
        ) {
            await job.populate({
                path: "applications",
                options: { sort: { createdAt: -1 } }
            });
        }

        const payload = {
            job,
            success: true
        };

        await redisService.setJson(cacheKey, payload, cacheTtlSeconds);

        return res.status(200).json(payload);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};