/*
 * Production support destination. Keep server credentials out of the extension;
 * every installation receives its own local credential and a server challenge.
 */
globalThis.YTLS_SUPPORT_CONFIG = Object.freeze({
  challengeEndpoint: "https://youtube-subscription.spiffy.dev/api/v1/challenges",
  reportEndpoint: "https://youtube-subscription.spiffy.dev/api/v1/reports",
  reportMethod: "POST",
  supportEmail: "swiftyspiffy@gmail.com"
});
