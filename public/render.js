import template from './hub-template.js';
import { renderFeatureGrid, renderSocialDialog } from './features.js';
import { escapeHTML as e, photoURL, safeURL, DEFAULT_CARD } from './model.js';

const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const host = value => { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return ''; } };
const supporting = (value, c) => value.replaceAll('{name}', c.displayName || c.name).replaceAll('{phone}', c.whatsapp.display || c.whatsapp.number).replaceAll('{website}', host(c.website.url));

export function renderHub(c) {
  const w = c.wording;
  const accounts = c.bank.enabled ? c.bank.accounts : [];
  const data = {
    displayName: c.displayName, category: c.category, logo: photoURL(c.logo) || DEFAULT_CARD.logo, logoAlt: c.logoAlt,
    contactFilename: c.contactFilename, tapxWebsite: safeURL(c.tapx.website), copyright: c.tapx.copyright,
    whatsappUrl: 'https://wa.me/' + String(c.whatsapp.number).replace(/\D/g, '') + (c.whatsapp.message ? '?text=' + encodeURIComponent(c.whatsapp.message) : ''),
    noticeTitle: w.noticeTitle, noticeDescription: w.noticeDescription,
    whatsappTitle: w.whatsappTitle, whatsappHint: supporting(w.whatsappHint, c), saveContact: w.saveContact, saveHint: supporting(w.saveHint, c),
    reviewTitle: w.reviewTitle, reviewDescription: w.reviewDescription, bankTitle: w.bankTitle, bankDescription: w.bankDescription
  };
  const hours = { enabled: c.hours.enabled, timeZone: c.hours.timeZone, weekly: Object.fromEntries(Array.from({ length: 7 }, (_, day) => [day, c.hours.weekly[day].filter(pair => pair.length === 2 && pair.every(value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) && pair[0] !== pair[1])])) };
  const raw = {
    hoursJson: json(hours), bankJson: json({ businessName: c.name, accounts }), pageJson: json({ name: c.name, url: c.seo.siteUrl }),
    featureGridHtml: renderFeatureGrid(c), socialDialogHtml: renderSocialDialog(c),
    bankSafetyHtml: c.bank.demo ? `<p class="bank-safety-note">${e(w.bankNotice)}</p>` : '',
    bankAccountsHtml: accounts.map((account, index) => `<section class="bank-account-card" aria-labelledby="bank-account-${index + 1}"><div class="bank-account-head"><span>Account ${index + 1}</span><strong id="bank-account-${index + 1}">${e(account.bankName)}</strong></div><div class="bank-detail-line"><span>Account Name</span><strong>${e(account.accountName)}</strong></div><div class="bank-detail-line bank-number-line"><span>Account Number</span><strong>${e(account.accountNumber)}</strong></div><div class="bank-detail-line"><span>Branch</span><strong>${e(account.branch)}</strong></div>${account.branchCode ? `<div class="bank-detail-line"><span>Branch Code</span><strong>${e(account.branchCode)}</strong></div>` : ''}<button class="bank-copy-account" type="button" data-copy-account="${index}" aria-label="Copy ${e(account.bankName)} account number">Copy account number</button></section>`).join('')
  };
  let html = template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) => c[key]?.enabled ? content : '');
  html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => Object.hasOwn(raw, key) ? raw[key] : e(data[key] ?? ''));
  if (!c.design.showDemoNotice) html = html.replace(/<p class="demo-notice">[\s\S]*?<\/p>/, '');
  if (c.review.enabled && !c.review.demo) {
    html = html.replace(/<button class="review-card"[^>]*>([\s\S]*?)<\/button>/, safeURL(c.review.url) ? `<a class="review-card" href="${e(safeURL(c.review.url))}" target="_blank" rel="noopener noreferrer">$1</a>` : '');
  }
  return html;
}
