import { claimDueMonitors } from './monitorScheduler.js';
import { checkMonitor } from './monitorChecker.js';
import { saveCheckResult } from './checkResultService.js';

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

      await saveCheckResult(monitor.id, result);
    }
  };

  const workers = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

};
await processDueMonitors();
// export { processDueMonitors };