import app from './app.js';
import { startMonitorWorker, stopMonitorWorker } from './services/monitorWorker.js';
import pool from './config/db.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startMonitorWorker();
});

const shutdown = async () => {
  console.log('Shutting down server...');

  stopMonitorWorker();

  server.close(async () => {
    try {
      await pool.end();
      console.log('Server shut down successfully');
      process.exit(0);
    } catch (err) {
      console.error('Failed to close database pool:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);