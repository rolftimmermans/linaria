"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.memoryCache = exports.getCacheInstance = void 0;
// memory cache, which is the default cache implementation in Linaria

class MemoryCache {
  cache = new Map();
  dependenciesCache = new Map();
  get(key) {
    var _this$cache$get;
    return Promise.resolve((_this$cache$get = this.cache.get(key)) !== null && _this$cache$get !== void 0 ? _this$cache$get : '');
  }
  set(key, value) {
    this.cache.set(key, value);
    return Promise.resolve();
  }
  getDependencies(key) {
    var _this$dependenciesCac;
    return Promise.resolve((_this$dependenciesCac = this.dependenciesCache.get(key)) !== null && _this$dependenciesCac !== void 0 ? _this$dependenciesCac : []);
  }
  setDependencies(key, value) {
    this.dependenciesCache.set(key, value);
    return Promise.resolve();
  }
}
const memoryCache = new MemoryCache();

/**
 * return cache instance from `options.cacheProvider`
 * @param cacheProvider string | ICache | undefined
 * @returns ICache instance
 */
exports.memoryCache = memoryCache;
const getCacheInstance = async cacheProvider => {
  if (!cacheProvider) {
    return memoryCache;
  }
  if (typeof cacheProvider === 'string') {
    return require(cacheProvider);
  }
  if (typeof cacheProvider === 'object' && 'get' in cacheProvider && 'set' in cacheProvider) {
    return cacheProvider;
  }
  throw new Error(`Invalid cache provider: ${cacheProvider}`);
};
exports.getCacheInstance = getCacheInstance;
//# sourceMappingURL=cache.js.map