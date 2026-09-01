import express from 'express';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import monitorRoutes from './routes/monitorRoutes.js'
import helmet from 'helmet';
import cors from 'cors';

const app = express();
app.use(helmet());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);


export default app;