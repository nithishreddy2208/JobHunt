import { Job } from '../models/job.model.js';
import { Company } from '../models/company.model.js';
import { jobSearchService } from '../services/jobSearch.service.js';
import { redisService } from '../services/redis.service.js';

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

        await redisService.delByPrefix('jobhunt:jobs:search:');
        await redisService.del(`jobhunt:jobs:detail:${job._id.toString()}`);
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

        const suggestions = jobSearchService.suggest(prefix, { limit });

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

        let query = {};

        if (keyword) {
            query.$or = [
                { title: { $regex: `^${keyword}`, $options: "i" } },
                { description: { $regex: `^${keyword}`, $options: "i" } }
            ];
        }

        if (location) {
            query.location = { $regex: `^${location}`, $options: "i" };
        }

        if (jobType) {
            query.jobType = jobType
        }

        const jobs = await Job.find(query)
            .populate("company")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const totalJobs = await Job.countDocuments(query);

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
        const jobs = await Job.find({ created_by: adminId })
            .populate("company")
            .sort({ createdAt: -1 });
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