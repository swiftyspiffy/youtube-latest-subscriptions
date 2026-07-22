const assert = require("node:assert/strict");
const test = require("node:test");

const profile = require("./rich-grid-direct-items-v1.js");

function element(tag, options = {}) {
  const attributes = new Map(Object.entries(options.attributes || {}));
  const links = options.links || [];

  return {
    tagName: tag.toUpperCase(),
    id: options.id || "",
    className: options.className || "",
    children: options.children || [],
    hasAttribute(name) {
      return attributes.has(name);
    },
    getAttribute(name) {
      return attributes.get(name) || null;
    },
    querySelector(selector) {
      const href = selector.match(/a\[href(?:\^)?="([^"]+)"\]/)?.[1];
      return links.some((link) =>
        selector.includes("href^=") ? link.startsWith(href) : link === href
      )
        ? { href }
        : null;
    },
    querySelectorAll(selector) {
      const href = selector.match(/a\[href\^="([^"]+)"\]/)?.[1];
      if (href) {
        return links.filter((link) => link.startsWith(href)).map(() => ({}));
      }

      if (selector === "ytd-rich-grid-renderer") {
        return options.grids || [];
      }

      return [];
    }
  };
}

test("classifies direct video, continuation, and noise children", () => {
  assert.equal(
    profile.classifyChild(
      element("ytd-rich-item-renderer", { links: ["/watch?v=abc"] })
    ),
    "video"
  );
  assert.equal(
    profile.classifyChild(element("ytd-continuation-item-renderer")),
    "continuation"
  );
  assert.equal(
    profile.classifyChild(
      element("ytd-rich-item-renderer", { links: ["/shorts/abc"] })
    ),
    "noise"
  );
});

test("detects the versioned layout without requiring the header to be first", () => {
  const injectedByAnotherExtension = element("div");
  const header = element("ytd-rich-section-renderer", {
    links: ["/feed/channels"]
  });
  const video = element("ytd-rich-item-renderer", {
    links: ["/watch?v=abc"]
  });
  const feed = element("div", {
    id: "contents",
    children: [injectedByAnotherExtension, header, video]
  });
  const grid = element("ytd-rich-grid-renderer", { children: [feed] });
  const page = element("ytd-browse", {
    attributes: { role: "main" },
    grids: [grid]
  });
  const documentObject = {
    querySelectorAll() {
      return [page];
    }
  };

  const context = profile.detect(documentObject, {
    pathname: "/feed/subscriptions"
  });

  assert.equal(context.header, header);
  assert.equal(context.feed, feed);
  assert.equal(profile.diagnose(context).counts.video, 1);
  assert.equal(profile.diagnose(context).counts.noise, 1);
});

test("does not claim unrelated or structurally different pages", () => {
  assert.equal(profile.detect({ querySelectorAll: () => [] }, { pathname: "/" }), null);
  assert.equal(
    profile.detect(
      { querySelectorAll: () => [] },
      { pathname: "/feed/subscriptions" }
    ),
    null
  );
});
