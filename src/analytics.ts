/**
 * Analytics bootstrap. PostHog is only initialised after the user grants
 * consent through the CookieBanner. This keeps us compliant with GDPR /
 * UK-DPA / KVKK for EU, UK and Turkish visitors.
 */

const POSTHOG_KEY = "phc_DUxeh6ycnhpwzWq5YJfAdy8Q8Wixe7Px9nAlpTTPm9K";
const POSTHOG_HOST = "https://eu.i.posthog.com";
const CONSENT_KEY = "verde-consent-v1"; // values: "accepted" | "rejected"

type Consent = "accepted" | "rejected";

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(v: Consent) {
  try { localStorage.setItem(CONSENT_KEY, v); } catch { /* swallow */ }
  if (v === "accepted") initAnalytics();
  if (v === "rejected") stopAnalytics();
}

let loaded = false;

/**
 * Strip email addresses and phone-number-like sequences from any string
 * property before it is sent to PostHog. Guards against accidental PII
 * leakage through URL query strings, referrers, form values, etc.
 */
const EMAIL_RX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RX = /\+?\d[\d\s().-]{7,}\d/g;

function sanitizeProperties(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "string") {
      out[k] = v.replace(EMAIL_RX, "[redacted-email]").replace(PHONE_RX, "[redacted-phone]");
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * GeoIP and IP properties PostHog adds server-side during ingestion.
 * Blacklisting them drops the values at the client before any event is sent.
 */
const PRIVACY_BLACKLIST = [
  "$ip",
  "$geoip_city_name",
  "$geoip_country_name",
  "$geoip_country_code",
  "$geoip_continent_name",
  "$geoip_continent_code",
  "$geoip_postal_code",
  "$geoip_latitude",
  "$geoip_longitude",
  "$geoip_time_zone",
  "$geoip_subdivision_1_code",
  "$geoip_subdivision_1_name",
  "$geoip_subdivision_2_code",
  "$geoip_subdivision_2_name",
];

export function initAnalytics() {
  if (loaded) return;
  if (readConsent() !== "accepted") return;
  loaded = true;

  // Load the PostHog snippet on demand, then init.
  const w = window as unknown as {
    posthog?: {
      init?: (key: string, cfg: Record<string, unknown>) => void;
      _i?: unknown[];
      __SV?: number;
    };
  };

  const snippet = document.createElement("script");
  snippet.textContent = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageviewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  `.trim();
  document.head.appendChild(snippet);

  w.posthog?.init?.(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_exceptions: true,
    autocapture: true,
    persistence: "localStorage+cookie",
    disable_session_recording: true,

    // Privacy hardening
    respect_dnt: true,
    secure_cookie: true,
    cross_subdomain_cookie: false,
    property_blacklist: PRIVACY_BLACKLIST,
    sanitize_properties: sanitizeProperties,
    mask_all_text: true,
    mask_all_element_attributes: true,
  });
}

export function stopAnalytics() {
  // If PostHog was already loaded earlier in the session we opt out here.
  const w = window as unknown as {
    posthog?: { opt_out_capturing?: () => void; reset?: () => void };
  };
  try {
    w.posthog?.opt_out_capturing?.();
    w.posthog?.reset?.();
  } catch { /* swallow */ }
}

// On initial page load, if the user has already accepted, boot analytics.
if (typeof window !== "undefined") {
  // Defer to next tick so the bundle isn't blocked.
  setTimeout(() => { if (readConsent() === "accepted") initAnalytics(); }, 0);
}
