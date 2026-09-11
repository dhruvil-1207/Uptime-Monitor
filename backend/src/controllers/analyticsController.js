import pool from '../config/db.js';

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

export { getMonitorHistory };
