export type FunnelEventName = "persona_cta" | "region_form_opened" | "region_form_submitted";

function sessionId() {
  const key = "wattbund_funnel_session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

export function trackFunnelEvent(name: FunnelEventName, input: { sourceRoute?: string; persona?: string } = {}) {
  void fetch("/api/funnel-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, ...input, anonymousSessionId: sessionId() }),
    keepalive: true
  }).catch(() => undefined);
}
