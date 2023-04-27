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
import { styled } from "@linaria/react";
import { cx } from "@linaria/core";
export {
  css_default as css,
  cx,
  styled
};
//# sourceMappingURL=index.mjs.map