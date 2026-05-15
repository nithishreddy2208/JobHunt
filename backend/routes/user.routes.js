import {register,login,logout,update,upgradeToPro,getSubscriptionStatus,getResume} from '../controllers/user.controller.js'
import express from 'express'
import { authentication } from '../middleware/authMiddleware.js';
import { singleUpload } from '../middleware/multer.js';

const router=express.Router();

router.post('/register',register);
router.post('/login',login);
router.get('/logout',logout);
router.put('/profile/update',authentication,singleUpload,update);
router.post('/upgrade',authentication,upgradeToPro);
router.get('/subscription',authentication,getSubscriptionStatus);
router.get('/resume',authentication,getResume);

export default router;