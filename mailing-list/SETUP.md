# Mailing list set-up

The website's "Join the mailing list" button opens a small sign-up form.
The form sends the email address to a Google Apps Script web app
(`Code.gs`), which checks a CAPTCHA and saves the address in a Google
Sheet. Allow about 20 minutes.

What you'll end up with:

- a Google Sheet holding the list (one row per person)
- a web app URL, which goes in `index.html` as `data-endpoint`
- a Cloudflare Turnstile site key (public, goes in `index.html` as
  `data-sitekey`) and secret key (private, goes in Apps Script only)

## Why Cloudflare Turnstile for the CAPTCHA

Turnstile is free and usually invisible: most people never see a
puzzle. Unlike Google reCAPTCHA it sets no tracking cookies, so it
doesn't add a cookie-consent question to the site. The site only loads
it when someone opens the sign-up form. Swapping to reCAPTCHA later
means changing the script URL and widget call in `index.html` and the
check in `checkTurnstile()` in `Code.gs`.

## 1. Make the spreadsheet

1. In Google Drive, in the project's shared folder (`_Research/`), make
   a new Google Sheet. Call it something like "AGM mailing list".
2. Keep its sharing to the people who send the updates. It holds
   personal data.

## 2. Add the script

1. In the sheet: **Extensions > Apps Script**.
2. Delete what's in `Code.gs` there, paste in the whole of `Code.gs`
   from this folder, and save.
3. In the function menu at the top choose **setUp**, then **Run**.
   Google will ask you to authorise the script (it needs the sheet and
   to contact Cloudflare). This makes a "Subscribers" tab with a header
   row.

## 3. Get the CAPTCHA keys

1. Sign in to Cloudflare (a free account is enough) and open
   **Turnstile > Add widget**.
2. Name it "Antigravity Machine website". Add the site's domain under
   hostnames, and `localhost` if you want to test locally.
3. Widget mode: **Managed**. Create it.
4. Copy the **site key** and the **secret key**.

## 4. Give the script the secret key

1. In Apps Script: **Project Settings** (the cog) > **Script
   Properties** > **Add script property**.
2. Property: `TURNSTILE_SECRET`. Value: the secret key. Save.

Never paste the secret key into `Code.gs`, `index.html` or a chat. The
site key is fine to publish; the secret is not.

## 5. Publish the web app

1. **Deploy > New deployment**. Type: **Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
3. Deploy, and copy the web app URL (it ends in `/exec`).

If the UAL Google account doesn't offer "Anyone", the university's
Google admin has blocked public web apps. Ask IT, or host the sheet and
script under another project Google account.

## 6. Connect the website

In `index.html`, find the form (search for `data-endpoint`) and fill in:

```html
<form class="join-form" data-endpoint="PASTE THE /exec URL" data-sitekey="PASTE THE SITE KEY" novalidate>
```

## 7. Test it

Turnstile only runs on the hostnames you listed, and not on pages
opened straight from disk (`file://`). To test locally, serve the folder:

```
cd antigravity-machine-website-4
python3 -m http.server 8000
```

then open `http://localhost:8000`, press **Join the mailing list**,
enter an address, tick the box, wait for the check, and press **Join**.
A new row should appear in the Subscribers tab.

For a dry run before you have real keys, Cloudflare publishes testing
keys that always pass ([Turnstile testing docs](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)):
site key `1x00000000000000000000AA` (already in `index.html`) and secret
key `1x0000000000000000000000000000000AA`. Swap both for the real keys
before going live.

## Changing the script later

After editing `Code.gs`: **Deploy > Manage deployments >** (pencil) >
**Version: New version > Deploy**. The URL stays the same.

## Before going live: check with UAL

- **Data protection.** The form says addresses are kept "in a
  spreadsheet at the University of the Arts London" and used "only to
  send these updates". Check that wording, and where the list is
  stored, with UAL's data protection team. (Not yet reviewed.)
- **Unsubscribing.** The consent line promises people can unsubscribe
  at any time. Say how in every email (for example "reply with
  'unsubscribe'"), and delete their row when they do.
- **Sending.** This only collects addresses. To send, use BCC from a
  project address, or import the sheet into a mailing tool.
