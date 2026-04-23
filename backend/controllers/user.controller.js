import { User } from '../models/user.model.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { scanFile } from "../utils/clamav.js";



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
        return res.status(200).cookie("token", token, { httpOnly: true, secure: true, maxAge: 24 * 60 * 60 * 1000 }).json({
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
        return res.status(200).cookie("token", "", { maxAge: 0, httpOnly: true, secure: true }).json({
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

        const { name, email, phoneNumber, bio, skills, company } = req.body;

        if (email) {
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(409).json({
                    message: "Email already in use",
                    success: false
                });
            }
        }

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

            const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                folder: "jobhunt/resumes",
                resource_type: "auto"
            });

            user.profile.resume = cloudResponse.secure_url;
            user.profile.resumeName = file.originalname;
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;

        if (bio) user.profile.bio = bio;
        if (skills) user.profile.skills = skills;
        if (company) user.profile.company = company;

        await user.save();

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