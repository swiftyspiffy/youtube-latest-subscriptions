(function registerRichGridProfile(root, factory) {
  const profile = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = profile;
    return;
  }

  root.YTLSProfileRegistry.register(profile);
})(typeof globalThis === "object" ? globalThis : this, function createProfile() {
  const PROFILE_ID = "rich-grid-direct-items-v1";
  const SUBSCRIPTIONS_PATH = "/feed/subscriptions";

  function directChildById(element, id) {
    return Array.from(element?.children || []).find(
      (child) => child.id === id
    );
  }

  function tagName(element) {
    return String(element?.tagName || "").toUpperCase();
  }

  function classifyChild(element) {
    const tag = tagName(element);

    if (tag === "YTD-CONTINUATION-ITEM-RENDERER") {
      return "continuation";
    }

    if (
      tag === "YTD-RICH-ITEM-RENDERER" &&
      element.querySelector?.('a[href^="/watch?v="]')
    ) {
      return "video";
    }

    return "noise";
  }

  function activeSubscriptionsPage(documentObject) {
    const pages = Array.from(
      documentObject.querySelectorAll?.(
        'ytd-browse[page-subtype="subscriptions"]'
      ) || []
    );

    return (
      pages.find(
        (page) =>
          !page.hasAttribute?.("hidden") && page.getAttribute?.("role") === "main"
      ) || pages.find((page) => !page.hasAttribute?.("hidden")) || null
    );
  }

  function detect(documentObject, locationObject) {
    if (locationObject?.pathname !== SUBSCRIPTIONS_PATH) {
      return null;
    }

    const page = activeSubscriptionsPage(documentObject);
    if (!page) {
      return null;
    }

    const grids = Array.from(
      page.querySelectorAll?.("ytd-rich-grid-renderer") || []
    );

    for (const grid of grids) {
      const feed = directChildById(grid, "contents");
      if (!feed) {
        continue;
      }

      const children = Array.from(feed.children || []);
      const header = children.find(
        (child) =>
          tagName(child) === "YTD-RICH-SECTION-RENDERER" &&
          Boolean(child.querySelector?.('a[href="/feed/channels"]'))
      );
      const recognizableChildren = children.filter((child) =>
        [
          "YTD-RICH-SECTION-RENDERER",
          "YTD-RICH-ITEM-RENDERER",
          "YTD-CONTINUATION-ITEM-RENDERER"
        ].includes(tagName(child))
      );

      if (header && recognizableChildren.length > 0) {
        return { page, grid, feed, header };
      }
    }

    return null;
  }

  function countLinks(element, prefix) {
    return element.querySelectorAll?.(`a[href^="${prefix}"]`).length || 0;
  }

  function describeChild(element, index) {
    return {
      index,
      tag: tagName(element).toLowerCase(),
      id: element.id || null,
      className:
        typeof element.className === "string" ? element.className : null,
      hidden: Boolean(element.hasAttribute?.("hidden")),
      classification: classifyChild(element),
      linkKinds: {
        watch: countLinks(element, "/watch?v="),
        shorts: countLinks(element, "/shorts/"),
        feed: countLinks(element, "/feed/")
      }
    };
  }

  function diagnose(context) {
    const children = Array.from(context.feed.children || []);

    return {
      parser: PROFILE_ID,
      selectors: {
        page: 'ytd-browse[page-subtype="subscriptions"]',
        grid: "ytd-rich-grid-renderer > #contents"
      },
      counts: children.reduce(
        (counts, child) => {
          const classification =
            child === context.header ? "header" : classifyChild(child);
          counts[classification] += 1;
          return counts;
        },
        { header: 0, video: 0, continuation: 0, noise: 0 }
      ),
      directChildren: children.map((child, index) => ({
        ...describeChild(child, index),
        classification:
          child === context.header ? "header" : classifyChild(child)
      }))
    };
  }

  return {
    id: PROFILE_ID,
    label: "YouTube rich-grid subscriptions (direct items)",
    detect,
    classifyChild,
    diagnose
  };
});
