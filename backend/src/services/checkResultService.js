const saveCheckResult = async (
  client,
  monitorId,
  { checkedAt, isUp, statusCode, responseTimeMs, errorMessage }
) => {
  const result = await client.query(
    `INSERT INTO check_results (
      monitor_id,
      status_code,
      response_time_ms,
      is_up,
      error_message,
      checked_at
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      monitor_id,
      status_code,
      response_time_ms,
      is_up,
      error_message,
      checked_at`,
    [
      monitorId,
      statusCode,
      responseTimeMs,
      isUp,
      errorMessage,
      checkedAt
    ]
  );

  return result.rows[0];
};

export { saveCheckResult };