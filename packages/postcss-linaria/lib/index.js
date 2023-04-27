"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
Object.defineProperty(exports, "parse", {
  enumerable: true,
  get: function () {
    return _parse.parse;
  }
});
Object.defineProperty(exports, "stringify", {
  enumerable: true,
  get: function () {
    return _stringify.stringify;
  }
});
var _parse = require("./parse");
var _stringify = require("./stringify");
var _default = {
  parse: _parse.parse,
  stringify: _stringify.stringify
};
exports.default = _default;
//# sourceMappingURL=index.js.map