"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getFileIdx;
let nextIdx = 1;
const processed = new Map();
function getFileIdx(name) {
  if (!processed.has(name)) {
    // eslint-disable-next-line no-plusplus
    processed.set(name, nextIdx++);
  }
  return processed.get(name);
}
//# sourceMappingURL=getFileIdx.js.map