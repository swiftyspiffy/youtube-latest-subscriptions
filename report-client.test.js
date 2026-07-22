const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getInstallationCredentials,
  submitReport,
  withSupportContact
} = require("./report-client.js");

test("creates and reuses a unique local installation credential", async () => {
  const values = {};
  const chromeApi = {
    storage: {
      local: {
        get: async (defaults) => ({ ...defaults, ...values }),
        set: async (changes) => Object.assign(values, changes)
      }
    }
  };
  const cryptoObject = {
    randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
    getRandomValues: (bytes) => bytes.fill(7)
  };

  const first = await getInstallationCredentials(chromeApi, cryptoObject);
  const second = await getInstallationCredentials(chromeApi, {
    randomUUID: () => {
      throw new Error("stored UUID should be reused");
    }
  });

  assert.deepEqual(second, first);
  assert.equal(first.installationToken.length, 43);
});

test("adds optional contact details without changing the raw DOM", () => {
  const report = { rawDom: "<html>unaltered</html>" };
  const result = withSupportContact(report, {
    method: " email ",
    value: " viewer@example.com ",
    message: " Layout changed. "
  });

  assert.equal(result.rawDom, report.rawDom);
  assert.deepEqual(result.supportContact, {
    method: "email",
    value: "viewer@example.com",
    message: "Layout changed."
  });
  assert.equal(report.supportContact, undefined);
});

test("requests a one-time challenge before sending the report", async () => {
  const token = "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc";
  const calls = [];
  const fetchFunction = async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) {
      return {
        ok: true,
        status: 201,
        json: async () => ({ challengeToken: token })
      };
    }
    return {
      ok: true,
      status: 201,
      json: async () => ({ ok: true, reportId: "rpt_test" })
    };
  };

  const result = await submitReport({
    fetchFunction,
    challengeEndpoint: "https://youtube-subscription.spiffy.dev/api/v1/challenges",
    reportEndpoint: "https://youtube-subscription.spiffy.dev/api/v1/reports",
    reportJson: "{\"rawDom\":\"exact\"}",
    extensionVersion: "1.2.0",
    credentials: {
      installationId: "123e4567-e89b-42d3-a456-426614174000",
      installationToken: token
    }
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/challenges$/);
  assert.match(calls[1].url, /\/reports$/);
  assert.equal(calls[1].options.headers["X-YTLS-Challenge"], token);
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${token}`);
  assert.equal(calls[1].options.body, "{\"rawDom\":\"exact\"}");
  assert.equal(result.reportId, "rpt_test");
});

test("surfaces the API error message", async () => {
  await assert.rejects(
    submitReport({
      fetchFunction: async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "Daily limit reached." } })
      }),
      challengeEndpoint: "https://example.com/challenges",
      reportEndpoint: "https://example.com/reports",
      reportJson: "{}",
      extensionVersion: "1.2.0",
      credentials: {
        installationId: "123e4567-e89b-42d3-a456-426614174000",
        installationToken: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc"
      }
    }),
    /Daily limit reached/
  );
});
