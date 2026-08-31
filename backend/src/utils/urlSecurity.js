import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import http from 'node:http';
import https from 'node:https';

const isPrivateIp = (ip) => {
  const address = ipaddr.parse(ip);
  const range = address.range();

  return [
    'private',
    'loopback',
    'linkLocal',
    'uniqueLocal',
    'unspecified',
    'carrierGradeNat',
    'reserved'
  ].includes(range);
};

const isSafeUrl = async (url) => {
  try {
    const parsedUrl = new URL(url);

    const addresses = await dns.lookup(parsedUrl.hostname, {
      all: true
    });

    for (const address of addresses) {
      if (isPrivateIp(address.address)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
};

const safeRequest = (url, options = {}, redirectCount = 0) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (options.method && options.method !== 'GET') {
        return reject(new Error('Only GET requests are supported'));
      }
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'));
      }

      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return reject(new Error('Unsupported protocol'));
      }

      const addresses = await dns.lookup(parsedUrl.hostname, {
        all: true
      });

      const unsafeAddress = addresses.find(
        address => isPrivateIp(address.address)
      );

      if (unsafeAddress) {
        return reject(new Error('Unsafe destination'));
      }

      const safeAddress = addresses[0];

      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const request = client.request(
        {
          hostname: safeAddress.address,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: `${parsedUrl.pathname}${parsedUrl.search}`,
          method: options.method || 'GET',
          timeout: options.timeout,
          headers: {
            Host: parsedUrl.host,
            ...options.headers
          },
          ...(isHttps && {
            servername: parsedUrl.hostname
          })
        },
        response => {
          const isRedirect =
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location;

          if (!isRedirect) {
            return resolve(response);
          }

          const redirectUrl = new URL(
            response.headers.location,
            parsedUrl
          );

          response.resume();

          safeRequest(
            redirectUrl.toString(),
            options,
            redirectCount + 1
          )
            .then(resolve)
            .catch(reject);
        }
      );

      request.on('timeout', () => {
        request.destroy(new Error('Request timeout'));
      });

      request.on('error', reject);

      request.end();

    } catch (err) {
      reject(err);
    }
  });
};

export { isSafeUrl, safeRequest };