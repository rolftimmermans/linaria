"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});

// src/processors/styled.ts
var styled_exports = {};
__export(styled_exports, {
  default: () => StyledProcessor
});
module.exports = __toCommonJS(styled_exports);
var import_react_html_attributes = __toESM(require("react-html-attributes"));
var import_tags = require("@linaria/tags");
var import_utils = require("@linaria/utils");
var isNotNull = (x) => x !== null;
var allTagsSet = /* @__PURE__ */ new Set([...import_react_html_attributes.default.elements.html, import_react_html_attributes.default.elements.svg]);
var singleQuotedStringLiteral = (value) => ({
  type: "StringLiteral",
  value,
  extra: {
    rawValue: value,
    raw: `'${value}'`
  }
});
var _variableIdx, _variablesCache;
var StyledProcessor = class extends import_tags.TaggedTemplateProcessor {
  constructor(params, ...args) {
    (0, import_tags.validateParams)(
      params,
      ["callee", "*", "..."],
      import_tags.TaggedTemplateProcessor.SKIP
    );
    (0, import_tags.validateParams)(
      params,
      ["callee", ["call", "member"], ["template", "call"]],
      "Invalid usage of `styled` tag"
    );
    const [tag, tagOp, template] = params;
    if (template[0] === "call") {
      throw import_tags.TaggedTemplateProcessor.SKIP;
    }
    super([tag, template], ...args);
    __publicField(this, "component");
    __privateAdd(this, _variableIdx, 0);
    __privateAdd(this, _variablesCache, /* @__PURE__ */ new Map());
    let component;
    if (tagOp[0] === "call" && tagOp.length === 2) {
      const value = tagOp[1];
      if (value.kind === import_tags.ValueType.FUNCTION) {
        component = "FunctionalComponent";
      } else if (value.kind === import_tags.ValueType.CONST) {
        component = typeof value.value === "string" ? value.value : void 0;
      } else {
        component = {
          node: value.ex,
          source: value.source
        };
        this.dependencies.push(value);
      }
    }
    if (tagOp[0] === "member") {
      [, component] = tagOp;
    }
    if (!component) {
      throw new Error("Invalid usage of `styled` tag");
    }
    this.component = component;
  }
  addInterpolation(node, precedingCss, source, unit = "") {
    const id = this.getVariableId(source, unit, precedingCss);
    this.interpolations.push({
      id,
      node,
      source,
      unit
    });
    return id;
  }
  doEvaltimeReplacement() {
    this.replacer(this.value, false);
  }
  doRuntimeReplacement() {
    const t = this.astService;
    const props = this.getProps();
    this.replacer(
      t.callExpression(this.tagExpression, [this.getTagComponentProps(props)]),
      true
    );
  }
  extractRules(valueCache, cssText, loc) {
    const rules = {};
    let selector = `.${this.className}`;
    let value = typeof this.component === "string" ? null : valueCache.get(this.component.node.name);
    while ((0, import_tags.hasMeta)(value)) {
      selector += `.${value.__linaria.className}`;
      value = value.__linaria.extends;
    }
    rules[selector] = {
      cssText,
      className: this.className,
      displayName: this.displayName,
      start: (loc == null ? void 0 : loc.start) ?? null
    };
    return rules;
  }
  get asSelector() {
    return `.${this.className}`;
  }
  get tagExpressionArgument() {
    const t = this.astService;
    if (typeof this.component === "string") {
      if (this.component === "FunctionalComponent") {
        return t.arrowFunctionExpression([], t.blockStatement([]));
      }
      return singleQuotedStringLiteral(this.component);
    }
    return t.callExpression(t.identifier(this.component.node.name), []);
  }
  get tagExpression() {
    const t = this.astService;
    return t.callExpression(this.callee, [this.tagExpressionArgument]);
  }
  get value() {
    const t = this.astService;
    const extendsNode = typeof this.component === "string" ? null : this.component.node.name;
    return t.objectExpression([
      t.objectProperty(
        t.stringLiteral("displayName"),
        t.stringLiteral(this.displayName)
      ),
      t.objectProperty(
        t.stringLiteral("__linaria"),
        t.objectExpression([
          t.objectProperty(
            t.stringLiteral("className"),
            t.stringLiteral(this.className)
          ),
          t.objectProperty(
            t.stringLiteral("extends"),
            extendsNode ? t.callExpression(t.identifier(extendsNode), []) : t.nullLiteral()
          )
        ])
      )
    ]);
  }
  toString() {
    const res = (arg) => `${this.tagSourceCode()}(${arg})\`\u2026\``;
    if (typeof this.component === "string") {
      if (this.component === "FunctionalComponent") {
        return res("() => {\u2026}");
      }
      return res(`'${this.component}'`);
    }
    return res(this.component.source);
  }
  getCustomVariableId(source, unit, precedingCss) {
    const context = this.getVariableContext(source, unit, precedingCss);
    const customSlugFn = this.options.variableNameSlug;
    if (!customSlugFn) {
      return void 0;
    }
    return typeof customSlugFn === "function" ? customSlugFn(context) : (0, import_tags.buildSlug)(customSlugFn, context);
  }
  getProps() {
    const propsObj = {
      name: this.displayName,
      class: this.className,
      propsAsIs: typeof this.component !== "string" || !allTagsSet.has(this.component)
    };
    if (this.interpolations.length) {
      propsObj.vars = {};
      this.interpolations.forEach(({ id, unit, node }) => {
        const items = [this.astService.callExpression(node, [])];
        if (unit) {
          items.push(this.astService.stringLiteral(unit));
        }
        propsObj.vars[id] = items;
      });
    }
    return propsObj;
  }
  getTagComponentProps(props) {
    const t = this.astService;
    const propExpressions = Object.entries(props).map(([key, value]) => {
      if (value === void 0) {
        return null;
      }
      const keyNode = t.identifier(key);
      if (value === null) {
        return t.objectProperty(keyNode, t.nullLiteral());
      }
      if (typeof value === "string") {
        return t.objectProperty(keyNode, t.stringLiteral(value));
      }
      if (typeof value === "boolean") {
        return t.objectProperty(keyNode, t.booleanLiteral(value));
      }
      const vars = Object.entries(value).map(([propName, propValue]) => {
        return t.objectProperty(
          t.stringLiteral(propName),
          t.arrayExpression(propValue)
        );
      });
      return t.objectProperty(keyNode, t.objectExpression(vars));
    }).filter(isNotNull);
    return t.objectExpression(propExpressions);
  }
  getVariableContext(source, unit, precedingCss) {
    const getIndex = () => {
      return __privateWrapper(this, _variableIdx)._++;
    };
    return {
      componentName: this.displayName,
      componentSlug: this.slug,
      get index() {
        return getIndex();
      },
      precedingCss,
      processor: this.constructor.name,
      source,
      unit,
      valueSlug: (0, import_utils.slugify)(source + unit)
    };
  }
  getVariableId(source, unit, precedingCss) {
    const value = source + unit;
    if (!__privateGet(this, _variablesCache).has(value)) {
      const id = this.getCustomVariableId(source, unit, precedingCss);
      if (id) {
        return (0, import_tags.toValidCSSIdentifier)(id);
      }
      const context = this.getVariableContext(source, unit, precedingCss);
      __privateGet(this, _variablesCache).set(value, `${this.slug}-${context.index}`);
    }
    return __privateGet(this, _variablesCache).get(value);
  }
};
_variableIdx = new WeakMap();
_variablesCache = new WeakMap();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=styled.js.map