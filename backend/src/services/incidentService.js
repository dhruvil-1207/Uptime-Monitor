const createIncident = async (client, monitorId, startedAt, reason) => {
  const result = await client.query(
    `INSERT INTO incidents (
      monitor_id,
      started_at,
      reason
    )
    VALUES ($1, $2, $3)
    RETURNING id, monitor_id, started_at, resolved_at, reason`,
    [monitorId, startedAt, reason]
  );

  return result.rows[0];
};

const resolveIncident = async (client, monitorId, resolvedAt) => {
  const result = await client.query(
    `UPDATE incidents
     SET resolved_at = $1
     WHERE monitor_id = $2
       AND resolved_at IS NULL
     RETURNING id, monitor_id, started_at, resolved_at, reason`,
    [resolvedAt, monitorId]
  );

  return result.rows[0];
};

export { createIncident, resolveIncident };