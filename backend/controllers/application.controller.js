import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";

export const applyJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const jobSeekerId = req.userId;
        if (!jobId) {
            return res.status(400).json({
                message: "Job Id is required",
                success: false
            });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            });
        }

        const existingApplication = await Application.findOne({ job: jobId, applicant: jobSeekerId });
        if (existingApplication) {
            return res.status(400).json({
                message: "You already applied for this job",
                success: false
            });
        }

        const newApplication = await Application.create({
            job: jobId,
            applicant: jobSeekerId
        });

        job.applications.push(newApplication._id);
        await job.save();

        return res.status(201).json({
            message: "Job Applied successfully",
            newApplication,
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
export const getAppliedJobs = async (req, res) => {
    try {
        const userId = req.userId;

        let { page = 1, limit = 10 } = req.query;
        page = Number(page);
        limit = Number(limit);

        const skip = (page - 1) * limit;

        const applications = await Application.find({ applicant: userId })
            .populate({
                path: 'job',
                populate: { path: 'company' }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Application.countDocuments({ applicant: userId });

        return res.status(200).json({
            applications,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalApplications: total,
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
export const getApplicants = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.userId;

        let { page = 1, limit = 10 } = req.query;
        page = Number(page);
        limit = Number(limit);

        const skip = (page - 1) * limit;

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            });
        }

        if (job.created_by.toString() !== userId) {
            return res.status(403).json({
                message: "Access denied, only creator can access applicants",
                success: false
            });
        }

        const applicants = await Application.find({ job: jobId })
            .populate({
                path: 'applicant',
                select: '-password'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Application.countDocuments({ job: jobId });

        return res.status(200).json({
            applicants,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalApplicants: total,
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
export const updateStatus = async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { status } = req.body || {};

        if (!status) {
            return res.status(400).json({
                message: "Status is required",
                success: false
            });
        }

        const allowedStatuses = ['pending', 'accepted', 'declined'];

        if (!allowedStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                message: "Invalid status value",
                success: false
            });
        }

        const application = await Application.findById(applicationId);

        if (!application) {
            return res.status(404).json({
                message: "Application not found",
                success: false
            });
        }

        const job = await Job.findById(application.job);

        if (job.created_by.toString() !== req.userId) {
            return res.status(403).json({
                message: "Access denied, only creator can update",
                success: false
            });
        }

        if (application.status === status.toLowerCase()) {
            return res.status(400).json({
                message: "Status is already set",
                success: false
            });
        }

        application.status = status.toLowerCase();
        await application.save();

        return res.status(200).json({
            message: "Application status updated successfully",
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