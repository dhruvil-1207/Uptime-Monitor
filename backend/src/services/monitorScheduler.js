import pool from '../config/db.js';

const claimDueMonitors = async () => {

  const client = await pool.connect();
  try{  
    await client.query('BEGIN');
    const result = await client.query(`
    SELECT
      m.id,
      m.name,
      m.url,
      m.interval_seconds,
      m.timeout_seconds,
      m.expected_status_code,
      m.current_status,
      u.email
    FROM monitors m
    JOIN users u ON u.id = m.user_id
    WHERE m.is_active = TRUE
      AND m.next_check_at <= NOW()
    ORDER BY m.next_check_at
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