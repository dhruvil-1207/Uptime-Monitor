const updateMonitorStatus = async (client, monitorId, status, checkedAt) => {
  const result = await client.query(
    `UPDATE monitors
     SET current_status = $1,
         last_checked_at = $2
     WHERE id = $3
     RETURNING id, current_status, last_checked_at`,
    [status, checkedAt, monitorId]
  );

  return result.rows[0];
};

export { updateMonitorStatus };