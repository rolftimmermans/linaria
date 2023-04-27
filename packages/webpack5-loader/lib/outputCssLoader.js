"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = outputCssLoader;
var _cache = require("./cache");
async function outputCssLoader() {
  this.async();
  const {
    cacheProvider
  } = this.getOptions();
  try {
    var _await$cacheInstance$, _cacheInstance$getDep;
    const cacheInstance = await (0, _cache.getCacheInstance)(cacheProvider);
    const result = await cacheInstance.get(this.resourcePath);
    const dependencies = (_await$cacheInstance$ = await ((_cacheInstance$getDep = cacheInstance.getDependencies) === null || _cacheInstance$getDep === void 0 ? void 0 : _cacheInstance$getDep.call(cacheInstance, this.resourcePath))) !== null && _await$cacheInstance$ !== void 0 ? _await$cacheInstance$ : [];
    dependencies.forEach(dependency => {
      this.addDependency(dependency);
    });
    this.callback(null, result);
  } catch (err) {
    this.callback(err);
  }
}
//# sourceMappingURL=outputCssLoader.js.map