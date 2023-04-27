"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = collect;
var _postcss = _interopRequireDefault(require("postcss"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Used to escape `RegExp`
 * [syntax characters](https://262.ecma-international.org/7.0/#sec-regular-expressions-patterns).
 */
function escapeRegex(string) {
  return string.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}
const extractClassesFromHtml = (html, ignoredClasses) => {
  const htmlClasses = [];
  const regex = /\s+class="([^"]+)"/gm;
  let match = regex.exec(html);
  const ignoredClassesDeduped = new Set(ignoredClasses);
  while (match !== null) {
    match[1].split(' ').forEach(className => {
      // eslint-disable-next-line no-param-reassign
      className = escapeRegex(className);
      if (className !== '' && !ignoredClassesDeduped.has(className)) {
        htmlClasses.push(className);
      }
    });
    match = regex.exec(html);
  }
  return new RegExp(htmlClasses.join('|'), 'gm');
};

/**
 * This utility extracts critical CSS from given HTML and CSS file to be used in SSR environments
 * @param {string} html the HTML from which classes will be parsed
 * @param {string} css the CSS file from which selectors will be parsed and determined as critical or other
 * @param {string[]} ignoredClasses classes that, when present in the HTML, will not be included in the regular expression used to match selectors
 * @param {string[]} blockedClasses classes that, when contained in a selector, will cause the selector to be marked as not critical
 * @returns {CollectResult} object containing the critical and other CSS styles
 */
function collect(html, css, classnameModifiers) {
  var _classnameModifiers$i, _classnameModifiers$b;
  const animations = new Set();
  const other = _postcss.default.root();
  const critical = _postcss.default.root();
  const stylesheet = _postcss.default.parse(css);
  const ignoredClasses = (_classnameModifiers$i = classnameModifiers === null || classnameModifiers === void 0 ? void 0 : classnameModifiers.ignoredClasses) !== null && _classnameModifiers$i !== void 0 ? _classnameModifiers$i : [];
  const blockedClasses = (_classnameModifiers$b = classnameModifiers === null || classnameModifiers === void 0 ? void 0 : classnameModifiers.blockedClasses) !== null && _classnameModifiers$b !== void 0 ? _classnameModifiers$b : [];
  const htmlClassesRegExp = extractClassesFromHtml(html, ignoredClasses);
  const blockedClassesSanitized = blockedClasses.map(escapeRegex);
  const blockedClassesRegExp = new RegExp(blockedClassesSanitized.join('|'), 'gm');
  const isCritical = rule => {
    // Only check class names selectors
    if ('selector' in rule && rule.selector.startsWith('.')) {
      const isExcluded = blockedClasses.length > 0 && blockedClassesRegExp.test(rule.selector);
      if (isExcluded) return false;
      return Boolean(rule.selector.match(htmlClassesRegExp));
    }
    return true;
  };
  const handleAtRule = rule => {
    if (rule.name === 'keyframes') {
      return;
    }
    const criticalRule = rule.clone();
    const otherRule = rule.clone();
    let removedNodesFromOther = 0;
    criticalRule.each((childRule, index) => {
      if (isCritical(childRule)) {
        var _otherRule$nodes;
        (_otherRule$nodes = otherRule.nodes[index - removedNodesFromOther]) === null || _otherRule$nodes === void 0 ? void 0 : _otherRule$nodes.remove();
        removedNodesFromOther += 1;
      } else {
        childRule.remove();
      }
    });
    rule.remove();
    if (criticalRule.nodes.length > 0) {
      critical.append(criticalRule);
    }
    if (otherRule.nodes.length > 0) {
      other.append(otherRule);
    }
  };
  stylesheet.walkAtRules('font-face', rule => {
    var _rule$parent;
    /**
     * @font-face rules may be defined also in CSS conditional groups (eg. @media)
     * we want only handle those from top-level, rest will be handled in stylesheet.walkRules
     */
    if (((_rule$parent = rule.parent) === null || _rule$parent === void 0 ? void 0 : _rule$parent.type) === 'root') {
      critical.append(rule);
    }
  });
  const walkedAtRules = new Set();
  stylesheet.walkRules(rule => {
    var _rule$parent2;
    if (rule.parent && 'name' in rule.parent && rule.parent.name === 'keyframes') {
      return;
    }
    if (((_rule$parent2 = rule.parent) === null || _rule$parent2 === void 0 ? void 0 : _rule$parent2.type) === 'atrule') {
      if (!walkedAtRules.has(rule.parent)) {
        handleAtRule(rule.parent);
        walkedAtRules.add(rule.parent);
      }
      return;
    }
    if (isCritical(rule)) {
      critical.append(rule);
    } else {
      other.append(rule);
    }
  });
  critical.walkDecls(/animation/, decl => {
    animations.add(decl.value.split(' ')[0]);
  });
  stylesheet.walkAtRules('keyframes', rule => {
    if (animations.has(rule.params)) {
      critical.append(rule);
    }
  });
  return {
    critical: critical.toString(),
    other: other.toString()
  };
}
//# sourceMappingURL=collect.js.map