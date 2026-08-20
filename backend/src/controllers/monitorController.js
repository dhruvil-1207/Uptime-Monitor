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

export { createMonitor };