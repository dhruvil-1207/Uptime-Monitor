import pool from '../config/db.js';

const claimDueMonitors = async () => {

  const client = await pool.connect();
  let result;
  try{  
    await client.query('BEGIN');
    const result = await client.query(`
    SELECT
      id,
      url,
      interval_seconds,
      timeout_seconds,
      expected_status_code,
      current_status
    FROM monitors
    WHERE is_active = TRUE
      AND next_check_at <= NOW()
    ORDER BY next_check_at
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  `);

    for (const monitor of result.rows) {
      await client.query(
        `UPDATE monitors
        SET next_check_at = NOW() + ($1 * INTERVAL '1 second')
        WHERE id = $2`,
        [monitor.interval_seconds, monitor.id]
      );
    }

    await client.query('COMMIT');
    return result.rows;
  }
  catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }

    console.error('Failed to claim monitors:', err);
    throw err;
  }
  finally {
    client.release();
  }


};

export { claimDueMonitors };