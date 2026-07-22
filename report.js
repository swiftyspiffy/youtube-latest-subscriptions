(function initializeReportPage() {
  const MESSAGE_CAPTURE_RAW_DOM = "YTLS_CAPTURE_RAW_DOM";
  const config = globalThis.YTLS_SUPPORT_CONFIG || {};
  const reportClient = globalThis.YTLSReportClient;
  const loading = document.querySelector("#loading");
  const content = document.querySelector("#report-content");
  const profile = document.querySelector("#profile");
  const pageUrl = document.querySelector("#page-url");
  const reportSize = document.querySelector("#report-size");
  const destination = document.querySelector("#destination");
  const preview = document.querySelector("#raw-preview");
  const previewButton = document.querySelector("#preview");
  const copyButton = document.querySelector("#copy");
  const downloadButton = document.querySelector("#download");
  const contactMethod = document.querySelector("#contact-method");
  const contactValue = document.querySelector("#contact-value");
  const supportMessage = document.querySelector("#support-message");
  const consent = document.querySelector("#consent");
  const sendButton = document.querySelector("#send");
  const emailButton = document.querySelector("#email");
  const submitStatus = document.querySelector("#submit-status");
  let report = null;

  function formatBytes(bytes) {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function showSubmitStatus(message, kind = "neutral") {
    submitStatus.textContent = message;
    submitStatus.dataset.kind = kind;
  }

  function safeEndpoint(value) {
    if (!value) {
      return null;
    }

    try {
      const endpoint = new URL(value);
      return endpoint.protocol === "https:" ? endpoint : null;
    } catch (_error) {
      return null;
    }
  }

  function endpoints() {
    const challenge = safeEndpoint(config.challengeEndpoint);
    const reportEndpoint = safeEndpoint(config.reportEndpoint);
    if (!challenge || !reportEndpoint || challenge.origin !== reportEndpoint.origin) {
      return null;
    }
    return { challenge, report: reportEndpoint };
  }

  function supportContact() {
    return {
      method: contactMethod.value,
      value: contactValue.value,
      message: supportMessage.value
    };
  }

  function currentReportJson() {
    const reportWithContact = reportClient.withSupportContact(report, supportContact());
    return JSON.stringify(reportWithContact, null, 2);
  }

  function updateReportSize() {
    if (!report) {
      return;
    }
    reportSize.textContent = formatBytes(new Blob([currentReportJson()]).size);
  }

  function contactIsComplete() {
    return !contactMethod.value || Boolean(contactValue.value.trim());
  }

  function updateContactControls() {
    const hasMethod = Boolean(contactMethod.value);
    contactValue.disabled = !hasMethod;
    contactValue.setAttribute("aria-invalid", String(!contactIsComplete()));

    const placeholders = {
      email: "you@example.com",
      discord: "Discord username",
      github: "GitHub username or profile URL",
      other: "How should the developer reach you?"
    };
    contactValue.placeholder = placeholders[contactMethod.value] || "Choose a contact method first";
    updateReportSize();
    updateSubmissionControls();
  }

  function updateSubmissionControls() {
    const configuredEndpoints = endpoints();
    const hasEmail = Boolean(config.supportEmail);
    const canSubmit = consent.checked && contactIsComplete();

    sendButton.hidden = !configuredEndpoints;
    emailButton.hidden = !hasEmail;
    sendButton.disabled = !canSubmit || !configuredEndpoints;
    emailButton.disabled = !canSubmit || !hasEmail;

    if (configuredEndpoints) {
      destination.textContent =
        `Direct submission stores the report privately at ${configuredEndpoints.report.host} for up to 30 days.`;
    } else if (hasEmail) {
      destination.textContent =
        "Download the report, then use the email button and attach the JSON file manually.";
    } else {
      destination.textContent =
        "Direct submission is not configured. Download the JSON report and send it through a private support channel.";
    }
  }

  function reportFilename() {
    const profileId = report.detectedProfile?.id || "unsupported-layout";
    const timestamp = report.capturedAt.replace(/[:.]/g, "-");
    return `youtube-subscriptions-dom-${profileId}-${timestamp}.json`;
  }

  function downloadReport() {
    const blob = new Blob([currentReportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = reportFilename();
    anchor.click();
    URL.revokeObjectURL(url);
  }

  previewButton.addEventListener("click", () => {
    preview.hidden = !preview.hidden;
    previewButton.textContent = preview.hidden
      ? "Preview raw DOM"
      : "Hide raw DOM preview";

    if (!preview.hidden && !preview.value) {
      preview.value = report.rawDom;
    }
  });

  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(currentReportJson());
    showSubmitStatus("Report copied to the clipboard.", "success");
  });

  downloadButton.addEventListener("click", () => {
    downloadReport();
    showSubmitStatus("Report downloaded locally.", "success");
  });

  consent.addEventListener("change", updateSubmissionControls);
  contactMethod.addEventListener("change", () => {
    if (!contactMethod.value) {
      contactValue.value = "";
    }
    updateContactControls();
  });
  contactValue.addEventListener("input", updateContactControls);
  supportMessage.addEventListener("input", updateReportSize);

  sendButton.addEventListener("click", async () => {
    const configuredEndpoints = endpoints();
    if (!configuredEndpoints || !consent.checked || !contactIsComplete()) {
      return;
    }

    sendButton.disabled = true;
    emailButton.disabled = true;
    showSubmitStatus("Requesting a secure one-time submission challenge…");

    try {
      const credentials = await reportClient.getInstallationCredentials(chrome, crypto);
      showSubmitStatus("Sending report…");
      const result = await reportClient.submitReport({
        fetchFunction: fetch,
        challengeEndpoint: configuredEndpoints.challenge,
        reportEndpoint: configuredEndpoints.report,
        reportJson: currentReportJson(),
        extensionVersion: report.extensionVersion,
        credentials
      });

      showSubmitStatus(
        `The raw DOM report was stored successfully. Report ID: ${result.reportId}`,
        "success"
      );
    } catch (error) {
      showSubmitStatus(`The report could not be sent: ${error.message}`, "error");
      updateSubmissionControls();
    }
  });

  emailButton.addEventListener("click", () => {
    if (!config.supportEmail || !consent.checked || !contactIsComplete()) {
      return;
    }

    downloadReport();
    const subject = encodeURIComponent("YouTube Latest Subscriptions DOM report");
    const body = encodeURIComponent(
      `Please attach the downloaded ${reportFilename()} file to this message.`
    );
    window.location.href = `mailto:${config.supportEmail}?subject=${subject}&body=${body}`;
  });

  async function loadReport() {
    const sourceTabId = Number(new URLSearchParams(location.search).get("tab"));
    if (!Number.isInteger(sourceTabId)) {
      throw new Error("The source YouTube tab was not provided.");
    }

    const response = await chrome.tabs.sendMessage(sourceTabId, {
      type: MESSAGE_CAPTURE_RAW_DOM
    });

    if (!response?.ok) {
      throw new Error(response?.error || "The YouTube tab could not be read.");
    }

    report = response.report;
    profile.textContent = report.detectedProfile?.label || "Unsupported layout";
    pageUrl.textContent = report.pageUrl;
    loading.hidden = true;
    content.hidden = false;
    updateContactControls();
  }

  loadReport().catch((error) => {
    loading.textContent = `${error.message} Return to YouTube Subscriptions and try again.`;
  });
})();
