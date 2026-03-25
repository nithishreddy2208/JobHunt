import { registerCompany,getCompany,getCompanyById,updateCompanyById } from "../controllers/company.controller.js";
import express from 'express'
import { authentication, recruiterOnly } from "../middleware/authMiddleware.js";


const router=express.Router();

router.post('/register',authentication,recruiterOnly,registerCompany)
router.get('/get',authentication,recruiterOnly,getCompany)
router.get('/get/:id',authentication,getCompanyById)
router.put('/update/:id',authentication,recruiterOnly,updateCompanyById)

export default router;