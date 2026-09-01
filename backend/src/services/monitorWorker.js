import pool from '../config/db.js';

import { claimDueMonitors } from './monitorScheduler.js';
import { checkMonitor } from './monitorChecker.js';
import { saveCheckResult } from './checkResultService.js';
import { updateMonitorStatus } from './monitorStatusService.js';
import { handleMonitorState } from './monitorStateService.js';
import { sendDownNotification, sendRecoveryNotification } from './notificationService.js';

const processDueMonitors = async () => {

  const monitors = await claimDueMonitors();
  const concurrency = 10;
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < monitors.length) {
      const index = nextIndex++;
      const monitor = monitors[index];

      console.log(`Checking monitor ${monitor.id} at ${new Date().toISOString()}`);

      const result = await checkMonitor(monitor);
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const newStatus = result.isUp ? 'UP' : 'DOWN';

        const notification = await handleMonitorState(
          client,
          monitor,
          monitor.current_status,
          newStatus,
          result
        );

        await updateMonitorStatus(
          client,
          monitor.id,
          newStatus,
          result.checkedAt
        );

        await saveCheckResult(
          client,
          monitor.id,
          result
        );

        await client.query('COMMIT');

        if (notification) {
          if (notification.type === 'DOWN') {
            await sendDownNotification(
              monitor.email,
              monitor,
              notification.incident
            );
          }

          else if (notification.type === 'RECOVERY') {
            await sendRecoveryNotification(
              monitor.email,
              monitor,
              notification.incident
            );
          }
        }
      } 
      catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }

        console.error(
          `Failed to process monitor ${monitor.id}:`,
          err
        );
      } 
      finally {
        client.release();
      }
    }
  };

  const workers = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const startMonitorWorker = async () => {
  while (true) {
    try {
      await processDueMonitors();
    } catch (err) {
      console.error('Monitor worker error:', err);
    }

    await sleep(5000);
  }
};

export { startMonitorWorker };