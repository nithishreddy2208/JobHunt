import { User } from '../models/user.model.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { getEmbedding } from '../utils/embedding.js'

import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { scanFile } from "../utils/clamav.js";
import { extractPdfText } from "../utils/pdfText.js";
import { subscriptionService } from "../services/subscription.service.js";
import { enqueueResumeProcessing } from "../queues/resume.queue.js";

export const register = async (req, res) => {
    try {
        const { name, email, password, phoneNumber, role, profile } = req.body;
        if (!name || !email || !password || !role || !phoneNumber) {
            return res.status(400).json({
                message: "All required fields must be provided",
                success: false
            });
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({
                message: "User already exists",
                success: false
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            name,
            email,
            password: hashedPassword,
            phoneNumber,
            role,
            profile
        });
        return res.status(201).json({
            message: "User created successfully",
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

export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            return res.status(400).json({
                message: "All required fields must be provided",
                success: false
            });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password",
                success: false
            });
        }
        if (role !== user.role) {
            return res.status(401).json({
                message: "Invalid role for this account",
                success: false
            });
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password",
                success: false
            });
        }
        const jwtData = { userId: user._id, userRole: user.role };
        const token = jwt.sign(jwtData, process.env.SECRET_KEY, { expiresIn: '1d' });
        const isProd = process.env.NODE_ENV === 'production';
        return res.status(200).cookie("token", token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        }).json({
            message: "Login Successfull",
            user,
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

export const logout = async (req, res) => {
    try {
        const isProd = process.env.NODE_ENV === 'production';
        return res.status(200).cookie("token", "", {
            maxAge: 0,
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax'
        }).json({
            message: "Logout successfull",
            success: true
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}

export const update = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        const { name, email, phoneNumber, bio, skills, company } = req.body || {};

        if (email) {
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(409).json({
                    message: "Email already in use",
                    success: false
                });
            }
        }

        let newResumeUrl = null;
        // `req.uploadKind` is set by dedicated routes (e.g. the photo endpoint)
        // and takes precedence over the body field so the upload type can't be
        // spoofed and doesn't depend on multipart field ordering.
        const uploadKind = String(req.uploadKind || req.body?.kind || 'resume').toLowerCase();

        if (req.file) {
            const file = req.file;

            const { isInfected, viruses } = await scanFile(file);

            if (isInfected) {
                return res.status(400).json({
                    message: "File is infected",
                    viruses,
                    success: false
                });
            }

            const fileUri = getDataUri(file);

            if (uploadKind === 'photo') {
                // Profile photo upload (recruiter / job-seeker avatar).
                const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                    folder: "jobhunt/avatars",
                    resource_type: "image"
                });
                user.profile.photo = cloudResponse.secure_url;
            } else {
                // Default: resume upload (existing behavior).
                const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                    folder: "jobhunt/resumes",
                    resource_type: "auto"
                });

                user.profile.resume = cloudResponse.secure_url;
                user.profile.resumeName = file.originalname;
                newResumeUrl = cloudResponse.secure_url;

                try {
                    const extracted = await extractPdfText(file.buffer);
                    if (extracted) {
                        user.profile.resumeText = extracted;
                    }
                } catch (err) {
                    console.error('Resume text extraction failed:', err?.message || err);
                }
            }
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;

        if (bio) user.profile.bio = bio;
        if (skills) user.profile.skills = skills;
        if (company) user.profile.company = company;

        await user.save();

        const needsEmbedding = newResumeUrl ||
            (user.profile.resumeText && user.profile.resumeText.trim() && (!user.profile.embedding || user.profile.embedding.length === 0));

        if (needsEmbedding) {
            try {
                await enqueueResumeProcessing({ userId, resumeUrl: newResumeUrl });
            } catch (err) {
                console.error('Resume processing enqueue failed:', err?.message || err);
            }
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};

export const upgradeToPro = async (req, res) => {
    try {
        const { paymentRef } = req.body || {};

        const user = await subscriptionService.upgradeToPro(req.userId, { paymentRef });

        return res.status(200).json({
            message: "Upgraded to PRO successfully",
            success: true,
            user
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Upgrade failed",
            success: false
        });
    }
};

// Cloudinary's free tier blocks inline PDF delivery from /image/upload/.
// Inserting the `fl_attachment` flag tells Cloudinary to serve the file with
// Content-Disposition: attachment, which bypasses the restriction. We then
// re-stamp the response as inline application/pdf so the browser renders it
// in a viewer tab instead of forcing a download.
const withFlAttachment = (url) => {
    if (typeof url !== 'string' || !url) return url;
    if (url.includes('/fl_attachment/')) return url;
    return url.replace('/image/upload/', '/image/upload/fl_attachment/');
};

export const streamResumePdf = async (resumeUrl, resumeName, res) => {
    if (!resumeUrl) {
        return res.status(404).json({ success: false, message: 'No resume on file' });
    }

    const fetchUrl = withFlAttachment(resumeUrl);
    const upstream = await fetch(fetchUrl);
    if (!upstream.ok) {
        return res.status(502).json({
            success: false,
            message: `Failed to fetch resume (${upstream.status})`
        });
    }

    // Buffer the bytes so we can sanity-check we actually got a PDF before
    // forwarding to the client. Resumes are small (a few hundred KB), so
    // buffering is fine and avoids partial-stream errors.
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const looksLikePdf = buffer.length >= 5 && buffer.slice(0, 5).toString('ascii') === '%PDF-';

    if (!looksLikePdf) {
        return res.status(502).json({
            success: false,
            message: 'Upstream did not return a PDF. The file may be restricted by Cloudinary.'
        });
    }

    const filename = (resumeName || 'resume.pdf').replace(/[\r\n"]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(buffer);
};

export const getResume = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('profile.resume profile.resumeName')
            .lean();
        await streamResumePdf(user?.profile?.resume, user?.profile?.resumeName, res);
    } catch (error) {
        console.log('getResume error:', error?.message || error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to load resume' });
        }
    }
};

export const getSubscriptionStatus = async (req, res) => {
    try {
        const status = await subscriptionService.getStatus(req.userId);
        if (!status) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, ...status });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};