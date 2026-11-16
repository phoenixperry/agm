/**
 * Antigravity Machine: mailing list sign-up (Google Apps Script)
 * ------------------------------------------------------------------
 * A web app that receives the website's sign-up form and adds the
 * email address to the "Subscribers" sheet of the spreadsheet this
 * script is attached to. Set-up steps are in SETUP.md next to this file.
 *
 * What it checks before saving, in order:
 *   1. Honeypot: a hidden field people never see. Bots that fill it in
 *      get a normal-looking "ok" and nothing is saved.
 *   2. A rough rate limit, so a flood of requests can't fill the sheet.
 *   3. The email looks like an email, and the consent box was ticked.
 *   4. The Cloudflare Turnstile CAPTCHA token, checked with Cloudflare
 *      using the secret key. The browser can't fake this step: the
 *      secret only lives here, in Script Properties.
 *   5. Duplicates: an address already on the list isn't added twice
 *      (the person still sees "you've joined", so the form doesn't
 *      reveal who is on the list).
 *
 * Replies are JSON: { ok: true } or { ok: false, error: "<code>" }.
 * The website turns each error code into a plain sentence.
 *
 * Secrets: the Turnstile secret key goes in Project Settings > Script
 * Properties as TURNSTILE_SECRET. Never paste it into this file.
 */

/** The sheet tab that holds the list. Created by setUp() if missing. */
var SHEET_NAME = 'Subscribers';

/** Cloudflare's endpoint for checking a Turnstile token. */
var TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Most sign-ups accepted per minute, across everyone. */
var MAX_PER_MINUTE = 20;

/**
 * Run once by hand from the editor: makes the Subscribers tab with its
 * header row. Writes: a new sheet tab, if it doesn't exist yet.
 */
function setUp() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Joined (UTC)', 'Email', 'Source', 'Consent wording']);
    sheet.setFrozenRows(1);
  }
}

/**
 * Handles a GET (someone opening the web app URL in a browser).
 * Returns a short note, so the URL is easy to check is live.
 */
function doGet() {
  return ContentService.createTextOutput('Antigravity Machine mailing list endpoint. Sign up on the website.');
}

/**
 * Handles the sign-up form. Reads e.parameter (the form fields).
 * Writes: one row to the Subscribers sheet, if every check passes.
 * Returns: JSON { ok, error? }.
 */
function doPost(e) {
  var form = (e && e.parameter) || {};

  // 1. Honeypot: real people never see or fill the "website" field.
  if (form.website) return reply({ ok: true });

  // 2. Rate limit across all visitors.
  if (!recordIfUnderLimit()) return reply({ ok: false, error: 'busy' });

  // 3. The fields themselves.
  var email = String(form.email || '').trim().toLowerCase();
  if (!isEmail(email)) return reply({ ok: false, error: 'invalid_email' });
  if (form.consent !== 'yes') return reply({ ok: false, error: 'no_consent' });

  // 4. The CAPTCHA, checked with Cloudflare.
  if (!checkTurnstile(form['cf-turnstile-response'])) return reply({ ok: false, error: 'captcha' });

  // 5. Save, unless already on the list. The lock stops two sign-ups at
  //    the same moment from both passing the duplicate check.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply({ ok: false, error: 'busy' });
  try {
    saveSubscriber(email, String(form.consent_text || ''));
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

/**
 * Is this a plausible email address? A loose check: the CAPTCHA and the
 * first email we send do the real proving. Returns true or false.
 */
function isEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Asks Cloudflare whether a Turnstile token is genuine and unused.
 * Returns true only on a clear yes; any failure (no secret set, network
 * error, bad token) counts as no.
 */
function checkTurnstile(token) {
  var secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  if (!secret || !token) return false;
  try {
    var response = UrlFetchApp.fetch(TURNSTILE_VERIFY_URL, {
      method: 'post',
      payload: { secret: secret, response: token },
      muteHttpExceptions: true
    });
    var result = JSON.parse(response.getContentText());
    return result.success === true;
  } catch (err) {
    console.error('Turnstile check failed: ' + err);
    return false;
  }
}

/**
 * Counts this request towards the per-minute limit, if there's room.
 * Writes: a counter in the script cache (expires after a minute).
 * Returns true if the request is allowed.
 */
function recordIfUnderLimit() {
  var cache = CacheService.getScriptCache();
  var key = 'signups-' + Math.floor(Date.now() / 60000);
  var count = Number(cache.get(key) || 0);
  if (count >= MAX_PER_MINUTE) return false;
  cache.put(key, String(count + 1), 120);
  return true;
}

/**
 * Adds a subscriber row, unless the email is already in the sheet.
 * Writes: one row to the Subscribers sheet (creates the tab if needed).
 */
function saveSubscriber(email, consentText) {
  setUp();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var last = sheet.getLastRow();
  if (last > 1) {
    var existing = sheet.getRange(2, 2, last - 1, 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i][0]).replace(/^'/, '').toLowerCase() === email) return;
    }
  }
  sheet.appendRow([new Date(), safeCell(email), 'website', safeCell(consentText.slice(0, 300))]);
}

/**
 * Stops a value being read as a spreadsheet formula (for example one
 * starting with "="), by prefixing an apostrophe. Returns the safe text.
 */
function safeCell(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

/** Wraps an object as a JSON reply. */
function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
