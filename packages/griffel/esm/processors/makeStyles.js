/* eslint-disable class-methods-use-this */

import { resolveStyleRulesForSlots } from '@griffel/core';
import { BaseProcessor, validateParams } from '@linaria/tags';
export default class MakeStylesProcessor extends BaseProcessor {
  #cssClassMap;
  #cssRulesByBucket;
  #slotsExpName;
  constructor(params, ...args) {
    validateParams(params, ['callee', 'call'], 'Invalid usage of `makeStyles` tag');
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
    [this.#cssClassMap, this.#cssRulesByBucket] = resolveStyleRulesForSlots(slots);
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
//# sourceMappingURL=makeStyles.js.map