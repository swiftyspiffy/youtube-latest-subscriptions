const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const directory = __dirname;
const manifest = JSON.parse(
  fs.readFileSync(path.join(directory, "manifest.json"), "utf8")
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(directory, "package.json"), "utf8")
);
const stylesheet = fs.readFileSync(
  path.join(directory, "subscriptions.css"),
  "utf8"
);

test("uses a minimal Manifest V3 popup and content script", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, packageJson.version);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, [
    "https://youtube-subscription.spiffy.dev/*"
  ]);
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.deepEqual(manifest.content_scripts[0].css, ["subscriptions.css"]);
  assert.deepEqual(manifest.content_scripts[0].js, [
    "profile-registry.js",
    "profiles/rich-grid-direct-items-v1.js",
    "content.js"
  ]);
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
});

test("ships non-empty icons at every declared size", () => {
  for (const [size, relativePath] of Object.entries(manifest.icons)) {
    const icon = fs.readFileSync(path.join(directory, relativePath));
    assert.ok(icon.length > 400, `${size}px icon is unexpectedly small`);
  }
});

test("scopes cleanup to an enabled, detected subscriptions profile", () => {
  assert.match(stylesheet, /data-ytls-enabled="true"/);
  assert.match(stylesheet, /data-ytls-profile="rich-grid-direct-items-v1"/);
  assert.match(stylesheet, /page-subtype="subscriptions"/);
  assert.match(stylesheet, /> :not\(ytd-rich-item-renderer\)/);
});

test("keeps only watch-video cards while preserving infinite scrolling", () => {
  assert.match(stylesheet, /a\[href\^="\/watch\?v="\]/);
  assert.match(stylesheet, /ytd-continuation-item-renderer/);
});

test("keeps the native channel link and relabels its header", () => {
  assert.match(stylesheet, /a\[href="\/feed\/channels"\]/);
  assert.match(stylesheet, /content: "Most Recently Uploaded"/);
});

test("direct raw-DOM upload uses only the private report service", () => {
  const supportConfig = fs.readFileSync(
    path.join(directory, "support-config.js"),
    "utf8"
  );

  assert.match(
    supportConfig,
    /challengeEndpoint: "https:\/\/youtube-subscription\.spiffy\.dev\/api\/v1\/challenges"/
  );
  assert.match(
    supportConfig,
    /reportEndpoint: "https:\/\/youtube-subscription\.spiffy\.dev\/api\/v1\/reports"/
  );
  assert.match(supportConfig, /supportEmail: "swiftyspiffy@gmail\.com"/);
});
