"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _webpack4Loader = _interopRequireDefault(require("@linaria/webpack4-loader"));
var _webpack5Loader = _interopRequireDefault(require("@linaria/webpack5-loader"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function webpackLoader(...args) {
  if ('getOptions' in this) {
    // webpack v5
    _webpack5Loader.default.apply(this, args);
  } else {
    // webpack v4
    _webpack4Loader.default.apply(this, args);
  }
}
var _default = webpackLoader;
exports.default = _default;
//# sourceMappingURL=index.js.map