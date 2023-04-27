// src/index.ts
import { createFilter } from "@rollup/pluginutils";
import {
  transform,
  slugify,
  TransformCacheCollection
} from "@linaria/babel-preset";
import { createCustomDebug } from "@linaria/logger";
import { getFileIdx, syncResolve } from "@linaria/utils";
import vitePlugin from "@linaria/vite";
function linaria({
  include,
  exclude,
  sourceMap,
  preprocessor,
  ...rest
} = {}) {
  const filter = createFilter(include, exclude);
  const cssLookup = {};
  const cache = new TransformCacheCollection();
  const plugin = {
    name: "linaria",
    load(id) {
      return cssLookup[id];
    },
    resolveId(importee) {
      if (importee in cssLookup)
        return importee;
    },
    async transform(code, id) {
      if (!filter(id) || id in cssLookup)
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
      if (!result.cssText)
        return;
      let { cssText } = result;
      const slug = slugify(cssText);
      const filename = `${id.replace(/\.[jt]sx?$/, "")}_${slug}.css`;
      if (sourceMap && result.cssSourceMapText) {
        const map = Buffer.from(result.cssSourceMapText).toString("base64");
        cssText += `/*# sourceMappingURL=data:application/json;base64,${map}*/`;
      }
      cssLookup[filename] = cssText;
      result.code += `
import ${JSON.stringify(filename)};
`;
      return { code: result.code, map: result.sourceMap };
    }
  };
  let vite;
  return new Proxy(plugin, {
    get(target, prop) {
      return (vite || target)[prop];
    },
    getOwnPropertyDescriptor(target, prop) {
      return Object.getOwnPropertyDescriptor(
        vite || target,
        prop
      );
    },
    ownKeys() {
      vite = vitePlugin({
        include,
        exclude,
        sourceMap,
        preprocessor,
        ...rest
      });
      vite = {
        ...vite,
        buildStart() {
          this.warn(
            "You are trying to use @linaria/rollup with Vite. The support for Vite in @linaria/rollup is deprecated and will be removed in the next major release. Please use @linaria/vite instead."
          );
        }
      };
      return Reflect.ownKeys(vite);
    }
  });
}
export {
  linaria as default
};
//# sourceMappingURL=index.mjs.map