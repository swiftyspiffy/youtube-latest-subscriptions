# YouTube Latest Subscriptions

A minimal Chrome/Chromium extension that makes YouTube's Subscriptions page
show only the chronological video feed. It hides the **Most relevant** shelf,
Shorts, promotions, posts, mixes, and other injected sections.

It affects only `youtube.com/feed/subscriptions`. Home, search, channel pages,
and video pages are unchanged. The native **All subscriptions** link remains
available, and the header is relabeled **Most Recently Uploaded**.

Click the extension icon to enable or disable filtering. The preference is
stored locally. There are no analytics, advertisements, or automatic network
requests.

## Install

1. Open `chrome://extensions` in Chrome, Chromium, Brave, or another
   Chromium-based browser.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this `YouTubeLatestSubscriptions` directory.
5. Refresh any YouTube tabs that were already open.

Clicking **Subscriptions** in YouTube's left navigation will now show only the
latest normal video cards. Live videos and scheduled premieres remain because
YouTube includes them in the chronological video feed.

## Build a Chrome Web Store ZIP

Run:

```bash
bash scripts/package.sh
```

The uploadable archive is written to `dist/` with `manifest.json` at the ZIP
root. Tests, documentation, and development files are excluded.

## DOM layout profiles

YouTube serves different markup to different accounts and experiments. The
extension detects a versioned DOM profile before applying any filtering. Each
profile owns its detection, classification, formatting selectors, and report
parser:

- Registry: `profile-registry.js`
- Current profile: `profiles/rich-grid-direct-items-v1.js`
- Profile-specific styles: `subscriptions.css`

If no profile matches, the extension leaves the page unchanged. Add future
layouts as separate files under `profiles/`, register them before `content.js`
in `manifest.json`, and add CSS scoped to the new `data-ytls-profile` value.

## Raw DOM support reports

The popup can capture the complete live page DOM for layout troubleshooting.
The report is raw and may contain private account and browsing-related data, so
the extension shows a dedicated review and consent page first. See
[`PRIVACY.md`](PRIVACY.md).

Reports can always be previewed, copied, or downloaded locally. To enable
private direct submission:

1. Set the HTTPS `challengeEndpoint`, `reportEndpoint`, and `reportMethod` in
   `support-config.js`.
2. Add only that endpoint's origin to `host_permissions` in `manifest.json`.
3. Configure the API to issue one-time challenges and accept the JSON report
   with its per-installation credential.

Production submissions use `https://youtube-subscription.spiffy.dev`. Each
installation creates a random local ID and token, then obtains a ten-minute,
single-use server challenge before sending. The server applies installation and
IP rate limits, rejects duplicate DOM submissions, and deletes stored reports
after 30 days. Users may optionally include an email address, Discord username,
GitHub identity, other contact instructions, and a short issue description.

`supportEmail` remains available as a fallback that opens the user's default
mail client; the user must manually attach the downloaded JSON report.

## Development

The project has no runtime or build dependencies. Run the test suite with:

```bash
npm test
```

## License

[MIT](LICENSE)
