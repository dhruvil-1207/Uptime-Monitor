import express from 'express';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import monitorRoutes from './routes/monitorRoutes.js'
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);


export default app;