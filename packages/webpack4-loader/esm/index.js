/**
 * This file contains a Webpack loader for Linaria.
 * It uses the transform.ts function to generate class names from source code,
 * returns transformed code without template literals and attaches generated source maps
 */

import path from 'path';
import loaderUtils from 'loader-utils';
import { transform } from '@linaria/babel-preset';
import { debug } from '@linaria/logger';
import { getCacheInstance } from './cache';
const castSourceMap = sourceMap => sourceMap ? {
  ...sourceMap,
  version: sourceMap.version.toString()
} : undefined;
const outputCssLoader = require.resolve('./outputCssLoader');
export default function webpack4Loader(content, inputSourceMap) {
  // tell Webpack this loader is async
  this.async();
  debug('loader', this.resourcePath);
  const {
    sourceMap = undefined,
    preprocessor = undefined,
    extension = '.linaria.css',
    cacheProvider,
    ...rest
  } = loaderUtils.getOptions(this) || {};
  const outputFileName = this.resourcePath.replace(/\.[^.]+$/, extension);
  const asyncResolve = (token, importer) => {
    const context = path.isAbsolute(importer) ? path.dirname(importer) : path.join(process.cwd(), path.dirname(importer));
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
  transform(content.toString(), {
    filename: this.resourcePath,
    inputSourceMap: inputSourceMap ?? undefined,
    pluginOptions: rest,
    preprocessor
  }, asyncResolve).then(async result => {
    if (result.cssText) {
      let {
        cssText
      } = result;
      if (sourceMap) {
        cssText += `/*# sourceMappingURL=data:application/json;base64,${Buffer.from(result.cssSourceMapText || '').toString('base64')}*/`;
      }
      await Promise.all(result.dependencies?.map(dep => asyncResolve(dep, this.resourcePath)) ?? []);
      try {
        const cacheInstance = await getCacheInstance(cacheProvider);
        await cacheInstance.set(this.resourcePath, cssText);
        await cacheInstance.setDependencies?.(this.resourcePath, this.getDependencies());
        const request = `${outputFileName}!=!${outputCssLoader}?cacheProvider=${encodeURIComponent(cacheProvider ?? '')}!${this.resourcePath}`;
        const stringifiedRequest = loaderUtils.stringifyRequest(this, request);
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