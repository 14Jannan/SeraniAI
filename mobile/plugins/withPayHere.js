const {
  withProjectBuildGradle,
  withAndroidManifest,
  withPodfile,
} = require("@expo/config-plugins");

/* Expo config plugin for @payhere/payhere-mobilesdk-reactnative.
 *
 * The SDK predates Expo's Continuous Native Generation model and ships no
 * config plugin of its own, so its documented native setup steps
 * (https://github.com/PayHereLK/payhere-mobilesdk-reactnative#readme) have
 * to be applied programmatically here instead of by hand-editing the
 * generated android/ios folders - those get regenerated (wiping any manual
 * edit) on every `expo prebuild`.
 *
 * NOTE: this is a best-effort, regex-based patch of generated Gradle/Podfile
 * text - it hasn't been run through an actual EAS build in this
 * environment. After `expo prebuild`, it's worth diffing
 * android/build.gradle, android/app/src/main/AndroidManifest.xml, and
 * ios/Podfile against PayHere's install docs to confirm the patches landed
 * before trusting a full EAS build.
 */

const withPayHereAndroidRepo = (config) =>
  withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      return config;
    }

    if (config.modResults.contents.includes("jitpack.io")) {
      return config;
    }

    // Add PayHere's jitpack dependency + mavenLocal() to the first
    // `repositories { ... }` block inside `allprojects { ... }`.
    config.modResults.contents = config.modResults.contents.replace(
      /(allprojects\s*{\s*repositories\s*{)/,
      `$1\n        mavenLocal()\n        maven { url 'https://jitpack.io' }`
    );

    return config;
  });

const withPayHereManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    const application = manifest.application?.[0];
    if (application) {
      application.$ = application.$ || {};
      const existing = application.$["tools:replace"];
      if (!existing) {
        application.$["tools:replace"] = "android:allowBackup";
      } else if (!existing.split(",").includes("android:allowBackup")) {
        application.$["tools:replace"] = `${existing},android:allowBackup`;
      }
    }

    return config;
  });

const withPayHerePodfile = (config) =>
  withPodfile(config, (config) => {
    if (config.modResults.contents.includes("payHereSDK")) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /(use_react_native!\([^)]*\)\s*\n)/,
      `$1\n  pod 'payHereSDK', :git => 'https://github.com/PayHereLK/payhere-mobilesdk-ios.git'\n  pod 'payhere-mobilesdk-reactnative', :path => '../node_modules/@payhere/payhere-mobilesdk-reactnative'\n`
    );

    return config;
  });

module.exports = function withPayHere(config) {
  config = withPayHereAndroidRepo(config);
  config = withPayHereManifest(config);
  config = withPayHerePodfile(config);
  return config;
};
