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

// src/processors/styled.ts
import { debug } from "@linaria/logger";
import StyledProcessor from "@linaria/react/processors/styled";
import { hasMeta } from "@linaria/tags";

// src/processors/helpers/atomize.ts
import { all as knownProperties } from "known-css-properties";
import postcss from "postcss";
import stylis from "stylis";
import { slugify } from "@linaria/utils";

// src/processors/helpers/propertyPriority.ts
var shorthandProperties = {
  animation: [
    "animation-name",
    "animation-duration",
    "animation-timing-function",
    "animation-delay",
    "animation-iteration-count",
    "animation-direction",
    "animation-fill-mode",
    "animation-play-state"
  ],
  background: [
    "background-attachment",
    "background-clip",
    "background-color",
    "background-image",
    "background-origin",
    "background-position",
    "background-repeat",
    "background-size"
  ],
  border: ["border-color", "border-style", "border-width"],
  "border-block-end": [
    "border-block-end-color",
    "border-block-end-style",
    "border-block-end-width"
  ],
  "border-block-start": [
    "border-block-start-color",
    "border-block-start-style",
    "border-block-start-width"
  ],
  "border-bottom": [
    "border-bottom-color",
    "border-bottom-style",
    "border-bottom-width"
  ],
  "border-color": [
    "border-bottom-color",
    "border-left-color",
    "border-right-color",
    "border-top-color"
  ],
  "border-image": [
    "border-image-outset",
    "border-image-repeat",
    "border-image-slice",
    "border-image-source",
    "border-image-width"
  ],
  "border-inline-end": [
    "border-inline-end-color",
    "border-inline-end-style",
    "border-inline-end-width"
  ],
  "border-inline-start": [
    "border-inline-start-color",
    "border-inline-start-style",
    "border-inline-start-width"
  ],
  "border-left": [
    "border-left-color",
    "border-left-style",
    "border-left-width"
  ],
  "border-radius": [
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius"
  ],
  "border-right": [
    "border-right-color",
    "border-right-style",
    "border-right-width"
  ],
  "border-style": [
    "border-bottom-style",
    "border-left-style",
    "border-right-style",
    "border-top-style"
  ],
  "border-top": ["border-top-color", "border-top-style", "border-top-width"],
  "border-width": [
    "border-bottom-width",
    "border-left-width",
    "border-right-width",
    "border-top-width"
  ],
  "column-rule": [
    "column-rule-width",
    "column-rule-style",
    "column-rule-color"
  ],
  columns: ["column-count", "column-width"],
  flex: ["flex-grow", "flex-shrink", "flex-basis"],
  "flex-flow": ["flex-direction", "flex-wrap"],
  font: [
    "font-family",
    "font-size",
    "font-stretch",
    "font-style",
    "font-variant",
    "font-weight",
    "line-height"
  ],
  gap: ["row-gap", "column-gap"],
  grid: [
    "grid-auto-columns",
    "grid-auto-flow",
    "grid-auto-rows",
    "grid-template-areas",
    "grid-template-columns",
    "grid-template-rows"
  ],
  "grid-area": [
    "grid-row-start",
    "grid-column-start",
    "grid-row-end",
    "grid-column-end"
  ],
  "grid-column": ["grid-column-end", "grid-column-start"],
  "grid-row": ["grid-row-end", "grid-row-start"],
  "grid-template": [
    "grid-template-areas",
    "grid-template-columns",
    "grid-template-rows"
  ],
  "list-style": ["list-style-image", "list-style-position", "list-style-type"],
  margin: ["margin-bottom", "margin-left", "margin-right", "margin-top"],
  mask: [
    "mask-clip",
    "mask-composite",
    "mask-image",
    "mask-mode",
    "mask-origin",
    "mask-position",
    "mask-repeat",
    "mask-size"
  ],
  offset: [
    "offset-anchor",
    "offset-distance",
    "offset-path",
    "offset-position",
    "offset-rotate"
  ],
  outline: ["outline-color", "outline-style", "outline-width"],
  overflow: ["overflow-x", "overflow-y"],
  padding: ["padding-bottom", "padding-left", "padding-right", "padding-top"],
  "place-content": ["align-content", "justify-content"],
  "place-items": ["align-items", "justify-items"],
  "place-self": ["align-self", "justify-self"],
  "scroll-margin": [
    "scroll-margin-bottom",
    "scroll-margin-left",
    "scroll-margin-right",
    "scroll-margin-top"
  ],
  "scroll-padding": [
    "scroll-padding-bottom",
    "scroll-padding-left",
    "scroll-padding-right",
    "scroll-padding-top"
  ],
  "text-decoration": [
    "text-decoration-color",
    "text-decoration-line",
    "text-decoration-style",
    "text-decoration-thickness"
  ],
  "text-emphasis": ["text-emphasis-color", "text-emphasis-style"],
  transition: [
    "transition-delay",
    "transition-duration",
    "transition-property",
    "transition-timing-function"
  ]
};
function getPropertyPriority(property) {
  const longhands = Object.values(shorthandProperties).reduce(
    (a, b) => [...a, ...b],
    []
  );
  return longhands.includes(property) ? 2 : 1;
}

// src/processors/helpers/atomize.ts
var knownPropertiesMap = knownProperties.reduce(
  (acc, property, i) => {
    acc[property] = i;
    return acc;
  },
  {}
);
function hashProperty(property) {
  const index = knownPropertiesMap[property];
  if (index !== void 0) {
    return index.toString(36);
  }
  return slugify(property);
}
var parseCss = (cssText) => {
  try {
    return postcss.parse(cssText);
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`Error parsing CSS: ${e.message}
CSS:
${cssText}`);
    }
    throw new Error(`Unknown error parsing CSS.
CSS:
${cssText}`);
  }
};
function atomize(cssText, hasPriority = false) {
  stylis.set({
    prefix: false,
    keyframe: false
  });
  const atomicRules = [];
  const stylesheet = parseCss(cssText);
  stylesheet.walkAtRules("keyframes", (atRule) => {
    atRule.remove();
    atomicRules.push({
      property: atRule.name,
      cssText: atRule.toString()
    });
  });
  stylesheet.walkDecls((decl) => {
    let thisParent = decl.parent;
    const parents = [];
    const atomicProperty = [decl.prop];
    let hasAtRule = false;
    while (thisParent && thisParent !== stylesheet) {
      parents.unshift(thisParent);
      if (thisParent.type === "atrule") {
        hasAtRule = true;
        atomicProperty.push(
          thisParent.name,
          thisParent.params
        );
      } else if (thisParent.type === "rule") {
        atomicProperty.push(thisParent.selector);
      }
      thisParent = thisParent.parent;
    }
    const root = postcss.root();
    let container = root;
    parents.forEach((parent) => {
      const newNode = parent.clone();
      newNode.removeAll();
      container.append(newNode);
      container = newNode;
    });
    container.append(decl.clone());
    const css = root.toString();
    const propertySlug = hashProperty([...atomicProperty].join(";"));
    const valueSlug = slugify(decl.value);
    const className = `atm_${propertySlug}_${valueSlug}`;
    const propertyPriority = getPropertyPriority(decl.prop) + (hasAtRule ? 1 : 0) + (hasPriority ? 1 : 0);
    const processedCss = stylis(`.${className}`.repeat(propertyPriority), css);
    atomicRules.push({
      property: atomicProperty.join(" "),
      className,
      cssText: processedCss
    });
  });
  return atomicRules;
}

// src/processors/styled.ts
var _classes;
var AtomicStyledProcessor = class extends StyledProcessor {
  constructor() {
    super(...arguments);
    __privateAdd(this, _classes, void 0);
  }
  get classes() {
    if (__privateGet(this, _classes)) {
      return __privateGet(this, _classes);
    }
    throw new Error(
      "Styles are not extracted yet. Please call `extractRules` first."
    );
  }
  extractRules(valueCache, cssText, loc) {
    const rules = {};
    const wrappedValue = typeof this.component === "string" ? null : valueCache.get(this.component.node.name);
    const atomicRules = atomize(cssText, hasMeta(wrappedValue));
    atomicRules.forEach((rule) => {
      rules[rule.cssText] = {
        cssText: rule.cssText,
        start: (loc == null ? void 0 : loc.start) ?? null,
        className: this.className,
        displayName: this.displayName,
        atom: true
      };
      debug(
        "evaluator:template-processor:extracted-atomic-rule",
        `
${rule.cssText}`
      );
    });
    __privateSet(this, _classes, atomicRules.filter((rule) => !!rule.className).map((rule) => rule.className).join(" "));
    return rules;
  }
  getProps() {
    const props = super.getProps();
    props.class = [this.classes, this.className].filter(Boolean).join(" ");
    props.atomic = true;
    return props;
  }
  getVariableId(source, unit, precedingCss) {
    const id = this.getCustomVariableId(source, unit, precedingCss);
    if (id) {
      return id;
    }
    const context = this.getVariableContext(source, unit, precedingCss);
    return context.valueSlug;
  }
};
_classes = new WeakMap();
export {
  AtomicStyledProcessor as default
};
//# sourceMappingURL=styled.mjs.map