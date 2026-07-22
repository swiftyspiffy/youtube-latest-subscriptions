(function initializePopup() {
  const ENABLED_KEY = "enabled";
  const MESSAGE_GET_STATUS = "YTLS_GET_STATUS";
  const toggle = document.querySelector("#enabled");
  const reportButton = document.querySelector("#report");
  const statusElement = document.querySelector("#status");
  let activeTabId = null;
  let currentStatus = null;

  function showStatus(message, kind = "neutral") {
    statusElement.textContent = message;
    statusElement.dataset.kind = kind;
  }

  function renderPageStatus(status) {
    currentStatus = status;
    toggle.checked = status.enabled;
    reportButton.disabled = !status.isSubscriptionsPage;

    if (!status.isSubscriptionsPage) {
      showStatus("Open YouTube Subscriptions to inspect its layout.");
      return;
    }

    if (!status.supported) {
      showStatus(
        "This YouTube layout is not supported yet. A raw DOM report can help add it.",
        "unsupported"
      );
      return;
    }

    if (!status.enabled) {
      showStatus(`Filtering is off. Detected: ${status.profile.label}.`);
      return;
    }

    showStatus(`Active layout: ${status.profile.label}.`, "supported");
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function refreshStatus() {
    const tab = await getActiveTab();
    activeTabId = tab?.id ?? null;

    if (activeTabId === null) {
      reportButton.disabled = true;
      showStatus("No active browser tab was found.");
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(activeTabId, {
        type: MESSAGE_GET_STATUS
      });

      if (!response?.ok) {
        throw new Error("The page did not return its status.");
      }

      renderPageStatus(response.status);
    } catch (_error) {
      reportButton.disabled = true;
      showStatus("Open or refresh a YouTube tab to use this extension.");
    }
  }

  toggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ [ENABLED_KEY]: toggle.checked });

    if (currentStatus) {
      currentStatus.enabled = toggle.checked;
      renderPageStatus(currentStatus);
    }
  });

  reportButton.addEventListener("click", async () => {
    if (activeTabId === null) {
      return;
    }

    const url = new URL(chrome.runtime.getURL("report.html"));
    url.searchParams.set("tab", String(activeTabId));
    await chrome.tabs.create({ url: url.toString() });
    window.close();
  });

  chrome.storage.local.get({ [ENABLED_KEY]: true }).then((settings) => {
    toggle.checked = settings[ENABLED_KEY] !== false;
  });

  refreshStatus();
})();
