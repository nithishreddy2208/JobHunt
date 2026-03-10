import { User } from '../models/user.model.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

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
            res.status(409).json({
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
        return res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}
export const update = async (req, res) => {
    try {
        const userId = req.userId;
        const updateData = await User.findById(userId);
        const {name,email,phoneNumber,bio,skills,photo} = req.body;

        const existingUser = await User.findOne({ email });
 
        if (existingUser && existingUser._id.toString() !== userId) {
            return res.status(409).json({
                message: "Email already in use",
                success: false
            });
        }
        
        if(name) updateData.name = name;
        if(email) updateData.email = email;
        if(phoneNumber) updateData.phoneNumber = phoneNumber;
        if(bio) updateData["profile.bio"] = bio;
        if(skills) updateData["profile.skills"] = skills;
        if(photo) updateData["profile.photo"] = photo;
        
        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        );
        return res.status(200).json({
            message: "Profile updated successfully",
            success: true,
            user
        });
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}

