const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withGoogleMapsApiKey(config, { androidApiKey } = {}) {
  if (!androidApiKey) return config;

  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error("Android manifest is missing its application element.");
    }

    const metadata = application["meta-data"] ?? [];
    const apiKeyEntry = metadata.find(
      (entry) => entry.$["android:name"] === "com.google.android.geo.API_KEY"
    );

    if (apiKeyEntry) {
      apiKeyEntry.$["android:value"] = androidApiKey;
    } else {
      metadata.push({
        $: {
          "android:name": "com.google.android.geo.API_KEY",
          "android:value": androidApiKey
        }
      });
    }

    application["meta-data"] = metadata;
    return config;
  });
};
