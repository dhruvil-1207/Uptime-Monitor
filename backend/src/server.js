import app from './app.js';
import { startMonitorWorker } from './services/monitorWorker.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startMonitorWorker();
});