/**
 * plugins/withGoogleSignInConfig.js
 * ──────────────────────────────────
 * Adds the native Google Sign-In resources that @react-native-google-signin
 * needs at build time (they only matter for EAS / standalone builds — Expo Go
 * ignores config plugins):
 *
 *   • Android   – `default_web_client_id` string resource (the Web OAuth client
 *                 ID so Google issues an ID token our backend can verify).
 *   • iOS       – the reversed client ID as a URL scheme (com.googleusercontent
 *                 .apps.<ios-client-id>). Skipped until an iOS OAuth client ID
 *                 is configured.
 *
 * IDs come from the app config `extra` block so there is exactly one source of
 * truth and .env is not needed at build time.
 */

const {
  withStringsXml,
  withInfoPlist,
  AndroidConfig,
} = require('expo/config-plugins');

function buildResourceItem({ name, value }) {
  return AndroidConfig.Resources.buildResourceItem({ name, value });
}

module.exports = function withGoogleSignInConfig(config) {
  const { googleClientId, googleAndroidClientId, googleIOSClientId } =
    config.extra || {};

  if (!googleClientId) {
    throw new Error(
      'withGoogleSignInConfig: missing `extra.googleClientId` in app.json'
    );
  }

  // Android: default_web_client_id points at the Web OAuth client.
  let modified = withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [buildResourceItem({ name: 'default_web_client_id', value: googleClientId })],
      cfg.modResults
    );
    return cfg;
  });

  // iOS: register the reversed client ID so the native SDK can receive the
  // OAuth callback. Optional — Android-only projects can omit it.
  if (googleIOSClientId) {
    if (!googleIOSClientId.startsWith('com.googleusercontent.apps.')) {
      throw new Error(
        'withGoogleSignInConfig: `extra.googleIOSClientId` must be a reversed client ID ' +
          'like "com.googleusercontent.apps.<ios-client-id>"'
      );
    }
    modified = withInfoPlist(modified, (cfg) => {
      const schemes = cfg.modResults.CFBundleURLTypes || [];
      const hasScheme = schemes.some((entry) =>
        (entry.CFBundleURLSchemes || []).includes(googleIOSClientId)
      );
      if (!hasScheme) {
        cfg.modResults.CFBundleURLTypes = [
          ...schemes,
          { CFBundleURLName: 'google sign-in', CFBundleURLSchemes: [googleIOSClientId] },
        ];
      }
      return cfg;
    });
  }

  return modified;
};