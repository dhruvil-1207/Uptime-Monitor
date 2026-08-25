const checkMonitor = async (monitor) => {
  const checkedAt = new Date();
  const startTime = performance.now();

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, monitor.timeout_seconds * 1000);

  try {
    const response = await fetch(monitor.url, {
      method: 'GET',
      signal: controller.signal
    });

    const isUp = response.status === monitor.expected_status_code;

    const responseTimeMs = Math.round(
      performance.now() - startTime
    );

    return {
      checkedAt,
      isUp,
      statusCode: response.status,
      responseTimeMs,
      errorMessage: null
    };
  } catch (err) {
    const responseTimeMs = Math.round(
      performance.now() - startTime
    );

    if (err.name === 'AbortError') {
      return {
        checkedAt,
        isUp: false,
        statusCode: null,
        responseTimeMs,
        errorMessage: 'Request timeout'
      };
    }

    return {
      checkedAt,
      isUp: false,
      statusCode: null,
      responseTimeMs,
      errorMessage: err.message || 'Request failed'
    };
  } finally {
    clearTimeout(timeout);
  }
};

export { checkMonitor };