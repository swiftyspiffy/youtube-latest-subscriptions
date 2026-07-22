(function initializeProfileRegistry(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }

  root.YTLSProfileRegistry = api.createRegistry();
})(typeof globalThis === "object" ? globalThis : this, function createApi() {
  function validateProfile(profile) {
    if (!profile || typeof profile !== "object") {
      throw new TypeError("DOM profile must be an object");
    }

    for (const property of ["id", "label", "detect", "classifyChild", "diagnose"]) {
      if (!profile[property]) {
        throw new TypeError(`DOM profile is missing ${property}`);
      }
    }

    if (!/^[a-z0-9-]+$/.test(profile.id)) {
      throw new TypeError(`Invalid DOM profile id: ${profile.id}`);
    }
  }

  function createRegistry() {
    const profiles = [];

    return {
      register(profile) {
        validateProfile(profile);

        if (profiles.some((candidate) => candidate.id === profile.id)) {
          throw new Error(`Duplicate DOM profile id: ${profile.id}`);
        }

        profiles.push(profile);
      },

      detect(documentObject, locationObject) {
        for (const profile of profiles) {
          const context = profile.detect(documentObject, locationObject);
          if (context) {
            return { profile, context };
          }
        }

        return null;
      },

      list() {
        return profiles.slice();
      }
    };
  }

  return { createRegistry, validateProfile };
});
