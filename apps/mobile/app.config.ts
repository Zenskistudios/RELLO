import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const mapOptions = {
    androidApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY
  };

  return {
    ...config,
    name: config.name ?? "Rello",
    slug: config.slug ?? "rello",
    plugins: [
      ...(config.plugins ?? []),
      ["./plugins/with-google-maps-api-key", mapOptions]
    ]
  };
};
