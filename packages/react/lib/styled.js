"use strict";

exports.__esModule = true;
exports.omit = exports.default = void 0;
var _isPropValid = _interopRequireDefault(require("@emotion/is-prop-valid"));
var _react = _interopRequireDefault(require("react"));
var _core = require("@linaria/core");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This file contains an runtime version of `styled` component. Responsibilities of the component are:
 * - returns ReactElement based on HTML tag used with `styled` or custom React Component
 * - injects classNames for the returned component
 * - injects CSS variables used to define dynamic styles based on props
 */

const isCapital = ch => ch.toUpperCase() === ch;
const filterKey = keys => key => keys.indexOf(key) === -1;
const omit = (obj, keys) => {
  const res = {};
  Object.keys(obj).filter(filterKey(keys)).forEach(key => {
    res[key] = obj[key];
  });
  return res;
};
exports.omit = omit;
function filterProps(asIs, props, omitKeys) {
  const filteredProps = omit(props, omitKeys);
  if (!asIs) {
    /**
     * A failsafe check for esModule import issues
     * if validAttr !== 'function' then it is an object of { default: Fn }
     */
    const interopValidAttr = typeof _isPropValid.default === 'function' ? {
      default: _isPropValid.default
    } : _isPropValid.default;
    Object.keys(filteredProps).forEach(key => {
      if (!interopValidAttr.default(key)) {
        // Don't pass through invalid attributes to HTML elements
        delete filteredProps[key];
      }
    });
  }
  return filteredProps;
}
const warnIfInvalid = (value, componentName) => {
  if (process.env.NODE_ENV !== 'production') {
    if (typeof value === 'string' ||
    // eslint-disable-next-line no-self-compare,no-restricted-globals
    typeof value === 'number' && isFinite(value)) {
      return;
    }
    const stringified = typeof value === 'object' ? JSON.stringify(value) : String(value);

    // eslint-disable-next-line no-console
    console.warn("An interpolation evaluated to '" + stringified + "' in the component '" + componentName + "', which is probably a mistake. You should explicitly cast or transform the value to a string.");
  }
};
let idx = 0;

// Components with props are not allowed

function styled(tag) {
  var _tag$__linaria;
  // eslint-disable-next-line no-plusplus
  let mockedClass = "mocked-styled-" + idx++;
  if (tag != null && (_tag$__linaria = tag.__linaria) != null && _tag$__linaria.className) {
    mockedClass += " " + tag.__linaria.className;
  }
  return options => {
    var _options$class;
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      if (Array.isArray(options)) {
        // We received a strings array since it's used as a tag
        throw new Error('Using the "styled" tag in runtime is not supported. Make sure you have set up the Babel plugin correctly. See https://github.com/callstack/linaria#setup');
      }
    }
    const render = (props, ref) => {
      const {
        as: component = tag,
        class: className = mockedClass
      } = props;
      const shouldKeepProps = options.propsAsIs === undefined ? !(typeof component === 'string' && component.indexOf('-') === -1 && !isCapital(component[0])) : options.propsAsIs;
      const filteredProps = filterProps(shouldKeepProps, props, ['as', 'class']);
      filteredProps.ref = ref;
      filteredProps.className = options.atomic ? (0, _core.cx)(options.class, filteredProps.className || className) : (0, _core.cx)(filteredProps.className || className, options.class);
      const {
        vars
      } = options;
      if (vars) {
        const style = {};

        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        for (const name in vars) {
          const variable = vars[name];
          const result = variable[0];
          const unit = variable[1] || '';
          const value = typeof result === 'function' ? result(props) : result;
          warnIfInvalid(value, options.name);
          style["--" + name] = "" + value + unit;
        }
        const ownStyle = filteredProps.style || {};
        const keys = Object.keys(ownStyle);
        if (keys.length > 0) {
          keys.forEach(key => {
            style[key] = ownStyle[key];
          });
        }
        filteredProps.style = style;
      }
      if (tag.__linaria && tag !== component) {
        // If the underlying tag is a styled component, forward the `as` prop
        // Otherwise the styles from the underlying component will be ignored
        filteredProps.as = component;
        return /*#__PURE__*/_react.default.createElement(tag, filteredProps);
      }
      return /*#__PURE__*/_react.default.createElement(component, filteredProps);
    };
    const Result = _react.default.forwardRef ? /*#__PURE__*/_react.default.forwardRef(render) :
    // React.forwardRef won't available on older React versions and in Preact
    // Fallback to a innerRef prop in that case
    props => {
      const rest = omit(props, ['innerRef']);
      return render(rest, props.innerRef);
    };
    Result.displayName = options.name;

    // These properties will be read by the babel plugin for interpolation
    Result.__linaria = {
      className: (_options$class = options.class) != null ? _options$class : mockedClass,
      extends: tag
    };
    return Result;
  };
}
var _default = process.env.NODE_ENV !== 'production' ? new Proxy(styled, {
  get(o, prop) {
    return o(prop);
  }
}) : styled;
exports.default = _default;