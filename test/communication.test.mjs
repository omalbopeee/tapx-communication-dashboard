import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CARD, clone, validateCard, makeVCard, applyEditingPolicy } from '../public/model.js';
import { renderHub } from '../public/render.js';
import { createCardStore } from '../public/storage.js';

test('the communication demo defaults validate and preserve sample-only actions', () => {
  assert.deepEqual(validateCard(DEFAULT_CARD), []);
  const html = renderHub(DEFAULT_CARD);
  assert.ok(html.includes('data-demo="Email"'));
  assert.ok(html.includes('data-demo="Location"'));
  assert.ok(html.includes('data-demo="Google Review"'));
  assert.ok(html.includes('DEMO ONLY'));
  assert.ok(!html.includes('{{'));
});
test('edited real links, visibility and escaped business/bank text appear in the rendered page', () => {
  const card = clone(DEFAULT_CARD); card.displayName = '<img src=x onerror=alert(1)>';
  card.bank.accounts[0].accountName = '<script>alert(1)</script>';
  card.email = { enabled: true, demo: false, address: 'hello@example.com' };
  card.location = { enabled: true, demo: false, url: 'https://maps.google.com/?q=Colombo', text: 'Location' };
  card.review.demo = false; card.review.url = 'https://example.com/review';
  card.whatsapp.enabled = false;
  const html = renderHub(card);
  assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('href="mailto:hello@example.com"'));
  assert.ok(html.includes('href="https://example.com/review"'));
  assert.ok(!html.includes('class="action action-whatsapp"'));
});
test('bank validation, unsafe URLs, image uploads and overnight intervals are checked', () => {
  const card = clone(DEFAULT_CARD);
  card.bank.accounts[0].accountNumber = 'not digits'; card.website.url = 'javascript:alert(1)'; card.logo = 'data:image/svg+xml;base64,AAAA';
  const paths = validateCard(card).map(issue => issue.path);
  for (const key of ['bank.accounts.0.accountNumber', 'website.url', 'logo']) assert.ok(paths.includes(key));
  const hours = clone(DEFAULT_CARD); hours.hours.enabled = true; hours.hours.weekly[1] = [['22:00', '06:00']];
  assert.deepEqual(validateCard(hours), []);
  hours.hours.weekly[1] = [['08:00', '08:00']]; assert.ok(validateCard(hours).length);
});
test('business vCard reflects configured phone, fax, email, Unicode and website', () => {
  const card = clone(DEFAULT_CARD); card.name = 'ආයුබෝවන්; Lanka'; card.mobile.number = '+94771234567'; card.email.demo = false;
  card.fax = { enabled: true, number: '+94112223344', display: '011 222 3344' };
  const vcf = makeVCard(card);
  assert.ok(vcf.includes('FN:ආයුබෝවන්\\; Lanka')); assert.ok(vcf.includes('TEL;TYPE=CELL,VOICE:+94771234567')); assert.ok(vcf.includes('TEL;TYPE=FAX:+94112223344'));
  assert.ok(vcf.includes('EMAIL:demo@example.com')); assert.ok(vcf.includes('URL:https://tapx.lk/'));
  assert.ok(vcf.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75));
});
test('browser records persist edited business details and protect against stale saves', async () => {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = createCardStore({ storage, pathname: '/communication/' });
  const card = clone(DEFAULT_CARD); card.displayName = 'New business'; card.bank.accounts[0].accountNumber = '0012345678';
  await store.save(card, 0);
  assert.deepEqual(createCardStore({ storage, pathname: '/communication/' }).read().card, card);
  await assert.rejects(store.save(DEFAULT_CARD, 0), /another tab/);
  assert.deepEqual(createCardStore({ storage, pathname: '/other/' }).read().card, DEFAULT_CARD);
});
test('TapX branding and managed public URL are restored by the editing policy', () => {
  const card = clone(DEFAULT_CARD); card.tapx.website = 'https://example.com'; card.seo.siteUrl = 'https://example.com';
  assert.ok(validateCard(card).length);
  assert.deepEqual(validateCard(applyEditingPolicy(card)), []);
});

test('older saved cards and drafts restore fixed labels while retaining configured actions', async () => {
  const card = clone(DEFAULT_CARD);
  card.wording.whatsappTitle = 'Custom button'; card.wording.bankDescription = 'Custom popup';
  card.wording.socialTitle = 'Custom heading'; card.bank.buttonText = 'Custom bank';
  card.social.links[0].label = 'Custom profile';
  card.social.links[0].url = 'https://example.com/facebook'; card.social.links[0].demo = false;
  card.location.demo = false; card.location.url = 'https://maps.google.com/?q=Colombo';
  card.email.enabled = false; card.bank.accounts[0].accountNumber = '0012345678';
  const values = new Map([['tapx-communication-saved-v1:/communication/', JSON.stringify({ card, revision: 4, savedAt: '2026-11-14T00:00:00Z' })]]);
  const store = createCardStore({ pathname: '/communication/', locks: null, storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } });
  const restored = store.read();
  assert.deepEqual(restored.card.wording, DEFAULT_CARD.wording);
  assert.equal(restored.card.bank.buttonText, 'Bank Details');
  assert.equal(restored.card.social.links[0].label, 'Facebook');
  assert.equal(restored.card.social.links[0].url, 'https://example.com/facebook');
  assert.equal(restored.card.social.links[0].demo, false);
  assert.equal(restored.card.location.url, 'https://maps.google.com/?q=Colombo');
  assert.equal(restored.card.email.enabled, false);
  assert.equal(restored.card.bank.accounts[0].accountNumber, '0012345678');
  await store.save(restored.card, restored.revision);
  assert.deepEqual(store.read().card, restored.card);
  assert.deepEqual(applyEditingPolicy(card), restored.card);
  await assert.rejects(store.save(card, 5), /highlighted details/);
});

test('the social popup button can be hidden with website enabled, then restored with its links', () => {
  const card = clone(DEFAULT_CARD); card.social.enabled = false;
  let html = renderHub(card);
  assert.ok(!html.includes('id="open-social-dialog"'));
  assert.ok(!html.includes('id="social-dialog"'));
  card.social.enabled = true;
  html = renderHub(card);
  assert.ok(html.includes('id="open-social-dialog"'));
  assert.ok(html.includes('id="social-dialog"'));
  assert.ok(html.includes('href="https://tapx.lk/"'));
  card.website.enabled = false;
  for (const link of card.social.links) link.enabled = false;
  assert.ok(!renderHub(card).includes('id="open-social-dialog"'));
});
