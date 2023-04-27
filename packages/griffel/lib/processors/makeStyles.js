"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _core = require("@griffel/core");
var _tags = require("@linaria/tags");
/* eslint-disable class-methods-use-this */

class MakeStylesProcessor extends _tags.BaseProcessor {
  #cssClassMap;
  #cssRulesByBucket;
  #slotsExpName;
  constructor(params, ...args) {
    (0, _tags.validateParams)(params, ['callee', 'call'], 'Invalid usage of `makeStyles` tag');
    const [callee, callParam] = params;
    super([callee], ...args);
    const {
      ex
    } = callParam[1];
    if (ex.type === 'Identifier') {
      this.#slotsExpName = ex.name;
    } else if (ex.type === 'NullLiteral') {
      this.#slotsExpName = null;
    } else {
      this.#slotsExpName = ex.value;
    }
  }
  get asSelector() {
    throw new Error('The result of makeStyles cannot be used as a selector.');
  }
  build(valueCache) {
    const slots = valueCache.get(this.#slotsExpName);
    [this.#cssClassMap, this.#cssRulesByBucket] = (0, _core.resolveStyleRulesForSlots)(slots);
  }
  doEvaltimeReplacement() {
    this.replacer(this.value, false);
  }
  doRuntimeReplacement() {
    if (!this.#cssClassMap || !this.#cssRulesByBucket) {
      throw new Error('Styles are not extracted yet. Please call `build` first.');
    }
    const t = this.astService;
    const importedStyles = t.addNamedImport('__styles', '@griffel/react');
    const cssClassMap = t.objectExpression(Object.entries(this.#cssClassMap).map(([slot, classesMap]) => {
      return t.objectProperty(t.identifier(slot), t.objectExpression(Object.entries(classesMap).map(([className, classValue]) => t.objectProperty(t.identifier(className), Array.isArray(classValue) ? t.arrayExpression(classValue.map(i => t.stringLiteral(i))) : t.stringLiteral(classValue)))));
    }));
    const cssRulesByBucket = t.objectExpression(Object.entries(this.#cssRulesByBucket).map(([bucket, rules]) => {
      return t.objectProperty(t.identifier(bucket), t.arrayExpression(
      // FIXME: rule can be [string, Record<string, unknown>]
      rules.map(rule => t.stringLiteral(rule))));
    }));
    const stylesCall = t.callExpression(importedStyles, [cssClassMap, cssRulesByBucket]);
    this.replacer(stylesCall, true);
  }
  get value() {
    return this.astService.nullLiteral();
  }
  toString() {
    return `${super.toString()}(…)`;
  }
}
exports.default = MakeStylesProcessor;
//# sourceMappingURL=makeStyles.js.map