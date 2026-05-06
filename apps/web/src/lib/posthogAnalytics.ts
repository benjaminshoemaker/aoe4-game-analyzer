import type { PostMatchViewModel } from '@aoe4/analyzer-core';
import type { AnalyticsProperties } from './analyticsPrivacy';
import {
  browserAnalyticsPrivacyScript,
  sanitizeAnalyticsProperties,
} from './analyticsPrivacy';
import { SAMPLE_MATCH } from './sampleMatch';

const DEFAULT_POSTHOG_TOKEN = 'phc_mPGKCTfkNwcknrDkvcVBXknJ74uehvu2hhnTzmjg8A8o';
const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';
const POSTHOG_DEFAULTS_DATE = '2026-01-30';

// PostHog event names intentionally use spaces (e.g. "match viewed",
// "band filter changed") to match the in-product wording the
// dashboards already filter on. Renaming any of these is a
// breaking change for analytics consumers — coordinate before
// rotating to dot/underscore conventions.

interface AnalyticsMatchParams {
  profileSlug: string;
  gameId: number;
  sig?: string;
}

interface PostHogAnalyticsScriptOptions {
  surface: string;
  baseProperties?: Record<string, unknown>;
  initialEventName?: string;
  extraClientScript?: string;
  token?: string;
  host?: string;
}

export interface PostHogConfig {
  token: string;
  host: string;
}

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeSingleQuotedJsString(value: string): string {
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`;
}

function normalizeHost(value: string | undefined): string {
  return (value || DEFAULT_POSTHOG_HOST).trim().replace(/\/+$/, '');
}

export function postHogConfigFromEnv(env: Record<string, string | undefined> = process.env): PostHogConfig {
  return {
    token: (env.NEXT_PUBLIC_POSTHOG_TOKEN || DEFAULT_POSTHOG_TOKEN).trim(),
    host: normalizeHost(env.NEXT_PUBLIC_POSTHOG_HOST),
  };
}

export function postHogDeploymentEnvironmentFromEnv(
  env: Record<string, string | undefined> = process.env
): string {
  const environment = env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT ||
    env.NEXT_PUBLIC_VERCEL_ENV ||
    env.VERCEL_ENV ||
    env.NODE_ENV ||
    'production';
  return environment.trim().toLowerCase() || 'production';
}

export { stripSensitiveQueryParams } from './analyticsPrivacy';

export function buildMatchAnalyticsProperties(
  params: AnalyticsMatchParams,
  model: PostMatchViewModel
): AnalyticsProperties {
  return sanitizeAnalyticsProperties({
    surface: 'match',
    profile_slug: params.profileSlug,
    game_id: params.gameId,
    has_sig: Boolean(params.sig),
    map: model.header.map,
    mode: model.header.mode,
    duration_label: model.header.durationLabel,
    outcome: model.header.outcome,
    you_civilization: model.header.youCivilization,
    opponent_civilization: model.header.opponentCivilization,
  });
}

export function buildPostHogAnalyticsScript(options: PostHogAnalyticsScriptOptions): string {
  const config = postHogConfigFromEnv();
  const token = (options.token ?? config.token).trim();
  const host = normalizeHost(options.host ?? config.host);
  const deploymentEnvironment = postHogDeploymentEnvironmentFromEnv();
  if (!token || !host) return '';

  const baseProperties = sanitizeAnalyticsProperties({
    surface: options.surface,
    ...options.baseProperties,
  });
  const initialEventCapture = options.initialEventName
    ? `\n  capture(${escapeSingleQuotedJsString(options.initialEventName)}, {});`
    : '';
  const engagementSummaryEventName = `${options.surface} engagement summary`;

  return `
(function () {
  var token = ${escapeJsonForScript(token)};
  var host = ${escapeJsonForScript(host)};
  var deploymentEnvironment = ${escapeJsonForScript(deploymentEnvironment)};
  var baseProperties = ${escapeJsonForScript(baseProperties)};
  var engagementSummaryEventName = ${escapeJsonForScript(engagementSummaryEventName)};
  var pageLoadedAt = Date.now();
  var interactionCount = 0;
  var timestampSelectionCount = 0;
  var filterChangeCount = 0;
  var outboundClickCount = 0;
  var maxScrollDepthPct = 0;
  var engagementSummarySent = false;

  function isLocalhost() {
    return /^(localhost|127\\.0\\.0\\.1|::1)$/.test(window.location.hostname);
  }
  ${browserAnalyticsPrivacyScript()}

  function sanitizedCurrentUrl() {
    return stripSensitiveQueryParams(window.location.href);
  }

  function hostnameFromUrl(value) {
    if (!value) return '';
    try {
      return new URL(value).hostname;
    } catch (_error) {
      return '';
    }
  }

  function currentUrl() {
    try {
      return new URL(window.location.href);
    } catch (_error) {
      return null;
    }
  }

  function attributionProperties() {
    var url = currentUrl();
    var params = url ? url.searchParams : null;
    var utmSource = params ? params.get('utm_source') || '' : '';
    var utmMedium = params ? params.get('utm_medium') || '' : '';
    var utmCampaign = params ? params.get('utm_campaign') || '' : '';
    var utmContent = params ? params.get('utm_content') || '' : '';
    var utmTerm = params ? params.get('utm_term') || '' : '';
    return {
      app_pathname: window.location.pathname,
      referrer_host: hostnameFromUrl(document.referrer),
      has_utm: !!(utmSource || utmMedium || utmCampaign || utmContent || utmTerm),
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm
    };
  }

  function runtimeEnvironmentProperties() {
    var isLocal = isLocalhost();
    return Object.assign({
      deployment_environment: deploymentEnvironment,
      app_environment: isLocal ? 'local' : deploymentEnvironment,
      app_hostname: window.location.hostname,
      app_origin: window.location.origin,
      is_local_environment: isLocal
    }, attributionProperties());
  }

  function trackInteractionCounters(eventName) {
    if (!eventName || eventName === '$pageview' || eventName === 'match viewed' || eventName === engagementSummaryEventName) {
      return;
    }
    interactionCount += 1;
    if (eventName === 'timestamp selected') timestampSelectionCount += 1;
    if (eventName === 'band filter changed') filterChangeCount += 1;
    if (eventName.indexOf('outbound link clicked') !== -1) outboundClickCount += 1;
  }

  function updateMaxScrollDepth() {
    var doc = document.documentElement;
    var body = document.body;
    var scrollTop = window.pageYOffset || doc.scrollTop || (body && body.scrollTop) || 0;
    var viewportHeight = window.innerHeight || doc.clientHeight || 0;
    var scrollHeight = Math.max(
      doc.scrollHeight || 0,
      body ? body.scrollHeight || 0 : 0,
      doc.offsetHeight || 0,
      body ? body.offsetHeight || 0 : 0,
      doc.clientHeight || 0
    );
    var depth = scrollHeight <= viewportHeight
      ? 100
      : Math.round(Math.min(100, ((scrollTop + viewportHeight) / scrollHeight) * 100));
    if (depth > maxScrollDepthPct) maxScrollDepthPct = depth;
  }

  function sendEngagementSummary(reason) {
    if (engagementSummarySent) return;
    engagementSummarySent = true;
    updateMaxScrollDepth();
    var timeOnPageMs = Math.max(0, Date.now() - pageLoadedAt);
    capture(engagementSummaryEventName, {
      reason: reason || 'unknown',
      time_on_page_ms: timeOnPageMs,
      interaction_count: interactionCount,
      timestamp_selection_count: timestampSelectionCount,
      filter_change_count: filterChangeCount,
      outbound_click_count: outboundClickCount,
      max_scroll_depth_pct: maxScrollDepthPct,
      engaged: interactionCount > 0 || timeOnPageMs >= 10000 || maxScrollDepthPct >= 50
    }, {
      send_instantly: true,
      transport: 'sendBeacon'
    });
  }

  function capture(eventName, properties, options) {
    if (!eventName || !window.posthog || typeof window.posthog.capture !== 'function') return;
    trackInteractionCounters(eventName);
    window.posthog.capture(
      eventName,
      Object.assign({}, baseProperties, sanitizeProperties(properties || {}), runtimeEnvironmentProperties()),
      options || {}
    );
  }

  function sanitizeCaptureResult(captureResult) {
    if (!captureResult || !captureResult.properties) return captureResult;
    captureResult.properties = sanitizeProperties(captureResult.properties);
    return captureResult;
  }

  window.aoe4Analytics = {
    capture: capture,
    baseProperties: baseProperties
  };

  (function (documentRef, posthogStub) {
    if (posthogStub.__SV) return;
    window.posthog = posthogStub;
    posthogStub._i = [];
    posthogStub.init = function (apiKey, config, name) {
      function stubMethod(target, methodName) {
        var parts = methodName.split('.');
        if (parts.length === 2) {
          target = target[parts[0]] = target[parts[0]] || [];
          methodName = parts[1];
        }
        target[methodName] = function () {
          target.push([methodName].concat(Array.prototype.slice.call(arguments, 0)));
        };
      }

      var instance = posthogStub;
      if (name) {
        instance = posthogStub[name] = [];
      } else {
        name = 'posthog';
      }
      instance.people = instance.people || [];
      instance.toString = function (includeStub) {
        var label = name === 'posthog' ? 'posthog' : 'posthog.' + name;
        return includeStub ? label + ' (stub)' : label;
      };
      instance.people.toString = function () {
        return instance.toString(true) + '.people';
      };
      'capture identify reset register register_once unregister get_distinct_id get_session_id opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing people.set people.set_once'.split(' ').forEach(function (methodName) {
        stubMethod(instance, methodName);
      });
      posthogStub._i.push([apiKey, config, name]);

      var script = documentRef.createElement('script');
      script.type = 'text/javascript';
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.src = config.api_host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
      var firstScript = documentRef.getElementsByTagName('script')[0];
      firstScript.parentNode.insertBefore(script, firstScript);
    };
    posthogStub.__SV = 1;
  }(document, window.posthog || []));

  posthog.init(token, {
    api_host: host,
    defaults: ${escapeJsonForScript(POSTHOG_DEFAULTS_DATE)},
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    request_batching: false,
    before_send: sanitizeCaptureResult,
    sanitize_properties: sanitizeProperties
  });

  capture('$pageview', {
    path: window.location.pathname,
    '$current_url': sanitizedCurrentUrl()
  });
  ${initialEventCapture.trim()}

  updateMaxScrollDepth();
  if (window.addEventListener) {
    window.addEventListener('scroll', updateMaxScrollDepth, { passive: true });
    window.addEventListener('resize', updateMaxScrollDepth);
    window.addEventListener('pagehide', function () {
      sendEngagementSummary('pagehide');
    });
    window.addEventListener('beforeunload', function () {
      sendEngagementSummary('beforeunload');
    });
  }
  if (document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') sendEngagementSummary('visibility-hidden');
    });
  }
}());
${options.extraClientScript || ''}`.trim();
}

export function buildHomePostHogAnalyticsScript(): string {
  return buildPostHogAnalyticsScript({
    surface: 'home',
    extraClientScript: `
(function () {
  function extractMatchProperties(value) {
    var properties = { has_sig: false };
    try {
      var url = new URL(value.indexOf('://') === -1 ? 'https://' + value : value);
      properties.source_host = url.hostname;
      properties.has_sig = url.searchParams.has('sig');
      var match = url.pathname.match(/\\/players\\/([^/]+)\\/games\\/(\\d+)/);
      if (match) {
        properties.profile_slug = decodeURIComponent(match[1]);
        properties.game_id = Number(match[2]);
      }
    } catch (_error) {}
    return properties;
  }

  function linkText(link) {
    return (link.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80);
  }

  function outboundLinkProperties(link) {
    try {
      var url = new URL(link.href, window.location.origin);
      var isFeedback = /reddit\\.com$/i.test(url.hostname) || linkText(link).toLowerCase().indexOf('feedback') !== -1;
      return {
        link_kind: isFeedback ? 'feedback' : (url.hostname.indexOf('aoe4world.com') !== -1 ? 'aoe4world' : 'external'),
        destination_host: url.hostname,
        destination_path: url.pathname,
        link_text: linkText(link)
      };
    } catch (_error) {
      return {
        link_kind: 'external',
        destination_host: '',
        destination_path: '',
        link_text: linkText(link)
      };
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    try {
      var currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has('error')) {
        window.aoe4Analytics.capture('home match url rejected', {
          error_present: true
        });
      }
    } catch (_error) {}

    var form = document.querySelector('[data-analytics-match-form]');
    if (form) {
      form.addEventListener('submit', function () {
        var input = form.querySelector('input[name="url"]');
        var value = input && input.value ? input.value : '';
        window.aoe4Analytics.capture('home match url submitted', extractMatchProperties(value));
      });
    }

    document.querySelectorAll('[data-analytics-sample-report]').forEach(function (link) {
      link.addEventListener('click', function () {
        window.aoe4Analytics.capture('home sample report opened', ${escapeJsonForScript({
          profile_slug: SAMPLE_MATCH.profileSlug,
          game_id: SAMPLE_MATCH.gameId,
          has_sig: true,
        })});
      });
    });

    document.querySelectorAll('a[href]').forEach(function (link) {
      try {
        var url = new URL(link.href, window.location.origin);
        if (url.origin === window.location.origin) return;
      } catch (_error) {
        return;
      }
      link.addEventListener('click', function () {
        window.aoe4Analytics.capture('home outbound link clicked', outboundLinkProperties(link));
      });
    });
  });
}());`,
  });
}
