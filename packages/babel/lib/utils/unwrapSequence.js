"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = unwrapSequence;
/**
 * If expression is a sequence like `(a, b, c)`, returns `c`
 * otherwise returns an original expression
 * @param path
 */
function unwrapSequence(path) {
  if (path.isSequenceExpression()) {
    const [...expressions] = path.get('expressions');
    const lastExpression = expressions.pop();
    return lastExpression ? unwrapSequence(lastExpression) : undefined;
  }
  return path;
}
//# sourceMappingURL=unwrapSequence.js.map