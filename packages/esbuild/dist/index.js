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
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_esbuild = require("esbuild");
var import_babel_preset = require("@linaria/babel-preset");
var nodeModulesRegex = /^(?:.*[\\/])?node_modules(?:[\\/].*)?$/;
function linaria({
  sourceMap,
  preprocessor,
  esbuildOptions,
  ...rest
} = {}) {
  let options = esbuildOptions;
  return {
    name: "linaria",
    setup(build) {
      const cssLookup = /* @__PURE__ */ new Map();
      const asyncResolve = async (token, importer) => {
        const context = import_path.default.isAbsolute(importer) ? import_path.default.dirname(importer) : import_path.default.join(process.cwd(), import_path.default.dirname(importer));
        const result = await build.resolve(token, {
          resolveDir: context
        });
        if (result.errors.length > 0) {
          throw new Error(`Cannot resolve ${token}`);
        }
        return result.path;
      };
      build.onResolve({ filter: /\.linaria\.css$/ }, (args) => {
        return {
          namespace: "linaria",
          path: args.path
        };
      });
      build.onLoad({ filter: /.*/, namespace: "linaria" }, (args) => {
        return {
          contents: cssLookup.get(args.path),
          loader: "css",
          resolveDir: import_path.default.basename(args.path)
        };
      });
      build.onLoad({ filter: /\.(js|jsx|ts|tsx)$/ }, async (args) => {
        const rawCode = import_fs.default.readFileSync(args.path, "utf8");
        const { ext, name: filename } = import_path.default.parse(args.path);
        const loader = ext.replace(/^\./, "");
        if (nodeModulesRegex.test(args.path)) {
          return {
            loader,
            contents: rawCode
          };
        }
        if (!options) {
          options = {};
          if ("jsxFactory" in build.initialOptions) {
            options.jsxFactory = build.initialOptions.jsxFactory;
          }
          if ("jsxFragment" in build.initialOptions) {
            options.jsxFragment = build.initialOptions.jsxFragment;
          }
        }
        const transformed = (0, import_esbuild.transformSync)(rawCode, {
          ...options,
          sourcefile: args.path,
          sourcemap: sourceMap,
          loader
        });
        let { code } = transformed;
        if (sourceMap) {
          const esbuildMap = Buffer.from(transformed.map).toString("base64");
          code += `/*# sourceMappingURL=data:application/json;base64,${esbuildMap}*/`;
        }
        const result = await (0, import_babel_preset.transform)(
          code,
          {
            filename: args.path,
            preprocessor,
            pluginOptions: rest
          },
          asyncResolve
        );
        if (!result.cssText) {
          return {
            contents: code,
            loader,
            resolveDir: import_path.default.dirname(args.path)
          };
        }
        let { cssText } = result;
        const slug = (0, import_babel_preset.slugify)(cssText);
        const cssFilename = `${filename}_${slug}.linaria.css`;
        let contents = `import ${JSON.stringify(cssFilename)}; ${result.code}`;
        if (sourceMap && result.cssSourceMapText) {
          const map = Buffer.from(result.cssSourceMapText).toString("base64");
          cssText += `/*# sourceMappingURL=data:application/json;base64,${map}*/`;
          const linariaMap = Buffer.from(
            JSON.stringify(result.sourceMap)
          ).toString("base64");
          contents += `/*# sourceMappingURL=data:application/json;base64,${linariaMap}*/`;
        }
        cssLookup.set(cssFilename, cssText);
        return {
          contents,
          loader,
          resolveDir: import_path.default.dirname(args.path)
        };
      });
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=index.js.map