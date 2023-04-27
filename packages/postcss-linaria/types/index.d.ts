import { parse } from './parse';
import { stringify } from './stringify';
export { parse, stringify };
declare const _default: {
    parse: import("postcss").Parser<import("postcss").Root | import("postcss").Document>;
    stringify: import("postcss").Stringifier;
};
export default _default;
