const assert = require("node:assert/strict");
const test = require("node:test");

const { createRawDomReport, serializeDoctype } = require("./content.js");

test("serializes the document type", () => {
  assert.equal(serializeDoctype({ name: "html" }), "<!DOCTYPE html>\n");
  assert.equal(serializeDoctype(null), "");
});

test("captures the raw live DOM without redacting third-party changes", () => {
  const report = createRawDomReport({
    documentObject: {
      doctype: { name: "html" },
      documentElement: {
        outerHTML:
          '<html data-other-extension="present"><body>Account Name</body></html>'
      }
    },
    extensionVersion: "1.1.0",
    locationObject: {
      href: "https://www.youtube.com/feed/subscriptions?test=1"
    },
    match: null,
    navigatorObject: {
      platform: "Linux x86_64",
      userAgent: "Test Browser"
    }
  });

  assert.match(report.rawDom, /data-other-extension="present"/);
  assert.match(report.rawDom, /Account Name/);
  assert.equal(report.pageUrl.endsWith("?test=1"), true);
  assert.equal(report.detectedProfile, null);
});

test("includes profile-specific diagnostics alongside the raw DOM", () => {
  const report = createRawDomReport({
    documentObject: {
      doctype: null,
      documentElement: { outerHTML: "<html></html>" }
    },
    extensionVersion: "1.1.0",
    locationObject: { href: "https://www.youtube.com/feed/subscriptions" },
    match: {
      context: { id: "context" },
      profile: {
        id: "layout-v1",
        label: "Layout V1",
        diagnose: (context) => ({ parsedContext: context.id })
      }
    },
    navigatorObject: { platform: "Linux", userAgent: "Test Browser" }
  });

  assert.deepEqual(report.detectedProfile, {
    id: "layout-v1",
    label: "Layout V1"
  });
  assert.deepEqual(report.profileDiagnostics, { parsedContext: "context" });
});
