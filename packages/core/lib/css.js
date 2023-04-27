"use strict";

exports.__esModule = true;
exports.default = void 0;
let idx = 0;
const css = () => {
  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line no-plusplus
    return "mocked-css-" + idx++;
  }
  throw new Error('Using the "css" tag in runtime is not supported. Make sure you have set up the Babel plugin correctly.');
};
var _default = css;
exports.default = _default;