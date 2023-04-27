"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stringify = void 0;
var _stringifier = _interopRequireDefault(require("postcss/lib/stringifier"));
var _util = require("./util");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const substitutePlaceholders = (stringWithPlaceholders, expressions) => {
  if (!stringWithPlaceholders.includes(_util.placeholderText) || !expressions) {
    return stringWithPlaceholders;
  }
  const values = stringWithPlaceholders.split(' ');
  const temp = [];
  values.forEach(val => {
    let [, expressionIndexString] = val.split(_util.placeholderText);
    // if the val is 'pcss-lin10px', need to remove the px to get the placeholder number
    let suffix = '';
    while (Number.isNaN(Number(expressionIndexString)) && expressionIndexString && expressionIndexString.length > 0) {
      suffix = expressionIndexString[expressionIndexString.length - 1] + suffix;
      expressionIndexString = expressionIndexString.slice(0, expressionIndexString.length - 1);
    }
    const expressionIndex = Number(expressionIndexString);
    const expression = expressions && !Number.isNaN(expressionIndex) && expressions[expressionIndex];
    if (expression) {
      temp.push(expression + suffix);
    } else {
      temp.push(val);
    }
  });
  return temp.join(' ');
};

/**
 * Stringifies PostCSS nodes while taking interpolated expressions
 * into account.
 */
class LinariaStringifier extends _stringifier.default {
  /** @inheritdoc */
  constructor(builder) {
    const wrappedBuilder = (str, node, type) => {
      // We purposely ignore the root node since the only thing we should
      // be stringifying here is already JS (before/after raws) so likely
      // already contains backticks on purpose.
      //
      // Similarly, if there is no node, we're probably stringifying
      // pure JS which never contained any CSS. Or something really weird
      // we don't want to touch anyway.
      //
      // For everything else, we want to escape backticks.
      if (!node || (node === null || node === void 0 ? void 0 : node.type) === 'root') {
        builder(str, node, type);
      } else {
        builder(str.replace(/\\/g, '\\\\').replace(/`/g, '\\`'), node, type);
      }
    };
    super(wrappedBuilder);
  }

  /** @inheritdoc */
  comment(node) {
    const placeholderPattern = new RegExp(`^${_util.placeholderText}:\\d+$`);
    if (placeholderPattern.test(node.text)) {
      const [, expressionIndexString] = node.text.split(':');
      const expressionIndex = Number(expressionIndexString);
      const root = node.root();
      const expressionStrings = root.raws.linariaTemplateExpressions;
      if (expressionStrings && !Number.isNaN(expressionIndex)) {
        const expression = expressionStrings[expressionIndex];
        if (expression) {
          this.builder(expression, node);
          return;
        }
      }
    }
    super.comment(node);
  }
  decl(node, semicolon) {
    const between = this.raw(node, 'between', 'colon');
    let {
      prop
    } = node;
    const expressionStrings = node.root().raws.linariaTemplateExpressions;
    if (prop.includes(_util.placeholderText)) {
      prop = substitutePlaceholders(prop, expressionStrings);
    }
    let value = this.rawValue(node, 'value');
    if (value.includes(_util.placeholderText)) {
      value = substitutePlaceholders(value, expressionStrings);
    }
    let string = prop + between + value;
    if (node.important) {
      string += node.raws.important || ' !important';
    }
    if (semicolon) string += ';';
    this.builder(string, node);
  }

  /** @inheritdoc */
  document(node) {
    if (node.nodes.length === 0) {
      var _node$source$input$cs, _node$source;
      this.builder((_node$source$input$cs = (_node$source = node.source) === null || _node$source === void 0 ? void 0 : _node$source.input.css) !== null && _node$source$input$cs !== void 0 ? _node$source$input$cs : '');
    } else {
      super.document(node);
    }
  }

  /** @inheritdoc */
  root(node) {
    var _node$raws$codeBefore, _node$raws$linariaAft, _node$raws$codeAfter;
    this.builder((_node$raws$codeBefore = node.raws.codeBefore) !== null && _node$raws$codeBefore !== void 0 ? _node$raws$codeBefore : '', node, 'start');
    this.body(node);

    // Here we want to recover any previously removed JS indentation
    // if possible. Otherwise, we use the `after` string as-is.
    const after = (_node$raws$linariaAft = node.raws.linariaAfter) !== null && _node$raws$linariaAft !== void 0 ? _node$raws$linariaAft : node.raws.after;
    if (after) {
      this.builder(after);
    }
    this.builder((_node$raws$codeAfter = node.raws.codeAfter) !== null && _node$raws$codeAfter !== void 0 ? _node$raws$codeAfter : '', node, 'end');
  }
  rule(node) {
    let value = this.rawValue(node, 'selector');
    if (value.includes(_util.placeholderText)) {
      const expressionStrings = node.root().raws.linariaTemplateExpressions;
      value = substitutePlaceholders(value, expressionStrings);
    }
    this.block(node, value);
    if (node.raws.ownSemicolon) {
      this.builder(node.raws.ownSemicolon, node, 'end');
    }
  }

  /** @inheritdoc */
  raw(node, own, detect) {
    if (own === 'before' && node.raws.before && node.raws.linariaBefore) {
      return node.raws.linariaBefore;
    }
    if (own === 'after' && node.raws.after && node.raws.linariaAfter) {
      return node.raws.linariaAfter;
    }
    if (own === 'between' && node.raws.between && node.raws.linariaBetween) {
      return node.raws.linariaBetween;
    }
    return super.raw(node, own, detect);
  }

  /** @inheritdoc */
  rawValue(node, prop) {
    var _prop$;
    const linariaProp = `linaria${(_prop$ = prop[0]) === null || _prop$ === void 0 ? void 0 : _prop$.toUpperCase()}${prop.slice(1)}`;
    if (Object.prototype.hasOwnProperty.call(node.raws, linariaProp)) {
      return `${node.raws[linariaProp]}`;
    }
    return super.rawValue(node, prop);
  }
}
const stringify = (node, builder) => {
  const str = new LinariaStringifier(builder);
  str.stringify(node);
};
exports.stringify = stringify;
//# sourceMappingURL=stringify.js.map