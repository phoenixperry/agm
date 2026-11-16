The Antigravity Machine: website prototype

index.html          The whole page in one file. The animation script is inside it.
agm-background.js   The background animation ("Slow Levitation"). The logo's letters
                    ride a slow, swirling air current (curl noise), turn with its
                    eddies, and come apart where the air is turbulent. About a
                    quarter are green or pink. The big logo at the top is drawn by
                    the same script: its letters come loose as you scroll down and
                    spring home at the top. Settings are in DEFAULTS at the top.
                    index.html and animation-lab/viewer.html carry identical inline
                    copies: change all three together.
animation-lab/      philosophy.md: the idea behind the animation.
                    viewer.html: the animation with sliders, for tuning by eye.
                    previous-agm-background.js: the version before this rewrite.
logo/               The mark as SVG: indigo, grey, and both with a background.
                    The two agm-mark-small files are for small sizes: same shapes and
                    spacing, with a 1.5px line that stays that fine at any size.
mailing-list/       Code.gs: the Apps Script that saves sign-ups to a Google Sheet.
                    SETUP.md: step-by-step set-up, including the CAPTCHA.
previous-v4/        The page as it was before the 16 Nov 2026 redesign pass.

To do before publishing
- Events: add new ones to the Events list in index.html, soonest first,
  and take past ones off (or move them to a "Past events" list).
- Mailing list: the header button opens a sign-up dialog. It needs a
  Google Apps Script web app and a Cloudflare Turnstile key before it
  works: follow mailing-list/SETUP.md, then fill in data-endpoint and
  data-sitekey on the form in index.html.
- Fonts load from Google Fonts (Space Grotesk), so the page needs a connection.
- Colours: indigo #30348C, grey #EAE5E0 (grey sampled from a screenshot).
