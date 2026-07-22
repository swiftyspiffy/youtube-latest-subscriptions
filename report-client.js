(function initializeReportClient(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }

  root.YTLSReportClient = api;
})(typeof globalThis === "object" ? globalThis : this, function createReportClient() {
  const INSTALLATION_ID_KEY = "supportInstallationId";
  const INSTALLATION_TOKEN_KEY = "supportInstallationToken";
  const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

  function encodeBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async function getInstallationCredentials(chromeApi, cryptoObject) {
    const stored = await chromeApi.storage.local.get({
      [INSTALLATION_ID_KEY]: "",
      [INSTALLATION_TOKEN_KEY]: ""
    });

    if (
      UUID_PATTERN.test(stored[INSTALLATION_ID_KEY]) &&
      TOKEN_PATTERN.test(stored[INSTALLATION_TOKEN_KEY])
    ) {
      return {
        installationId: stored[INSTALLATION_ID_KEY],
        installationToken: stored[INSTALLATION_TOKEN_KEY]
      };
    }

    const installationId = cryptoObject.randomUUID();
    const tokenBytes = new Uint8Array(32);
    cryptoObject.getRandomValues(tokenBytes);
    const installationToken = encodeBase64Url(tokenBytes);
    await chromeApi.storage.local.set({
      [INSTALLATION_ID_KEY]: installationId,
      [INSTALLATION_TOKEN_KEY]: installationToken
    });

    return { installationId, installationToken };
  }

  function withSupportContact(report, contact) {
    const method = contact.method.trim();
    const value = contact.value.trim();
    const message = contact.message.trim();
    const output = { ...report };

    if (!method && !value && !message) {
      delete output.supportContact;
      return output;
    }

    output.supportContact = { method, value, message };
    return output;
  }

  async function responseError(response, fallback) {
    try {
      const body = await response.json();
      return body?.error?.message || fallback;
    } catch (_error) {
      return fallback;
    }
  }

  async function submitReport({
    fetchFunction,
    challengeEndpoint,
    reportEndpoint,
    reportJson,
    extensionVersion,
    credentials
  }) {
    const challengeResponse = await fetchFunction(challengeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installationId: credentials.installationId,
        installationToken: credentials.installationToken,
        extensionVersion
      })
    });

    if (!challengeResponse.ok) {
      throw new Error(
        await responseError(challengeResponse, `Challenge request returned HTTP ${challengeResponse.status}.`)
      );
    }

    const challenge = await challengeResponse.json();
    if (!TOKEN_PATTERN.test(challenge.challengeToken || "")) {
      throw new Error("The report service returned an invalid challenge.");
    }

    const reportResponse = await fetchFunction(reportEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${credentials.installationToken}`,
        "Content-Type": "application/json",
        "X-YTLS-Challenge": challenge.challengeToken,
        "X-YTLS-Installation-ID": credentials.installationId
      },
      body: reportJson
    });

    if (!reportResponse.ok) {
      throw new Error(
        await responseError(reportResponse, `Report submission returned HTTP ${reportResponse.status}.`)
      );
    }

    return reportResponse.json();
  }

  return {
    getInstallationCredentials,
    submitReport,
    withSupportContact
  };
});
