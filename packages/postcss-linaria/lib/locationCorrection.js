"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.locationCorrectionWalker = locationCorrectionWalker;
var _util = require("./util");
/* eslint-disable no-param-reassign */

const correctLocation = (node, loc, baseIndentations, sourceAsString, prefixOffsets) => {
  var _baseIndentations$get;
  if (!node.quasi.loc || !node.quasi.range) {
    return loc;
  }
  const baseIndentation = (_baseIndentations$get = baseIndentations === null || baseIndentations === void 0 ? void 0 : baseIndentations.get(loc.line)) !== null && _baseIndentations$get !== void 0 ? _baseIndentations$get : 0;
  const nodeLoc = node.quasi.loc;
  const nodeOffset = node.quasi.range[0];
  let lineOffset = nodeLoc.start.line - 1;
  let newOffset = loc.offset + nodeOffset + 1;
  let currentLine = 1;
  let columnOffset = nodeLoc.start.column + 1;
  if (prefixOffsets) {
    lineOffset += prefixOffsets.lines;
    newOffset += prefixOffsets.offset;
  }
  for (let i = 0; i < node.quasi.expressions.length; i++) {
    const expr = node.quasi.expressions[i];
    const previousQuasi = node.quasi.quasis[i];
    const nextQuasi = node.quasi.quasis[i + 1];
    if (expr && expr.loc && expr.range && nextQuasi && previousQuasi && previousQuasi.loc && nextQuasi.loc && previousQuasi.range && nextQuasi.range && previousQuasi.range[1] < newOffset) {
      const placeholderSize = (0, _util.createPlaceholder)(i, sourceAsString, nextQuasi.range[0]).length;
      const exprSize = nextQuasi.range[0] - previousQuasi.range[1] - placeholderSize;
      const exprStartLine = previousQuasi.loc.end.line;
      const exprEndLine = nextQuasi.loc.start.line;
      newOffset += exprSize;
      lineOffset += exprEndLine - exprStartLine;
      if (currentLine !== exprEndLine) {
        currentLine = exprEndLine;
        if (exprStartLine === exprEndLine) {
          columnOffset = exprSize;
        } else {
          columnOffset = nextQuasi.loc.start.column - previousQuasi.loc.end.column - placeholderSize;
        }
      } else {
        columnOffset += exprSize;
      }
    }
  }
  let indentationOffset = 0;
  if (baseIndentations) {
    for (let i = 1; i <= loc.line; i++) {
      var _baseIndentations$get2;
      indentationOffset += (_baseIndentations$get2 = baseIndentations.get(i)) !== null && _baseIndentations$get2 !== void 0 ? _baseIndentations$get2 : 0;
    }
  }
  loc.line += lineOffset;
  if (loc.line === currentLine) {
    loc.column += columnOffset;
  }
  loc.column += baseIndentation;
  loc.offset = newOffset + indentationOffset;
  return loc;
};

/**
 * Computes the re-indented string of a given string on a given line
 * @param {string} value Value to re-indent
 * @param {number} lineNumber Current line number of the value
 * @param {Map=} baseIndentations Indentation map
 * @return {string}
 */
function computeCorrectedString(value, lineNumber, baseIndentations) {
  if (!value.includes('\n')) {
    const baseIndentation = baseIndentations === null || baseIndentations === void 0 ? void 0 : baseIndentations.get(lineNumber);
    if (baseIndentation !== undefined) {
      return ' '.repeat(baseIndentation) + value;
    }
    return value;
  }
  const lines = value.split('\n');
  const rawLines = [];
  if (lines[0] !== undefined) {
    rawLines.push(lines[0]);
  }
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined) {
      const currentLineNumber = lineNumber + i;
      const baseIndentation = baseIndentations === null || baseIndentations === void 0 ? void 0 : baseIndentations.get(currentLineNumber);
      if (baseIndentation !== undefined) {
        rawLines.push(' '.repeat(baseIndentation) + line);
      } else {
        rawLines.push(line);
      }
    }
  }
  return rawLines.join('\n');
}

/**
 * Computes the re-indented value of a given node's raw value
 * @param {T} node Node to re-indent raw value of
 * @param {string} key Raw value key to re-indent
 * @param {Map=} baseIndentations Indentation map
 * @return {string|null}
 */
function computeCorrectedRawValue(node, key, baseIndentations) {
  var _node$source;
  const value = node[key];
  if (typeof value !== 'string' || !((_node$source = node.source) !== null && _node$source !== void 0 && _node$source.start)) {
    return null;
  }
  return computeCorrectedString(value, node.source.start.line, baseIndentations);
}

/**
 * Computes the before/after strings from the original source for
 * restoration later when stringifying.
 * @param {Document|Root|ChildNode} node Node to compute strings for
 * @param {Map} baseIndentations Map of base indentations by line
 * @return {void}
 */
function computeBeforeAfter(node, baseIndentations) {
  var _node$parent, _node$source2, _node$source3, _node$source5;
  if (node.raws.before && (node.raws.before.includes('\n') || ((_node$parent = node.parent) === null || _node$parent === void 0 ? void 0 : _node$parent.type) === 'root') && (_node$source2 = node.source) !== null && _node$source2 !== void 0 && _node$source2.start) {
    const numBeforeLines = node.raws.before.split('\n').length - 1;
    const corrected = computeCorrectedString(node.raws.before, node.source.start.line - numBeforeLines, baseIndentations);
    node.raws.linariaBefore = corrected;
  }
  if (node.raws.after && node.raws.after.includes('\n') && (node.type === 'root' || (_node$source3 = node.source) !== null && _node$source3 !== void 0 && _node$source3.end)) {
    var _node$nodes, _node$nodes$source, _node$nodes$source$en, _node$source4, _node$source4$end;
    const numAfterLines = node.raws.after.split('\n').length - 1;
    const line = node.type === 'root' ? (_node$nodes = node.nodes[node.nodes.length - 1]) === null || _node$nodes === void 0 ? void 0 : (_node$nodes$source = _node$nodes.source) === null || _node$nodes$source === void 0 ? void 0 : (_node$nodes$source$en = _node$nodes$source.end) === null || _node$nodes$source$en === void 0 ? void 0 : _node$nodes$source$en.line : (_node$source4 = node.source) === null || _node$source4 === void 0 ? void 0 : (_node$source4$end = _node$source4.end) === null || _node$source4$end === void 0 ? void 0 : _node$source4$end.line;
    if (line !== undefined) {
      const corrected = computeCorrectedString(node.raws.after, line - numAfterLines, baseIndentations);
      node.raws.linariaAfter = corrected;
    }
  }
  if (node.raws.between && node.raws.between.includes('\n') && (_node$source5 = node.source) !== null && _node$source5 !== void 0 && _node$source5.start) {
    const corrected = computeCorrectedString(node.raws.between, node.source.start.line, baseIndentations);
    node.raws.linariaBetween = corrected;
  }
  if (node.type === 'rule' && node.selector.includes('\n')) {
    const rawValue = computeCorrectedRawValue(node, 'selector', baseIndentations);
    if (rawValue !== null) {
      node.raws.linariaSelector = rawValue;
    }
  }
  if (node.type === 'decl' && node.value.includes('\n')) {
    const rawValue = computeCorrectedRawValue(node, 'value', baseIndentations);
    if (rawValue !== null) {
      node.raws.linariaValue = rawValue;
    }
  }
  if (node.type === 'atrule' && node.params.includes('\n')) {
    const rawValue = computeCorrectedRawValue(node, 'params', baseIndentations);
    if (rawValue !== null) {
      node.raws.linariaParams = rawValue;
    }
  }
}

/**
 * Creates an AST walker/visitor for correcting PostCSS AST locations to
 * those in the original JavaScript document.
 * @param {TaggedTemplateExpression} expr Expression the original source came
 * from
 * @return {Function}
 */
function locationCorrectionWalker(expr, sourceAsString) {
  return node => {
    var _node$source6, _node$source7;
    const root = node.root();
    const baseIndentations = root.raws.linariaBaseIndentations;
    if (baseIndentations) {
      computeBeforeAfter(node, baseIndentations);
    }
    if ((_node$source6 = node.source) !== null && _node$source6 !== void 0 && _node$source6.start) {
      node.source.start = correctLocation(expr, node.source.start, baseIndentations, sourceAsString, root.raws.linariaPrefixOffsets);
    }
    if ((_node$source7 = node.source) !== null && _node$source7 !== void 0 && _node$source7.end) {
      node.source.end = correctLocation(expr, node.source.end, baseIndentations, sourceAsString, root.raws.linariaPrefixOffsets);
    }
  };
}
//# sourceMappingURL=locationCorrection.js.map