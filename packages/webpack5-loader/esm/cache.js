// memory cache, which is the default cache implementation in Linaria

class MemoryCache {
  cache = new Map();
  dependenciesCache = new Map();
  get(key) {
    return Promise.resolve(this.cache.get(key) ?? '');
  }
  set(key, value) {
    this.cache.set(key, value);
    return Promise.resolve();
  }
  getDependencies(key) {
    return Promise.resolve(this.dependenciesCache.get(key) ?? []);
  }
  setDependencies(key, value) {
    this.dependenciesCache.set(key, value);
    return Promise.resolve();
  }
}
export const memoryCache = new MemoryCache();

/**
 * return cache instance from `options.cacheProvider`
 * @param cacheProvider string | ICache | undefined
 * @returns ICache instance
 */
export const getCacheInstance = async cacheProvider => {
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
//# sourceMappingURL=cache.js.map