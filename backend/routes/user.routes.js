import {register,login,logout,update} from '../controllers/user.controller.js'
import express from 'express'
import { authorization } from '../middleware/authMiddleware.js';

const router=express.Router();

router.post('/register',register);
router.post('/login',login);
router.get('/logout',logout);
router.put('/profile/update',authorization,update);

export default router;