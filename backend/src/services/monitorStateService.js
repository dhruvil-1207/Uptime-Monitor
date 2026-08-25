import { createIncident, resolveIncident } from './incidentService.js';

const handleMonitorState = async (client, monitor, previousStatus, newStatus, checkResult) => {
  if ((previousStatus === 'UNKNOWN' || previousStatus === 'UP') && newStatus === 'DOWN') {
    const reason = checkResult.errorMessage || `HTTP ${checkResult.statusCode}`;

    await createIncident(client, monitor.id, checkResult.checkedAt, reason);
  }

  else if (previousStatus === 'DOWN' && newStatus === 'UP') {
    await resolveIncident(client, monitor.id, checkResult.checkedAt);
  }
};

export { handleMonitorState };