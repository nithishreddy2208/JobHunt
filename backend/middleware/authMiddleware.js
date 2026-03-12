import jwt from 'jsonwebtoken';

export const authorization = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized, no one logged in",
                success: false
            })
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (!decoded) {
            return res.status(401).json({ message: "Invalid Token" })
        }
        req.userId = decoded.userId;
        req.userRole = decoded.userRole; 
        next();
    }
    catch (error) {
        return res.status(401).json({
            message: "Invalid Token",
            success: false
        })
    }
}

export const recruiterOnly = (req,res,next)=>{
    if(req.userRole !== "recruiter"){
        return res.status(403).json({
            message:"Access denied, only recruiters are allowed to do this...",
            success:false
        });
    }
    next();
}