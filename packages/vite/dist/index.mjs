// src/index.ts
import path from "path";
import { createFilter } from "@rollup/pluginutils";
import {
  transform,
  slugify,
  TransformCacheCollection
} from "@linaria/babel-preset";
import { createCustomDebug } from "@linaria/logger";
import { getFileIdx, syncResolve } from "@linaria/utils";
function linaria({
  include,
  exclude,
  sourceMap,
  preprocessor,
  ...rest
} = {}) {
  const filter = createFilter(include, exclude);
  const cssLookup = {};
  let config;
  let devServer;
  const targets = [];
  const cache = new TransformCacheCollection();
  const { codeCache, evalCache } = cache;
  return {
    name: "linaria",
    enforce: "post",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    configureServer(_server) {
      devServer = _server;
    },
    load(url) {
      const [id] = url.split("?");
      return cssLookup[id];
    },
    resolveId(importeeUrl) {
      const [id, qsRaw] = importeeUrl.split("?");
      if (id in cssLookup) {
        if (qsRaw == null ? void 0 : qsRaw.length)
          return importeeUrl;
        return id;
      }
    },
    handleHotUpdate(ctx) {
      if (ctx.modules.length)
        return ctx.modules;
      const affected = targets.filter(
        (x) => x.dependencies.some((dep) => dep === ctx.file) || x.dependencies.some((dep) => ctx.modules.some((m) => m.file === dep))
      );
      const deps = affected.flatMap((target) => target.dependencies);
      for (const depId of deps) {
        codeCache.delete(depId);
        evalCache.delete(depId);
      }
      const modules = affected.map((target) => devServer.moduleGraph.getModuleById(target.id)).concat(ctx.modules).filter((m) => !!m);
      return modules;
    },
    async transform(code, url) {
      const [id] = url.split("?");
      if (url.includes("node_modules") || !filter(url) || id in cssLookup)
        return;
      const log = createCustomDebug("rollup", getFileIdx(id));
      log("rollup-init", id);
      const asyncResolve = async (what, importer, stack) => {
        const resolved = await this.resolve(what, importer);
        if (resolved) {
          if (resolved.external) {
            const resolvedId2 = syncResolve(what, importer, stack);
            log("resolve", "\u2705 '%s'@'%s -> %O\n%s", what, importer, resolved);
            return resolvedId2;
          }
          log("resolve", "\u2705 '%s'@'%s -> %O\n%s", what, importer, resolved);
          const resolvedId = resolved.id.split("?")[0];
          if (resolvedId.startsWith("\0")) {
            return null;
          }
          return resolvedId;
        }
        log("resolve", "\u274C '%s'@'%s", what, importer);
        throw new Error(`Could not resolve ${what}`);
      };
      const result = await transform(
        code,
        {
          filename: id,
          preprocessor,
          pluginOptions: rest
        },
        asyncResolve,
        {},
        cache
      );
      let { cssText, dependencies } = result;
      if (!cssText)
        return;
      dependencies ?? (dependencies = []);
      const slug = slugify(cssText);
      const cssFilename = path.normalize(
        `${id.replace(/\.[jt]sx?$/, "")}_${slug}.css`
      );
      const cssRelativePath = path.relative(config.root, cssFilename).replace(/\\/g, path.posix.sep);
      const cssId = `/${cssRelativePath}`;
      if (sourceMap && result.cssSourceMapText) {
        const map = Buffer.from(result.cssSourceMapText).toString("base64");
        cssText += `/*# sourceMappingURL=data:application/json;base64,${map}*/`;
      }
      cssLookup[cssFilename] = cssText;
      cssLookup[cssId] = cssText;
      result.code += `
import ${JSON.stringify(cssFilename)};
`;
      if (devServer == null ? void 0 : devServer.moduleGraph) {
        const module = devServer.moduleGraph.getModuleById(cssId);
        if (module) {
          devServer.moduleGraph.invalidateModule(module);
          module.lastHMRTimestamp = module.lastInvalidationTimestamp || Date.now();
        }
      }
      for (let i = 0, end = dependencies.length; i < end; i++) {
        const depModule = await this.resolve(dependencies[i], url, {
          isEntry: false
        });
        if (depModule)
          dependencies[i] = depModule.id;
      }
      const target = targets.find((t) => t.id === id);
      if (!target)
        targets.push({ id, dependencies });
      else
        target.dependencies = dependencies;
      return { code: result.code, map: result.sourceMap };
    }
  };
}
export {
  linaria as default
};
//# sourceMappingURL=index.mjs.map