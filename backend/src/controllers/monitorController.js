import pool from '../config/db.js';

const createMonitor = async (req, res) => {
  const userId = req.user.userId;

  let { name, url, intervalSeconds, timeoutSeconds, expectedStatusCode } = req.body;

  // Name validation
  if (typeof name !== 'string') {
    return res.status(400).json({
      message: 'Monitor name is required'
    });
  }

  const monitorName = name.trim();

  if (!monitorName) {
    return res.status(400).json({
      message: 'Monitor name cannot be empty'
    });
  }

  if (monitorName.length > 100) {
    return res.status(400).json({
      message: 'Monitor name must not exceed 100 characters'
    });
  }

  // URL validation
  if (typeof url !== 'string') {
    return res.status(400).json({
      message: 'URL is required'
    });
  }

  const monitorUrl = url.trim();

  if (!monitorUrl) {
    return res.status(400).json({
      message: 'URL cannot be empty'
    });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(monitorUrl);
  } catch {
    return res.status(400).json({
      message: 'Please provide a valid URL'
    });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({
      message: 'Only HTTP and HTTPS URLs are supported'
    });
  }

  if (parsedUrl.username || parsedUrl.password) {
    return res.status(400).json({
      message: 'URLs must not contain embedded credentials'
    });
  }

  // Interval validation
  const allowedIntervals = [60, 300, 600, 1800, 3600];

  if (intervalSeconds === undefined) {
    intervalSeconds = 300;
  }

  if (
    !Number.isInteger(intervalSeconds) ||
    !allowedIntervals.includes(intervalSeconds)
  ) {
    return res.status(400).json({
      message: 'Invalid monitoring interval'
    });
  }

  // Timeout validation
  if (timeoutSeconds === undefined) {
    timeoutSeconds = 5;
  }

  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 30) {
    return res.status(400).json({
      message: 'Timeout must be an integer between 1 and 30 seconds'
    });
  }

  // Expected status validation
  if (expectedStatusCode === undefined) {
    expectedStatusCode = 200;
  }

  if (
    !Number.isInteger(expectedStatusCode) ||
    expectedStatusCode < 100 ||
    expectedStatusCode > 599
  ) {
    return res.status(400).json({
      message: 'Expected status code must be an integer between 100 and 599'
    });
  }

  try {
    const nextCheckAt = new Date(Date.now() + intervalSeconds * 1000);

    const result = await pool.query(
      `INSERT INTO monitors (
        user_id,
        name,
        url,
        interval_seconds,
        timeout_seconds,
        expected_status_code,
        is_active,
        current_status,
        next_check_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, 'UNKNOWN', $7)
      RETURNING
        id,
        name,
        url,
        interval_seconds,
        timeout_seconds,
        expected_status_code,
        is_active,
        current_status,
        last_checked_at,
        next_check_at,
        created_at,
        updated_at`,
      [
        userId,
        monitorName,
        monitorUrl,
        intervalSeconds,
        timeoutSeconds,
        expectedStatusCode,
        nextCheckAt
      ]
    );

    return res.status(201).json({
      message: 'Monitor created successfully',
      monitor: result.rows[0]
    });
  } catch (err) {
    console.error('Monitor creation error:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

const getMonitors = async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT
        id,
        name,
        url,
        interval_seconds,
        timeout_seconds,
        expected_status_code,
        is_active,
        current_status,
        last_checked_at,
        next_check_at,
        created_at,
        updated_at
      FROM monitors
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      monitors: result.rows
    });
  } catch (err) {
    console.error('Failed to get monitors:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

const getMonitor = async (req, res) => {
  const monitorId = req.params.id;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT
        id,
        name,
        url,
        interval_seconds,
        timeout_seconds,
        expected_status_code,
        is_active,
        current_status,
        last_checked_at,
        next_check_at,
        created_at,
        updated_at
      FROM monitors
      WHERE id = $1
        AND user_id = $2`,
      [monitorId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Monitor not found'
      });
    }

    return res.status(200).json({
      monitor: result.rows[0]
    });
  } catch (err) {
    console.error('Failed to get monitor:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

const updateMonitor = async (req, res) => {
  const updates = req.body;
  const allowedFields = [
    'name',
    'url',
    'interval_seconds',
    'timeout_seconds',
    'expected_status_code'
  ];

  const fields = Object.keys(updates);

  if (fields.length === 0) {
    return res.status(400).json({
      message: 'At least one field is required'
    });
  }

  const invalidFields = fields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    return res.status(400).json({
      message: `Invalid fields: ${invalidFields.join(', ')}`
    });
  }

  if ('name' in updates) {
    if (
      typeof updates.name !== 'string' ||
      updates.name.trim().length === 0
    ) {
      return res.status(400).json({
        message: 'Name must be a non-empty string'
      });
    }
    updates.name = updates.name.trim();
  }

  if ('url' in updates) {
    const url = updates.url?.trim();

    if (typeof url !== 'string') {
      return res.status(400).json({
        message: 'URL must be a string'
      });
    }

    try {
      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({
          message: 'URL must use HTTP or HTTPS'
        });
      }

      if (parsedUrl.username || parsedUrl.password) {
        return res.status(400).json({
          message: 'URL must not contain username or password'
        });
      }

      updates.url = url;

    } catch {
      return res.status(400).json({
        message: 'Invalid URL'
      });
    }
  }

  if ('interval_seconds' in updates) {
    const allowedIntervals = [60, 300, 600, 1800, 3600];

    if (!allowedIntervals.includes(updates.interval_seconds)) {
      return res.status(400).json({
        message: 'Invalid interval'
      });
    }
  }

  if ('timeout_seconds' in updates) {
    if (
      !Number.isInteger(updates.timeout_seconds) ||
      updates.timeout_seconds < 1 ||
      updates.timeout_seconds > 30
    ) {
      return res.status(400).json({
        message: 'Timeout must be between 1 and 30 seconds'
      });
    }
  }

  if ('expected_status_code' in updates) {
    if (
      !Number.isInteger(updates.expected_status_code) ||
      updates.expected_status_code < 100 ||
      updates.expected_status_code > 599
    ) {
      return res.status(400).json({
        message: 'Expected status code must be an integer between 100 and 599'
      });
    }
  }

  const monitorId = req.params.id;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT
        id,
        name,
        url,
        interval_seconds,
        timeout_seconds,
        expected_status_code
      FROM monitors
      WHERE id = $1
        AND user_id = $2`,
      [monitorId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Monitor not found'
      });
    }

    const monitor = result.rows[0];
    const finalInterval = updates.interval_seconds ?? monitor.interval_seconds;
    const finalTimeout = updates.timeout_seconds ?? monitor.timeout_seconds;

    if (finalTimeout >= finalInterval) {
      return res.status(400).json({
        message: 'Timeout must be less than interval'
      });
    }

    const setClauses = [];
    const values = [];

    for (const field of fields) {
      setClauses.push(`${field} = $${values.length + 1}`);
      values.push(updates[field]);
    }
    values.push(monitorId);
    values.push(userId);
    const updateResult = await pool.query(
      `UPDATE monitors
      SET ${setClauses.join(', ')},
          updated_at = NOW()
      WHERE id = $${values.length - 1}
        AND user_id = $${values.length}
      RETURNING
        id,
        name,
        url,
        interval_seconds,
        timeout_seconds,
        expected_status_code,
        is_active,
        current_status,
        last_checked_at,
        next_check_at,
        created_at,
        updated_at`,
      values
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Monitor not found'
      });
    }

    return res.status(200).json({
      monitor: updateResult.rows[0]
    });

  }
  catch (err) {
    console.error('Failed to update monitor:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

const updateMonitorStatus = async (req, res) => {
  const { is_active } = req.body;
  const monitorId = req.params.id;
  const userId = req.user.userId;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      message: 'is_active must be a boolean'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE monitors
       SET
         is_active = $1,
         next_check_at = CASE
           WHEN $1 = TRUE THEN NOW()
           ELSE NULL
         END,
         updated_at = NOW()
       WHERE id = $2
         AND user_id = $3
       RETURNING
         id,
         name,
         url,
         interval_seconds,
         timeout_seconds,
         expected_status_code,
         is_active,
         current_status,
         last_checked_at,
         next_check_at,
         created_at,
         updated_at`,
      [is_active, monitorId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Monitor not found'
      });
    }

    return res.status(200).json({
      message: is_active
        ? 'Monitor resumed successfully'
        : 'Monitor paused successfully',
      monitor: result.rows[0]
    });

  } catch (err) {
    console.error('Failed to update monitor status:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

const deleteMonitor = async (req, res) => {
  const monitorId = req.params.id;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `DELETE FROM monitors
       WHERE id = $1
         AND user_id = $2`,
      [monitorId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Monitor not found'
      });
    }

    return res.status(204).send();

  } catch (err) {
    console.error('Failed to delete monitor:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

const getMonitorChecks = async (req, res) => {
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
    // First verify that this monitor belongs to the user
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
        status_code,
        response_time_ms,
        is_up,
        error_message,
        checked_at
       FROM check_results
       WHERE monitor_id = $1
       ORDER BY checked_at DESC
        LIMIT $2
        OFFSET $3`,
      [monitorId, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
      FROM check_results
      WHERE monitor_id = $1`,
      [monitorId]
    );

    const total = Number(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      checks: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (err) {
    console.error('Failed to get monitor checks:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

const getMonitorIncidents = async (req, res) => {
  const monitorId = req.params.id;
  const userId = req.user.userId;

  const page = req.query.page
    ? Number.parseInt(req.query.page, 10)
    : 1;

  const limit = req.query.limit
    ? Number.parseInt(req.query.limit, 10)
    : 20;

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

const getMonitorHistory = async (req, res) => {
  const userId = req.user.userId;
  const monitorId = req.params.id;
  const timeRange = req.query.timeRange || '24h';

  try {
    // 1. Verify monitor belongs to user
    const monitorCheck = await pool.query(
      `SELECT id FROM monitors WHERE id = $1 AND user_id = $2`,
      [monitorId, userId]
    );

    if (monitorCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Monitor not found' });
    }

    // 2. Determine time filter
    let timeInterval;
    let truncInterval = 'minute'; // for chart aggregation
    
    switch (timeRange) {
      case '24h':
        timeInterval = '24 hours';
        truncInterval = 'minute';
        break;
      case '7d':
        timeInterval = '7 days';
        truncInterval = 'hour';
        break;
      case '30d':
        timeInterval = '30 days';
        truncInterval = 'hour';
        break;
      case 'all':
        timeInterval = '100 years'; // effectively all time
        truncInterval = 'day';
        break;
      default:
        timeInterval = '24 hours';
        truncInterval = 'minute';
    }

    // 3. Get Summary Stats over the ENTIRE period
    const summaryResult = await pool.query(
      `SELECT 
        COUNT(*) as total_checks,
        COUNT(*) FILTER (WHERE is_up = true) as successful_checks,
        COUNT(*) FILTER (WHERE is_up = false) as failed_checks,
        ROUND(AVG(response_time_ms)) as avg_response_time,
        MIN(response_time_ms) as min_response_time,
        MAX(response_time_ms) as max_response_time
      FROM check_results
      WHERE monitor_id = $1 AND checked_at >= NOW() - $2::interval`,
      [monitorId, timeInterval]
    );
    
    const summary = summaryResult.rows[0];
    const totalChecks = parseInt(summary.total_checks) || 0;
    const successfulChecks = parseInt(summary.successful_checks) || 0;
    
    // Calculate uptime percentage
    const uptimePercentage = totalChecks > 0 
      ? Number(((successfulChecks / totalChecks) * 100).toFixed(2))
      : 0;

    // 4. Get Chart Data (downsampled if timeframe is large, using date_trunc)
    // We average the response time and get boolean AND of is_up for the time bucket
    const chartDataResult = await pool.query(
      `SELECT 
        date_trunc($3, checked_at) as timestamp,
        ROUND(AVG(response_time_ms)) as response_time_ms,
        MAX(status_code) as status_code,
        bool_and(is_up) as is_up
      FROM check_results
      WHERE monitor_id = $1 AND checked_at >= NOW() - $2::interval
      GROUP BY timestamp
      ORDER BY timestamp ASC`,
      [monitorId, timeInterval, truncInterval]
    );

    // 5. Get recent check history (last 50 for the table view)
    const recentChecksResult = await pool.query(
      `SELECT id, status_code, response_time_ms, is_up, error_message, checked_at
      FROM check_results
      WHERE monitor_id = $1 AND checked_at >= NOW() - $2::interval
      ORDER BY checked_at DESC
      LIMIT 50`,
      [monitorId, timeInterval]
    );

    // 6. Get Incidents in the timeframe
    const incidentsResult = await pool.query(
      `SELECT id, started_at, resolved_at, reason
      FROM incidents
      WHERE monitor_id = $1 AND started_at >= NOW() - $2::interval
      ORDER BY started_at DESC`,
      [monitorId, timeInterval]
    );

    return res.status(200).json({
      summary: {
        uptimePercentage,
        totalChecks,
        successfulChecks,
        failedChecks: parseInt(summary.failed_checks) || 0,
        avgResponseTime: parseInt(summary.avg_response_time) || null,
        minResponseTime: parseInt(summary.min_response_time) || null,
        maxResponseTime: parseInt(summary.max_response_time) || null,
      },
      chartData: chartDataResult.rows,
      recentChecks: recentChecksResult.rows,
      incidents: incidentsResult.rows
    });

  } catch (err) {
    console.error('Failed to get monitor history:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export { createMonitor, getMonitors, getMonitor, updateMonitor, updateMonitorStatus, deleteMonitor, getMonitorChecks, getMonitorIncidents, getMonitorHistory };