const getLine = (sourceAsString, indexAfterExpression) => {
  const begginningOfLineIndex = sourceAsString.lastIndexOf('\n', indexAfterExpression) || 0;
  const endOfLineIndex = sourceAsString.indexOf('\n', indexAfterExpression - 1) || Infinity;
  const indexAfterExpressionInLine = indexAfterExpression - begginningOfLineIndex;
  return {
    line: sourceAsString.substring(begginningOfLineIndex, endOfLineIndex + 1),
    indexAfterExpressionInLine
  };
};
const isSelector = (sourceAsString, indexAfterExpression) => {
  const {
    line
  } = getLine(sourceAsString, indexAfterExpression);
  const isSingleLineRule = line.indexOf('{', indexAfterExpression) > 0 && line.indexOf('}', indexAfterExpression) > 0;
  return isSingleLineRule || line[line.length - 2] === '{';
};
const isProperty = (sourceAsString, indexAfterExpression) => {
  return sourceAsString[indexAfterExpression] === ':';
};

// no ':' or '{' on the line
const isRuleSet = (sourceAsString, indexAfterExpression) => {
  const {
    line: possibleRuleset,
    indexAfterExpressionInLine
  } = getLine(sourceAsString, indexAfterExpression);
  const hasCurlyBraceAfterExpression = possibleRuleset.indexOf('{', indexAfterExpressionInLine) > 0;
  const hasCommmaAfterExpression = possibleRuleset.indexOf(',', indexAfterExpressionInLine) > 0;

  // check if possible ruleset has ':' and outside of the func args if expression has a func
  // i.e. avoid false postivive for `${func({ key: value })}
  const indexOfOpenParenthesis = possibleRuleset.indexOf('(');
  const indexOfClosedParenthesis = possibleRuleset.indexOf(')');
  const hasFuncInExpression = indexOfOpenParenthesis > 0 && indexOfClosedParenthesis > 0;
  let hasColonOutsideOfExpression = possibleRuleset.includes(':');
  if (hasFuncInExpression) {
    hasColonOutsideOfExpression = possibleRuleset.lastIndexOf(':', indexOfOpenParenthesis) > 0 && possibleRuleset.indexOf(':', indexOfClosedParenthesis) > 0;
  }
  return !(hasColonOutsideOfExpression || hasCurlyBraceAfterExpression || hasCommmaAfterExpression);
};
export const placeholderText = 'pcss-lin';
export const createPlaceholder = (i, sourceAsString, indexAfterExpression) => {
  if (isSelector(sourceAsString, indexAfterExpression)) {
    return `.${placeholderText}${i}`;
  }
  if (isProperty(sourceAsString, indexAfterExpression)) {
    return `--${placeholderText}${i}`;
  }
  if (isRuleSet(sourceAsString, indexAfterExpression)) {
    return `/* ${placeholderText}:${i} */`;
  }

  // assume it's a property value or part of another string;
  return `${placeholderText}${i}`;
};
//# sourceMappingURL=util.js.map