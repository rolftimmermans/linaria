"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _path = _interopRequireDefault(require("path"));
var _babelPreset = require("@linaria/babel-preset");
var _logger = require("@linaria/logger");
var _cache = require("./cache");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * This file contains a Webpack loader for Linaria.
 * It uses the transform.ts function to generate class names from source code,
 * returns transformed code without template literals and attaches generated source maps
 */

const outputCssLoader = require.resolve('./outputCssLoader');
const webpack5Loader = function webpack5LoaderPlugin(content, inputSourceMap) {
  function convertSourceMap(value, filename) {
    var _value$file, _value$mappings, _value$names, _value$sources, _value$version;
    if (typeof value === 'string' || !value) {
      return undefined;
    }
    return {
      ...value,
      file: (_value$file = value.file) !== null && _value$file !== void 0 ? _value$file : filename,
      mappings: (_value$mappings = value.mappings) !== null && _value$mappings !== void 0 ? _value$mappings : '',
      names: (_value$names = value.names) !== null && _value$names !== void 0 ? _value$names : [],
      sources: (_value$sources = value.sources) !== null && _value$sources !== void 0 ? _value$sources : [],
      version: (_value$version = value.version) !== null && _value$version !== void 0 ? _value$version : 3
    };
  }

  // tell Webpack this loader is async
  this.async();
  (0, _logger.debug)('loader', this.resourcePath);
  const {
    sourceMap = undefined,
    preprocessor = undefined,
    extension = '.linaria.css',
    cacheProvider,
    ...rest
  } = this.getOptions() || {};
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
    inputSourceMap: convertSourceMap(inputSourceMap, this.resourcePath),
    pluginOptions: rest,
    preprocessor
  }, asyncResolve).then(async result => {
    var _result$sourceMap2;
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
        var _cacheInstance$setDep, _result$sourceMap;
        const cacheInstance = await (0, _cache.getCacheInstance)(cacheProvider);
        await cacheInstance.set(this.resourcePath, cssText);
        await ((_cacheInstance$setDep = cacheInstance.setDependencies) === null || _cacheInstance$setDep === void 0 ? void 0 : _cacheInstance$setDep.call(cacheInstance, this.resourcePath, this.getDependencies()));
        const request = `${outputFileName}!=!${outputCssLoader}?cacheProvider=${encodeURIComponent(typeof cacheProvider === 'string' ? cacheProvider : '')}!${this.resourcePath}`;
        const stringifiedRequest = JSON.stringify(this.utils.contextify(this.context || this.rootContext, request));
        this.callback(null, `${result.code}\n\nrequire(${stringifiedRequest});`, (_result$sourceMap = result.sourceMap) !== null && _result$sourceMap !== void 0 ? _result$sourceMap : undefined);
      } catch (err) {
        this.callback(err);
      }
      return;
    }
    this.callback(null, result.code, (_result$sourceMap2 = result.sourceMap) !== null && _result$sourceMap2 !== void 0 ? _result$sourceMap2 : undefined);
  }, err => this.callback(err));
};
var _default = webpack5Loader;
exports.default = _default;
//# sourceMappingURL=index.js.map