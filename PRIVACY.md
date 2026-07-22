# Privacy Policy

YouTube Latest Subscriptions filters the YouTube Subscriptions page locally in
the browser. It does not collect analytics, run advertisements, sell data, or
automatically transmit page content.

## Locally stored settings

The enabled/disabled preference is stored with `chrome.storage.local`. It stays
on the user's device and is removed when the extension is uninstalled.

The extension also creates a random installation ID and token locally when a
user first attempts a direct report submission. These credentials reduce
casual replay and abuse. They do not contain an account identifier and are not
used for analytics or normal browsing activity.

## Raw DOM support reports

The extension can create a support report only after the user clicks **Review
raw DOM report** while viewing YouTube Subscriptions. The report contains the
complete live `document.documentElement.outerHTML`, the page URL, browser and
platform information, the detected layout profile, and profile-specific
diagnostics.

Users may optionally provide a contact method and contact details so the
developer can follow up, plus a short description of the problem. Contact
information is not required to submit a report.

Raw DOM is not anonymized. It may contain account details, subscriptions,
video titles, browsing-related identifiers, and page changes made by other
extensions. The report remains in browser memory unless the user explicitly
copies it, downloads it, emails it, or consents to sending it to a configured
private support endpoint. Directly submitted reports are stored privately for
up to 30 days, then automatically deleted. Source network addresses are
transformed using a keyed one-way hash for rate limiting; raw addresses are not
stored.

The extension displays the destination and requires an unchecked consent box
before a direct submission. The report is used only to diagnose and improve
YouTube layout compatibility. It is never used for advertising or sold to
third parties.

The use of information received from Chrome APIs adheres to the Chrome Web
Store User Data Policy, including the Limited Use requirements.
