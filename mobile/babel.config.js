module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated 4.x moved its Babel plugin into the separate
    // react-native-worklets package (the peer dep expo-doctor had us add) -
    // the old react-native-reanimated/plugin path is deprecated and left
    // worklets untransformed, which is what was throwing the Metro
    // TransformError/SyntaxError on device.
    plugins: ['react-native-worklets/plugin'], // must be last

  };
};