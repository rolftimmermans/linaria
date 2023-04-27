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
var import_pluginutils = require("@rollup/pluginutils");
var import_babel_preset = require("@linaria/babel-preset");
var import_logger = require("@linaria/logger");
var import_utils = require("@linaria/utils");
var import_vite = __toESM(require("@linaria/vite"));
function linaria({
  include,
  exclude,
  sourceMap,
  preprocessor,
  ...rest
} = {}) {
  const filter = (0, import_pluginutils.createFilter)(include, exclude);
  const cssLookup = {};
  const cache = new import_babel_preset.TransformCacheCollection();
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
      if (!result.cssText)
        return;
      let { cssText } = result;
      const slug = (0, import_babel_preset.slugify)(cssText);
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
      vite = (0, import_vite.default)({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=index.js.map