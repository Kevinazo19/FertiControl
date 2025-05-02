import 'dotenv/config';

export default {
  expo: {
    name: "FertiControl",
    slug: "ferticontrol",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#FFF5F7"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tuempresa.ferticontrol"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#FFF5F7"
      },
      package: "com.tuempresa.ferticontrol",
      permissions: [
        "INTERNET"
      ]
    },
    web: {
      favicon: "./assets/icon.png"
    },
    extra: {
      HTTP_URL: process.env.HTTP_URL,
      AUTH_TOKEN: process.env.AUTH_TOKEN,
      eas: {
        projectId: "" 
      }
    }
  }
};
