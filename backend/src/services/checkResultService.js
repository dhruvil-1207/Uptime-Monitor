import pool from '../config/db.js';

const saveCheckResult = async (monitorId, { isUp, statusCode, responseTimeMs, errorMessage }) => {
  const result = await pool.query(
    `INSERT INTO check_results (
      monitor_id,
      status_code,
      response_time_ms,
      is_up,
      error_message
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, monitor_id, status_code, response_time_ms, is_up, error_message, checked_at`,
    [
      monitorId,
      statusCode,
      responseTimeMs,
      isUp,
      errorMessage
    ]
  );

  return result.rows[0];
};

export { saveCheckResult };