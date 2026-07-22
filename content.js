(function initializeContentScript(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }

  api.start({
    chromeApi: root.chrome,
    documentObject: root.document,
    locationObject: root.location,
    mutationObserver: root.MutationObserver,
    registry: root.YTLSProfileRegistry,
    windowObject: root
  });
})(typeof globalThis === "object" ? globalThis : this, function createApi() {
  const ENABLED_KEY = "enabled";
  const SUBSCRIPTIONS_PATH = "/feed/subscriptions";
  const MESSAGE_GET_STATUS = "YTLS_GET_STATUS";
  const MESSAGE_CAPTURE_RAW_DOM = "YTLS_CAPTURE_RAW_DOM";

  function serializeDoctype(doctype) {
    if (!doctype) {
      return "";
    }

    const publicId = doctype.publicId ? ` PUBLIC \"${doctype.publicId}\"` : "";
    const systemId = doctype.systemId
      ? `${publicId ? "" : " SYSTEM"} \"${doctype.systemId}\"`
      : "";

    return `<!DOCTYPE ${doctype.name || "html"}${publicId}${systemId}>\n`;
  }

  function createRawDomReport({
    documentObject,
    locationObject,
    match,
    navigatorObject,
    extensionVersion
  }) {
    const rawDom =
      serializeDoctype(documentObject.doctype) +
      documentObject.documentElement.outerHTML;

    return {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      extensionVersion,
      pageUrl: locationObject.href,
      browser: navigatorObject.userAgent,
      platform:
        navigatorObject.userAgentData?.platform || navigatorObject.platform || null,
      detectedProfile: match
        ? { id: match.profile.id, label: match.profile.label }
        : null,
      profileDiagnostics: match ? match.profile.diagnose(match.context) : null,
      rawDom
    };
  }

  function start({
    chromeApi,
    documentObject,
    locationObject,
    mutationObserver,
    registry,
    windowObject
  }) {
    if (!chromeApi?.storage?.local || !documentObject?.documentElement || !registry) {
      return null;
    }

    let enabled = true;
    let currentMatch = null;
    let observedPath = locationObject.pathname;
    let updateQueued = false;

    function isSubscriptionsPage() {
      return locationObject.pathname === SUBSCRIPTIONS_PATH;
    }

    function updateDomState() {
      updateQueued = false;
      observedPath = locationObject.pathname;
      currentMatch = registry.detect(documentObject, locationObject);

      documentObject.documentElement.setAttribute(
        "data-ytls-enabled",
        String(enabled)
      );

      if (currentMatch) {
        documentObject.documentElement.setAttribute(
          "data-ytls-profile",
          currentMatch.profile.id
        );
      } else {
        documentObject.documentElement.removeAttribute("data-ytls-profile");
      }
    }

    function scheduleUpdate() {
      if (updateQueued) {
        return;
      }

      updateQueued = true;
      windowObject.requestAnimationFrame(updateDomState);
    }

    function status() {
      return {
        enabled,
        isSubscriptionsPage: isSubscriptionsPage(),
        supported: Boolean(currentMatch),
        profile: currentMatch
          ? { id: currentMatch.profile.id, label: currentMatch.profile.label }
          : null
      };
    }

    chromeApi.storage.local.get({ [ENABLED_KEY]: true }).then((settings) => {
      enabled = settings[ENABLED_KEY] !== false;
      updateDomState();
    });

    chromeApi.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[ENABLED_KEY]) {
        return;
      }

      enabled = changes[ENABLED_KEY].newValue !== false;
      updateDomState();
    });

    chromeApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === MESSAGE_GET_STATUS) {
        updateDomState();
        sendResponse({ ok: true, status: status() });
        return false;
      }

      if (message?.type === MESSAGE_CAPTURE_RAW_DOM) {
        updateDomState();

        if (!isSubscriptionsPage()) {
          sendResponse({
            ok: false,
            error: "Open YouTube Subscriptions before capturing a report."
          });
          return false;
        }

        sendResponse({
          ok: true,
          report: createRawDomReport({
            documentObject,
            extensionVersion: chromeApi.runtime.getManifest().version,
            locationObject,
            match: currentMatch,
            navigatorObject: windowObject.navigator
          })
        });
        return false;
      }

      return false;
    });

    documentObject.addEventListener("yt-navigate-finish", scheduleUpdate);
    windowObject.addEventListener("popstate", scheduleUpdate);

    const observer = new mutationObserver(() => {
      if (
        observedPath !== locationObject.pathname ||
        (isSubscriptionsPage() &&
          (!currentMatch || !currentMatch.context.feed.isConnected))
      ) {
        scheduleUpdate();
      }
    });
    observer.observe(documentObject.documentElement, {
      childList: true,
      subtree: true
    });

    updateDomState();

    return { status, updateDomState };
  }

  return {
    ENABLED_KEY,
    MESSAGE_CAPTURE_RAW_DOM,
    MESSAGE_GET_STATUS,
    SUBSCRIPTIONS_PATH,
    createRawDomReport,
    serializeDoctype,
    start
  };
});
