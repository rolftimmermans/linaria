"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _generator = _interopRequireDefault(require("@babel/generator"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const getSource = (path, force = false) => {
  var _path$node$extra;
  if (path.isIdentifier()) {
    // Fast-lane for identifiers
    return path.node.name;
  }
  let source;
  try {
    source = force ? undefined : path.getSource();
    // eslint-disable-next-line no-empty
  } catch {}
  source = source || (0, _generator.default)(path.node).code;
  return (_path$node$extra = path.node.extra) !== null && _path$node$extra !== void 0 && _path$node$extra.parenthesized ? `(${source})` : source;
};
var _default = getSource;
exports.default = _default;
//# sourceMappingURL=getSource.js.map