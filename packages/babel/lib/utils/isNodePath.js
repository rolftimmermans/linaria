"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isNodePath;
function isNodePath(obj) {
  return 'node' in obj && (obj === null || obj === void 0 ? void 0 : obj.node) !== undefined;
}
//# sourceMappingURL=isNodePath.js.map