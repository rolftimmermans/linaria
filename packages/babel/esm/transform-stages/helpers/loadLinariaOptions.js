import { cosmiconfigSync } from 'cosmiconfig';
const explorerSync = cosmiconfigSync('linaria');
const cache = new WeakMap();
const defaultOverrides = {};
const nodeModulesRegExp = /[\\/]node_modules[\\/]/;
export default function loadLinariaOptions(overrides = defaultOverrides) {
  if (cache.has(overrides)) {
    return cache.get(overrides);
  }
  const {
    configFile,
    ignore,
    rules,
    babelOptions = {},
    ...rest
  } = overrides;
  const result = configFile !== undefined ? explorerSync.load(configFile) : explorerSync.search();
  const options = {
    displayName: false,
    evaluate: true,
    extensions: ['.cjs', '.json', '.js', '.jsx', '.mjs', '.ts', '.tsx'],
    rules: rules ?? [{
      action: require.resolve('@linaria/shaker')
    }, {
      // The old `ignore` option is used as a default value for `ignore` rule.
      test: ignore ?? nodeModulesRegExp,
      action: 'ignore'
    }, {
      // Do not ignore ES-modules
      test: (filename, code) => {
        if (!nodeModulesRegExp.test(filename)) {
          return false;
        }
        return /(?:^|\n|;)\s*(?:export|import)\s+/.test(code);
      },
      action: require.resolve('@linaria/shaker')
    }],
    babelOptions,
    ...(result ? result.config : null),
    ...rest
  };
  cache.set(overrides, options);
  return options;
}
//# sourceMappingURL=loadLinariaOptions.js.map