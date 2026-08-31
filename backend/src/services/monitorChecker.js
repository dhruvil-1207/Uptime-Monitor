import { safeRequest } from '../utils/urlSecurity.js';

const checkMonitor = async (monitor) => {
  const checkedAt = new Date();
  const startTime = performance.now();

  try {
    const response = await safeRequest(monitor.url, {
      method: 'GET',
      timeout: monitor.timeout_seconds * 1000
    });

    const isUp = response.statusCode === monitor.expected_status_code;

    const responseTimeMs = Math.round(
      performance.now() - startTime
    );

    response.resume();

    return {
      checkedAt,
      isUp,
      statusCode: response.statusCode,
      responseTimeMs,
      errorMessage: null
    };
  } catch (err) {
    const responseTimeMs = Math.round(
      performance.now() - startTime
    );

    return {
      checkedAt,
      isUp: false,
      statusCode: null,
      responseTimeMs,
      errorMessage: err.message || 'Request failed'
    };
  }
};

export { checkMonitor };