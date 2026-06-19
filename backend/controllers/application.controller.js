import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { ReadModels } from "../db/index.js";
import { streamResumePdf } from "./user.controller.js";
import { scoreScreening } from "../services/screening.service.js";

// Whitelist + coerce the screening payload from the client so we never persist
// arbitrary fields. All fields are optional; missing ones fall back to defaults.
const sanitizeScreening = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const str = (v) => (v === undefined || v === null ? '' : String(v).slice(0, 2000));
    const arr = (v) =>
        Array.isArray(v)
            ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 40)
            : str(v).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 40);
    const bool = (v) => (v === true || v === 'yes' || v === 'Yes' || v === 'true' ? true : v === false || v === 'no' || v === 'No' || v === 'false' ? false : null);

    const candidateType = raw.candidateType === 'fresher' || raw.candidateType === 'experienced'
        ? raw.candidateType
        : null;

    const answers = Array.isArray(raw.answers)
        ? raw.answers
              .filter((a) => a && (a.question || a.answer))
              .map((a) => ({ question: str(a.question), answer: str(a.answer) }))
              .slice(0, 40)
        : [];

    return {
        candidateType,
        experienceYears: str(raw.experienceYears),
        relevantExperience: str(raw.relevantExperience),
        currentCompany: str(raw.currentCompany),
        currentCTC: str(raw.currentCTC),
        expectedCTC: str(raw.expectedCTC),
        noticePeriod: str(raw.noticePeriod),
        currentLocation: str(raw.currentLocation),
        teamSize: str(raw.teamSize),
        largestProject: str(raw.largestProject),
        workAuthorization: str(raw.workAuthorization),
        reasonForChange: str(raw.reasonForChange),
        secondarySkills: arr(raw.secondarySkills),
        graduationYear: str(raw.graduationYear),
        college: str(raw.college),
        degree: str(raw.degree),
        cgpa: str(raw.cgpa),
        internshipExperience: str(raw.internshipExperience),
        preferredStack: str(raw.preferredStack),
        skills: arr(raw.skills),
        preferredLocation: str(raw.preferredLocation),
        relocation: bool(raw.relocation),
        expectedSalary: str(raw.expectedSalary),
        experienceSummary: str(raw.experienceSummary),
        portfolio: str(raw.portfolio),
        github: str(raw.github),
        linkedin: str(raw.linkedin),
        whyHire: str(raw.whyHire),
        answers
    };
};

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

        // Resume is mandatory before applying. Authoritative server-side check so
        // applications can't be submitted even if the frontend gate is bypassed.
        const applicant = await User.findById(jobSeekerId).select('profile.resume').lean();
        if (!applicant?.profile?.resume) {
            return res.status(400).json({
                message: "Please upload your resume before applying for jobs.",
                code: "RESUME_REQUIRED",
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

        // Pre-screening answers (from the AI Application Assistant). Optional —
        // legacy/direct applies still work. Scoring is fully graceful: if AI is
        // down we persist a deterministic heuristic score and never block apply.
        let screening = sanitizeScreening(req.body?.screening);
        if (screening && screening.candidateType) {
            const { aiMatchScore, aiMatchSummary } = await scoreScreening(job, screening);
            screening.aiMatchScore = aiMatchScore;
            screening.aiMatchSummary = aiMatchSummary;
            screening.completedAt = new Date();
        }

        const newApplication = await Application.create({
            job: jobId,
            applicant: jobSeekerId,
            ...(screening ? { screening } : {})
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

        // Job-seeker's applied-jobs list -> replica read.
        const applications = await ReadModels.Application.find({ applicant: userId })
            .populate({
                path: 'job',
                populate: { path: 'company' }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ReadModels.Application.countDocuments({ applicant: userId });

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

        // Recruiter applicant listing -> replica read.
        const applicants = await ReadModels.Application.find({ job: jobId })
            .populate({
                path: 'applicant',
                select: '-password'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ReadModels.Application.countDocuments({ job: jobId });

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

        const allowedStatuses = ['pending', 'shortlisted', 'accepted', 'declined'];

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

// Recruiter-scoped resume proxy. Verifies the requesting recruiter owns the
// parent job, then streams the applicant's resume PDF through the shared
// Cloudinary-bypass helper.
export const getApplicantResume = async (req, res) => {
    try {
        const applicationId = req.params.id;
        if (!applicationId) {
            return res.status(400).json({ success: false, message: 'Application id is required' });
        }

        const application = await Application
            .findById(applicationId)
            .populate({ path: 'job', select: 'created_by' })
            .populate({ path: 'applicant', select: 'profile.resume profile.resumeName' });

        if (!application || !application.job) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        if (String(application.job.created_by) !== String(req.userId)) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this resume' });
        }

        const profile = application.applicant?.profile || {};
        await streamResumePdf(profile.resume, profile.resumeName, res);
    } catch (error) {
        console.log('getApplicantResume error:', error?.message || error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to load resume' });
        }
    }
};