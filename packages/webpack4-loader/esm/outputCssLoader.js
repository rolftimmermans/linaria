import loaderUtils from 'loader-utils';
import { getCacheInstance } from './cache';
export default async function outputCssLoader() {
  this.async();
  const {
    cacheProvider
  } = loaderUtils.getOptions(this) || {};
  try {
    const cacheInstance = await getCacheInstance(cacheProvider);
    const result = await cacheInstance.get(this.resourcePath);
    const dependencies = (await cacheInstance.getDependencies?.(this.resourcePath)) ?? [];
    dependencies.forEach(dependency => {
      this.addDependency(dependency);
    });
    this.callback(null, result);
  } catch (err) {
    this.callback(err);
  }
}
//# sourceMappingURL=outputCssLoader.js.map