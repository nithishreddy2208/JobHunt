import jwt from 'jsonwebtoken';

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false
            })
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (!decoded) {
            return res.status(401).json({ message: "Invalid Token" })
        }
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        return res.status(401).json({
            message: "Invalid Token",
            success: false
        })
    }
}