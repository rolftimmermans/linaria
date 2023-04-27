"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = webpack4Loader;
var _path = _interopRequireDefault(require("path"));
var _loaderUtils = _interopRequireDefault(require("loader-utils"));
var _babelPreset = require("@linaria/babel-preset");
var _logger = require("@linaria/logger");
var _cache = require("./cache");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * This file contains a Webpack loader for Linaria.
 * It uses the transform.ts function to generate class names from source code,
 * returns transformed code without template literals and attaches generated source maps
 */

const castSourceMap = sourceMap => sourceMap ? {
  ...sourceMap,
  version: sourceMap.version.toString()
} : undefined;
const outputCssLoader = require.resolve('./outputCssLoader');
function webpack4Loader(content, inputSourceMap) {
  // tell Webpack this loader is async
  this.async();
  (0, _logger.debug)('loader', this.resourcePath);
  const {
    sourceMap = undefined,
    preprocessor = undefined,
    extension = '.linaria.css',
    cacheProvider,
    ...rest
  } = _loaderUtils.default.getOptions(this) || {};
  const outputFileName = this.resourcePath.replace(/\.[^.]+$/, extension);
  const asyncResolve = (token, importer) => {
    const context = _path.default.isAbsolute(importer) ? _path.default.dirname(importer) : _path.default.join(process.cwd(), _path.default.dirname(importer));
    return new Promise((resolve, reject) => {
      this.resolve(context, token, (err, result) => {
        if (err) {
          reject(err);
        } else if (result) {
          this.addDependency(result);
          resolve(result);
        } else {
          reject(new Error(`Cannot resolve ${token}`));
        }
      });
    });
  };
  (0, _babelPreset.transform)(content.toString(), {
    filename: this.resourcePath,
    inputSourceMap: inputSourceMap !== null && inputSourceMap !== void 0 ? inputSourceMap : undefined,
    pluginOptions: rest,
    preprocessor
  }, asyncResolve).then(async result => {
    if (result.cssText) {
      var _result$dependencies$, _result$dependencies;
      let {
        cssText
      } = result;
      if (sourceMap) {
        cssText += `/*# sourceMappingURL=data:application/json;base64,${Buffer.from(result.cssSourceMapText || '').toString('base64')}*/`;
      }
      await Promise.all((_result$dependencies$ = (_result$dependencies = result.dependencies) === null || _result$dependencies === void 0 ? void 0 : _result$dependencies.map(dep => asyncResolve(dep, this.resourcePath))) !== null && _result$dependencies$ !== void 0 ? _result$dependencies$ : []);
      try {
        var _cacheInstance$setDep;
        const cacheInstance = await (0, _cache.getCacheInstance)(cacheProvider);
        await cacheInstance.set(this.resourcePath, cssText);
        await ((_cacheInstance$setDep = cacheInstance.setDependencies) === null || _cacheInstance$setDep === void 0 ? void 0 : _cacheInstance$setDep.call(cacheInstance, this.resourcePath, this.getDependencies()));
        const request = `${outputFileName}!=!${outputCssLoader}?cacheProvider=${encodeURIComponent(cacheProvider !== null && cacheProvider !== void 0 ? cacheProvider : '')}!${this.resourcePath}`;
        const stringifiedRequest = _loaderUtils.default.stringifyRequest(this, request);
        this.callback(null, `${result.code}\n\nrequire(${stringifiedRequest});`, castSourceMap(result.sourceMap));
      } catch (err) {
        this.callback(err);
      }
      return;
    }
    this.callback(null, result.code, castSourceMap(result.sourceMap));
  }, err => this.callback(err));
}
//# sourceMappingURL=index.js.map