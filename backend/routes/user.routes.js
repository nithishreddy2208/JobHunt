import {register,login,logout,update,upgradeToPro,getSubscriptionStatus,getResume} from '../controllers/user.controller.js'
import express from 'express'
import { authentication } from '../middleware/authMiddleware.js';
import { singleUpload, photoUpload } from '../middleware/multer.js';

const router=express.Router();

const forcePhotoKind = (req, _res, next) => {
    req.uploadKind = 'photo';
    next();
};

router.post('/register',register);
router.post('/login',login);
router.get('/logout',logout);
router.put('/profile/update',authentication,singleUpload,update);
// Dedicated avatar endpoint: image-only validation, forced photo kind.
router.put('/profile/photo',authentication,photoUpload,forcePhotoKind,update);
router.post('/upgrade',authentication,upgradeToPro);
router.get('/subscription',authentication,getSubscriptionStatus);
router.get('/resume',authentication,getResume);

export default router;