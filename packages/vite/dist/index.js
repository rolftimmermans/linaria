"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => linaria
});
module.exports = __toCommonJS(src_exports);
var import_path = __toESM(require("path"));
var import_pluginutils = require("@rollup/pluginutils");
var import_babel_preset = require("@linaria/babel-preset");
var import_logger = require("@linaria/logger");
var import_utils = require("@linaria/utils");
function linaria({
  include,
  exclude,
  sourceMap,
  preprocessor,
  ...rest
} = {}) {
  const filter = (0, import_pluginutils.createFilter)(include, exclude);
  const cssLookup = {};
  let config;
  let devServer;
  const targets = [];
  const cache = new import_babel_preset.TransformCacheCollection();
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
      const log = (0, import_logger.createCustomDebug)("rollup", (0, import_utils.getFileIdx)(id));
      log("rollup-init", id);
      const asyncResolve = async (what, importer, stack) => {
        const resolved = await this.resolve(what, importer);
        if (resolved) {
          if (resolved.external) {
            const resolvedId2 = (0, import_utils.syncResolve)(what, importer, stack);
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
      const result = await (0, import_babel_preset.transform)(
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
      const slug = (0, import_babel_preset.slugify)(cssText);
      const cssFilename = import_path.default.normalize(
        `${id.replace(/\.[jt]sx?$/, "")}_${slug}.css`
      );
      const cssRelativePath = import_path.default.relative(config.root, cssFilename).replace(/\\/g, import_path.default.posix.sep);
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
        const module2 = devServer.moduleGraph.getModuleById(cssId);
        if (module2) {
          devServer.moduleGraph.invalidateModule(module2);
          module2.lastHMRTimestamp = module2.lastInvalidationTimestamp || Date.now();
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=index.js.map