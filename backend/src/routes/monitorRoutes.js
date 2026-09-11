import express from 'express';
import authenticate from '../middleware/authenticate.js';
import { createMonitor, getMonitors, getMonitor, updateMonitor, updateMonitorStatus, deleteMonitor } from '../controllers/monitorController.js';
import { getMonitorChecks } from '../controllers/checkController.js';
import { getMonitorIncidents } from '../controllers/incidentController.js';
import { getMonitorHistory } from '../controllers/analyticsController.js';

const router = express.Router();

router.use(authenticate);

// Collection
router.get('/', getMonitors);
router.post('/', createMonitor);

// Specific sub-routes — BEFORE /:id
router.get('/:id/history', getMonitorHistory);
router.get('/:id/checks', getMonitorChecks);
router.get('/:id/incidents', getMonitorIncidents);
router.patch('/:id/status', updateMonitorStatus);

// Single monitor
router.get('/:id', getMonitor);
router.patch('/:id', updateMonitor);
router.delete('/:id', deleteMonitor);

export default router;