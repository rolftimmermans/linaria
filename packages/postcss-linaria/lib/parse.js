"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parse = void 0;
var _parser = require("@babel/parser");
var _traverse = _interopRequireDefault(require("@babel/traverse"));
var _postcss = require("postcss");
var _parse = _interopRequireDefault(require("postcss/lib/parse"));
var _locationCorrection = require("./locationCorrection");
var _util = require("./util");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// This function returns
// 1) styleText with placeholders for the expressions.
//    for example:
//      `${selector} { ${property} : ${value} }`
//    becomes
//      `.pcss-lin0 { --pcss-lin1: pcss-lin2 }`
// 2) an array of the expressions:
// ['${selector}', '${property}', '${value}']
const generateStyleTextWithExpressionPlaceholders = (node, sourceAsString) => {
  let styleText = '';
  const expressionStrings = [];
  for (let i = 0; i < node.quasi.quasis.length; i++) {
    const template = node.quasi.quasis[i];
    const expr = node.quasi.expressions[i];
    const nextTemplate = node.quasi.quasis[i + 1];
    if (template) {
      styleText += template.value.raw;
      if (expr && nextTemplate && nextTemplate.range && template.range) {
        const exprText = sourceAsString.slice(template.range[1], nextTemplate.range[0]);
        styleText += (0, _util.createPlaceholder)(i, sourceAsString, nextTemplate.range[0]);
        expressionStrings.push(exprText);
      }
    }
  }
  return {
    styleText,
    expressionStrings
  };
};
const getDeindentedStyleTextAndOffsets = (styleText, node) => {
  var _node$quasi$loc$end$c, _node$quasi$loc;
  const baseIndentation = ((_node$quasi$loc$end$c = (_node$quasi$loc = node.quasi.loc) === null || _node$quasi$loc === void 0 ? void 0 : _node$quasi$loc.end.column) !== null && _node$quasi$loc$end$c !== void 0 ? _node$quasi$loc$end$c : 1) - 1;
  const sourceLines = styleText.split('\n');
  const baseIndentations = new Map();
  const indentationPattern = new RegExp(`^[ \\t]{${baseIndentation}}`);
  const emptyLinePattern = /^[ \\t\r]*$/;
  const deindentedLines = [];
  const prefixOffsets = {
    lines: 0,
    offset: 0
  };

  // remove the first line if it's an empty string and update the prefix
  // offset to be the lines 1 instead of lines 0
  if (sourceLines.length > 1 && sourceLines[0] !== undefined && emptyLinePattern.test(sourceLines[0])) {
    prefixOffsets.lines = 1;
    prefixOffsets.offset = sourceLines[0].length + 1;
    sourceLines.shift();
  }

  // go through each source line and deindent lines
  for (let i = 0; i < sourceLines.length; i++) {
    const sourceLine = sourceLines[i];
    if (sourceLine !== undefined) {
      // if the sourceline has the indentation pattern
      if (indentationPattern.test(sourceLine)) {
        deindentedLines.push(sourceLine.replace(indentationPattern, ''));
        baseIndentations.set(i + 1, baseIndentation);
        // Roots don't have an end line, so we can't look this up so easily
        // later on. Having a special '-1' key helps here.
        if (i === sourceLines.length - 1) {
          baseIndentations.set(-1, baseIndentation);
        }
      } else {
        deindentedLines.push(sourceLine);
      }
    }
  }
  const deindentedStyleText = deindentedLines.join('\n');
  return {
    deindentedStyleText,
    prefixOffsets,
    baseIndentations
  };
};

/**
 * Parses CSS from within tagged template literals in a JavaScript document
 * @param {string} source Source code to parse
 * @param {*=} opts Options to pass to PostCSS' parser when parsing
 * @return {Root|Document}
 */
const parse = (source, opts) => {
  const doc = new _postcss.Document();
  const sourceAsString = source.toString();

  // avoid error spam (and vscode error toasts) if babel can't parse doc
  // allows user to type new code without constant warnings
  let ast;
  try {
    ast = (0, _parser.parse)(sourceAsString, {
      sourceType: 'unambiguous',
      plugins: ['typescript', 'jsx'],
      ranges: true
    });
  } catch {
    return doc;
  }
  const extractedStyles = new Set();
  (0, _traverse.default)(ast, {
    TaggedTemplateExpression: path => {
      if (path.node.tag.type === 'Identifier' && path.node.tag.name.includes('css')) {
        extractedStyles.add(path.node);
      }
      if (path.node.tag.type === 'MemberExpression') {
        if (path.node.tag.object.name === 'styled') {
          extractedStyles.add(path.node);
        }
      }
    }
  });
  let currentOffset = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const node of extractedStyles) {
    if (!node.quasi.range) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const startIndex = node.quasi.range[0] + 1;
    const {
      styleText,
      expressionStrings
    } = generateStyleTextWithExpressionPlaceholders(node, sourceAsString);
    const {
      deindentedStyleText,
      prefixOffsets,
      baseIndentations
    } = getDeindentedStyleTextAndOffsets(styleText, node);
    const root = (0, _parse.default)(deindentedStyleText, {
      ...opts,
      map: false
    });
    root.raws.linariaPrefixOffsets = prefixOffsets;
    root.raws.linariaTemplateExpressions = expressionStrings;
    root.raws.linariaBaseIndentations = baseIndentations;
    // TODO: remove this if stylelint/stylelint#5767 ever gets fixed,
    // or they drop the indentation rule. Their indentation rule depends on
    // `beforeStart` existing as they unsafely try to call `endsWith` on it.
    if (!root.raws.beforeStart) {
      root.raws.beforeStart = '';
    }
    root.raws.codeBefore = sourceAsString.slice(currentOffset, startIndex + prefixOffsets.offset);
    root.parent = doc;
    // TODO: stylelint relies on this existing, really unsure why.
    // it could just access root.parent to get the document...
    root.document = doc;
    const walker = (0, _locationCorrection.locationCorrectionWalker)(node, sourceAsString);
    walker(root);
    root.walk(walker);
    doc.nodes.push(root);
    currentOffset = node.quasi.range[1] - 1;
  }
  if (doc.nodes.length > 0) {
    const last = doc.nodes[doc.nodes.length - 1];
    if (last) {
      last.raws.codeAfter = sourceAsString.slice(currentOffset);
    }
  }
  doc.source = {
    input: new _postcss.Input(sourceAsString, opts),
    start: {
      line: 1,
      column: 1,
      offset: 0
    }
  };
  return doc;
};
exports.parse = parse;
//# sourceMappingURL=parse.js.map