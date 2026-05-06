export type AnalyticsValue = string | number | boolean | null;
export type AnalyticsProperties = Record<string, AnalyticsValue>;

const SENSITIVE_QUERY_PATTERN = /(?:(?:sig|api_key|apikey)=|(?:sig|api_key|apikey)%3d|(?:sig|api_key|apikey)%253d)/i;
const SENSITIVE_PROPERTY_NAMES = new Set(['sig', 'signature', 'summary_sig', 'sig_token', 'api_key', 'apikey']);

function containsSensitiveQuery(value: string): boolean {
  return SENSITIVE_QUERY_PATTERN.test(value);
}

function isSensitiveQueryParamName(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized === 'sig' || normalized === 'api_key' || normalized === 'apikey';
}

function stripSensitiveQueryPatterns(value: string): string {
  return value
    .replace(/([?&])(?:sig|api_key|apikey)=[^&#]*&?/gi, (_match, prefix) => prefix === '?' ? '?' : '')
    .replace(/(%3F|%26)(?:sig|api_key|apikey)%3D[^%&#]*/gi, (_match, prefix) => prefix.toLowerCase() === '%3f' ? prefix : '')
    .replace(/(%253F|%2526)(?:sig|api_key|apikey)%253D[^%&#]*/gi, (_match, prefix) => prefix.toLowerCase() === '%253f' ? prefix : '');
}

export function stripSensitiveQueryParams(value: string): string {
  if (!containsSensitiveQuery(value)) return value;

  try {
    const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(value);
    const url = isAbsolute ? new URL(value) : new URL(value, 'https://aoe4.local');
    let changed = false;
    for (const key of Array.from(url.searchParams.keys())) {
      if (isSensitiveQueryParamName(key)) {
        url.searchParams.delete(key);
        changed = true;
        continue;
      }

      const values = url.searchParams.getAll(key);
      const sanitizedValues = values.map(paramValue => stripSensitiveQueryParams(paramValue));
      if (sanitizedValues.some((sanitizedValue, index) => sanitizedValue !== values[index])) {
        url.searchParams.delete(key);
        for (const sanitizedValue of sanitizedValues) {
          url.searchParams.append(key, sanitizedValue);
        }
        changed = true;
      }
    }
    if (!changed) return stripSensitiveQueryPatterns(value);
    return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch (_error) {
    return stripSensitiveQueryPatterns(value);
  }
}

export function shouldDropAnalyticsProperty(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_PROPERTY_NAMES.has(normalized) ||
    normalized.includes('signature_token') ||
    normalized.endsWith('_api_key') ||
    normalized.endsWith('_apikey');
}

export function sanitizeAnalyticsProperties(properties: Record<string, unknown>): AnalyticsProperties {
  const sanitized: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (shouldDropAnalyticsProperty(key)) continue;
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean' &&
      value !== null
    ) {
      continue;
    }
    sanitized[key] = typeof value === 'string' ? stripSensitiveQueryParams(value) : value;
  }
  return sanitized;
}

export function browserAnalyticsPrivacyScript(): string {
  return `
  function stripSensitiveQueryParams(value) {
    if (typeof value !== 'string' || !/(?:(?:sig|api_key|apikey)=|(?:sig|api_key|apikey)%3d|(?:sig|api_key|apikey)%253d)/i.test(value)) return value;
    function isSensitiveQueryParamName(key) {
      var normalized = String(key || '').toLowerCase();
      return normalized === 'sig' || normalized === 'api_key' || normalized === 'apikey';
    }
    function stripSensitiveQueryPatterns(input) {
      return input
        .replace(/([?&])(?:sig|api_key|apikey)=[^&#]*&?/ig, function (_match, prefix) {
          return prefix === '?' ? '?' : '';
        })
        .replace(/(%3F|%26)(?:sig|api_key|apikey)%3D[^%&#]*/ig, function (_match, prefix) {
          return prefix.toLowerCase() === '%3f' ? prefix : '';
        })
        .replace(/(%253F|%2526)(?:sig|api_key|apikey)%253D[^%&#]*/ig, function (_match, prefix) {
          return prefix.toLowerCase() === '%253f' ? prefix : '';
        });
    }
    try {
      var isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(value);
      var url = new URL(value, isAbsolute ? undefined : window.location.origin);
      var changed = false;
      Array.from(url.searchParams.keys()).forEach(function (key) {
        if (isSensitiveQueryParamName(key)) {
          url.searchParams.delete(key);
          changed = true;
          return;
        }
        var values = url.searchParams.getAll(key);
        var sanitizedValues = values.map(function (paramValue) {
          return stripSensitiveQueryParams(paramValue);
        });
        var valueChanged = sanitizedValues.some(function (sanitizedValue, index) {
          return sanitizedValue !== values[index];
        });
        if (!valueChanged) return;
        url.searchParams.delete(key);
        sanitizedValues.forEach(function (sanitizedValue) {
          url.searchParams.append(key, sanitizedValue);
        });
        changed = true;
      });
      if (!changed) return stripSensitiveQueryPatterns(value);
      return isAbsolute ? url.toString() : (url.pathname + url.search + url.hash);
    } catch (_error) {
      return stripSensitiveQueryPatterns(value);
    }
  }

  function shouldDropAnalyticsProperty(key) {
    var normalized = String(key || '').toLowerCase();
    return normalized === 'sig' ||
      normalized === 'signature' ||
      normalized === 'summary_sig' ||
      normalized === 'sig_token' ||
      normalized === 'api_key' ||
      normalized === 'apikey' ||
      normalized.indexOf('signature_token') !== -1 ||
      normalized.slice(-8) === '_api_key' ||
      normalized.slice(-7) === '_apikey';
  }

  function sanitizeProperties(properties) {
    var clean = {};
    Object.keys(properties || {}).forEach(function (key) {
      if (shouldDropAnalyticsProperty(key)) return;
      var value = properties[key];
      if (
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean' &&
        value !== null
      ) {
        return;
      }
      clean[key] = typeof value === 'string' ? stripSensitiveQueryParams(value) : value;
    });
    return clean;
  }`.trim();
}
