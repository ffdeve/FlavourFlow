module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    // NOTE: no manual worklets/reanimated plugin here — with Expo SDK 54 +
    // Reanimated 4, babel-preset-expo injects "react-native-worklets/plugin"
    // automatically. Listing "react-native-reanimated/plugin" as well caused a
    // double worklet transform (fine in dev, broken gestures/animations in
    // release builds).
    plugins: [],
  };
};
