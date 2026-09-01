import { createIncident, resolveIncident } from './incidentService.js';

const handleMonitorState = async (client, monitor, previousStatus, newStatus, checkResult) => {

  if (
    (previousStatus === 'UNKNOWN' || previousStatus === 'UP') &&
    newStatus === 'DOWN'
  ) {
    const reason = checkResult.errorMessage || `HTTP ${checkResult.statusCode}`;

    const incident = await createIncident(client, monitor.id, checkResult.checkedAt, reason);

    return {
      type: 'DOWN',
      incident
    };
  }

  else if (previousStatus === 'DOWN' && newStatus === 'UP') {
    const incident = await resolveIncident(client, monitor.id, checkResult.checkedAt);

    return {
      type: 'RECOVERY',
      incident
    };
  }

  return null;
};

export { handleMonitorState };