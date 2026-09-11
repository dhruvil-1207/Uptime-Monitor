import pool from '../config/db.js';

const getMonitorIncidents = async (req, res) => {
  const monitorId = req.params.id;
  const userId = req.user.userId;

  const page = req.query.page ? Number.parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 20;

  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({
      message: 'Invalid pagination parameters'
    });
  }

  const offset = (page - 1) * limit;

  try {
    const monitorResult = await pool.query(
      `SELECT id
       FROM monitors
       WHERE id = $1
         AND user_id = $2`,
      [monitorId, userId]
    );

    if (monitorResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Monitor not found'
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        monitor_id,
        started_at,
        resolved_at,
        reason
       FROM incidents
       WHERE monitor_id = $1
       ORDER BY started_at DESC
       LIMIT $2
       OFFSET $3`,
      [monitorId, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
      FROM incidents
      WHERE monitor_id = $1`,
      [monitorId]
    );

    const total = Number(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      incidents: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (err) {
    console.error('Failed to get monitor incidents:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export { getMonitorIncidents };
