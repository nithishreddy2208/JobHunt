import { registerCompany,getCompany,getCompanyById,updateCompanyById } from "../controllers/company.controller.js";
import express from 'express'
import { authorization, recruiterOnly } from "../middleware/authMiddleware.js";


const router=express.Router();

router.post('/register',authorization,recruiterOnly,registerCompany)
router.get('/get',authorization,recruiterOnly,getCompany)
router.get('/get/:id',authorization,getCompanyById)
router.put('/update/:id',authorization,recruiterOnly,updateCompanyById)

export default router;