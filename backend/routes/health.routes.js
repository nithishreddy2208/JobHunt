import express from 'express';
import { getDbHealth } from '../db/index.js';

const router = express.Router();

router.get('/db', (req, res) => {
    const health = getDbHealth();
    const ok = health.primary.ok; // replica may be down; primary must be up
    res.status(ok ? 200 : 503).json({ success: ok, ...health });
});

export default router;
