export function buildWebVitalsScript(endpoint = '/api/web-vitals'): string {
  return `
(function(){
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
  var endpoint = ${JSON.stringify(endpoint)};
  var lcp = 0;
  var cls = 0;
  var inp = 0;
  var sent = {};
  function send(name, value) {
    if (!Number.isFinite(value) || sent[name] === value) return;
    sent[name] = value;
    var body = JSON.stringify({
      name: name,
      value: Math.round(value * 100) / 100,
      path: window.location.pathname,
      ts: Date.now()
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
      return;
    }
    fetch(endpoint, {
      method: 'POST',
      body: body,
      keepalive: true,
      headers: { 'content-type': 'application/json' }
    }).catch(function(){});
  }
  try {
    new PerformanceObserver(function(list){
      var entries = list.getEntries();
      if (entries.length > 0) lcp = entries[entries.length - 1].startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver(function(list){
      list.getEntries().forEach(function(entry){
        if (!entry.hadRecentInput) cls += entry.value || 0;
      });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver(function(list){
      list.getEntries().forEach(function(entry){
        if (entry.interactionId) inp = Math.max(inp, entry.duration || 0);
      });
    }).observe({ type: 'event', durationThreshold: 40, buffered: true });
  } catch (_) {}
  function flush() {
    send('LCP', lcp);
    send('CLS', cls);
    send('INP', inp);
  }
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}());`.trim();
}
