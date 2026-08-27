const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Fix: react-native-svg v15.x — Metro picks up the TS src/ files via
// sourceExts and fails on internal paths that don't exist in the published
// package (e.g. ./lib/extract/types). Alias the package to its pre-compiled
// CommonJS entry so Metro never touches the TS source files.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-native-svg": path.resolve(
    __dirname,
    "node_modules/react-native-svg/lib/commonjs/index.js"
  ),
};

module.exports = withNativeWind(config, { input: "./src/global.css" });

