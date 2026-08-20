import express from 'express';
import authenticate from '../middleware/authenticate.js';
import { createMonitor } from '../controllers/monitorController.js';

const router = express.Router();

router.post('/', authenticate, createMonitor);

export default router;