"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  css: () => css_default,
  cx: () => import_core.cx,
  styled: () => import_react.styled
});
module.exports = __toCommonJS(src_exports);

// src/css.ts
var idx = 0;
var css = () => {
  if (process.env.NODE_ENV === "test") {
    return `mocked-atomic-css-${idx++}`;
  }
  throw new Error(
    'Using the "css" tag in runtime is not supported. Make sure you have set up the Babel plugin correctly.'
  );
};
var css_default = css;

// src/index.ts
var import_react = require("@linaria/react");
var import_core = require("@linaria/core");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  css,
  cx,
  styled
});
//# sourceMappingURL=index.js.map