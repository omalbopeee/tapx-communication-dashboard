import { PLATFORMS } from './model.js';
import { icon } from './icons.js';
const extraIcon = name => icon(name).replace(/^<svg[^>]*>|<\/svg>$/g, '');
// Shared by the build and its configuration checks; no client framework needed.
export const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[ch]));

export function publicHttps(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

const icons = {
  bank: '<path d="m3 8 9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18"/>',
  location: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  fax: '<path d="M7 8V3h10v5M6 17H3V9h18v8h-3M7 14h10v7H7zM17 11h1"/>',
  facebook: '<path d="M14 21v-8h3l1-4h-4V7c0-1 .5-2 2-2h2V2h-3a5 5 0 0 0-5 5v2H7v4h3v8"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none"/>',
  tiktok: '<path d="M14 3v12a4 4 0 1 1-4-4m4-8c.5 3 2.5 5 6 5"/>',
  website: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z"/>',
  social: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>',
};

export function getFeatures(config) {
  const features = [
    { key: "bank", enabled: config.bank?.enabled && config.bank.accounts?.length,
      title: config.bank?.buttonText, subtitle: "View & Copy", action: "bank" },
    { key: "location", enabled: config.location?.enabled, title: "Location",
      subtitle: "Preview Map", action: config.location?.demo ? "demo" : null, href: publicHttps(config.location?.url) },
    { key: "email", enabled: config.email?.enabled, title: "Email", subtitle: "Contact Us", action: config.email?.demo ? "demo" : null,
      href: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email?.address || "")
        ? "mailto:" + encodeURIComponent(config.email.address).replace(/%40/gi, "@")
        : null },
    { key: "fax", enabled: config.fax?.enabled && /^\+?[\d ()-]{7,}$/.test(config.fax.number || ""),
      title: "Fax", subtitle: config.fax?.display, static: true },
    ...(config.social?.enabled ? config.social.links || [] : []).map(link => ({
      key: link.platform, enabled: link.enabled && Object.hasOwn(PLATFORMS, link.platform),
      title: link.label, subtitle: link.demo ? "Preview Profile" : "Open Profile", action: link.demo ? "demo" : null, href: publicHttps(link.url),
    })),
    { key: "website", enabled: config.social?.enabled && config.website?.enabled, title: "Website",
      subtitle: "Visit Website", href: publicHttps(config.website?.url) },
  ];
  return features.filter(feature => feature.enabled && feature.title?.trim() && feature.subtitle?.trim()
    && (feature.action || feature.static || feature.href));
}

const isSocial = feature => feature.key === 'website' || Object.hasOwn(PLATFORMS, feature.key);

function renderCard(feature) {
    const content = `<svg class="icon feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[feature.key] || extraIcon(feature.key)}</svg><span class="feature-title">${escapeHtml(feature.title)}</span><span class="feature-subtitle">${escapeHtml(feature.subtitle)}</span>`;
    if (feature.action === "demo") return `<li><button class="feature-card" type="button" data-demo="${escapeHtml(feature.title)}" aria-haspopup="dialog" aria-controls="demo-dialog">${content}</button></li>`;
    if (feature.action === "bank") return `<li><button class="feature-card" id="open-bank-dialog" type="button" aria-haspopup="dialog" aria-controls="bank-dialog">${content}</button></li>`;
    if (feature.action === "social") return `<li><button class="feature-card" id="open-social-dialog" type="button" aria-haspopup="dialog" aria-controls="social-dialog">${content}</button></li>`;
    if (feature.static) return `<li><div class="feature-card feature-static">${content}</div></li>`;
    const external = feature.href.startsWith("https:") ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<li><a class="feature-card" href="${escapeHtml(feature.href)}"${external}>${content}</a></li>`;
}

export function renderFeatureGrid(config) {
  const features = getFeatures(config);
  const main = features.filter(feature => !isSocial(feature));
  if (features.some(isSocial)) main.push({key:"social", title:"Social Media & Website", subtitle:"Explore our links", action:"social"});
  const cards = main.map(renderCard);
  return cards.length ? `<section class="details-section" aria-label="Business details"><ul class="feature-grid" role="list">${cards.join("\n")}</ul></section>` : "";
}

export function renderSocialDialog(config) {
  const links = getFeatures(config).filter(isSocial);
  if (!links.length) return "";
  return `<dialog class="bank-dialog social-dialog" id="social-dialog" aria-labelledby="social-dialog-title" aria-describedby="social-dialog-description"><div class="sheet-handle" aria-hidden="true"></div><div class="dialog-header"><span class="dialog-label">CONNECT WITH US</span><button class="icon-button" id="close-social-dialog" type="button" aria-label="Close social media and website"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><h2 id="social-dialog-title">Social Media &amp; Website</h2><p class="dialog-description" id="social-dialog-description">Explore our social profiles and website.</p><ul class="feature-grid" role="list">${links.map(renderCard).join("\n")}</ul></dialog>`;
}
