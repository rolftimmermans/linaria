"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = ({
  types: t
}, config = {}) => {
  const library = config.library || 'styled-components';
  const isLibrary = library instanceof RegExp ? s => library.test(s) : s => s === library;
  const fixer = path => {
    if (!t.isTemplateLiteral(path.parent) || path.listKey !== 'expressions') {
      return;
    }
    const original = path.node;
    path.replaceWithSourceString("(i => i && i.__linaria ? '.' + i.__linaria.className : i)('placeholder')");
    const args = path.get('arguments');
    if (Array.isArray(args)) {
      var _args$;
      (_args$ = args[0]) === null || _args$ === void 0 ? void 0 : _args$.replaceWith(original);
    }
  };
  const visitors = {
    MemberExpression: fixer,
    Identifier: fixer
  };
  return {
    visitor: {
      TaggedTemplateExpression(path) {
        var _binding$path$parentP;
        const tag = path.get('tag');
        let identifier = null;
        if (tag.isIdentifier()) {
          identifier = tag;
        } else if (tag.isMemberExpression()) {
          identifier = tag.get('object');
        } else if (tag.isCallExpression()) {
          identifier = tag.get('callee');
        } else {
          return;
        }
        if (identifier.isMemberExpression()) {
          const obj = identifier.get('object');
          // it's something like styled().attrs()
          if (obj.isCallExpression()) {
            identifier = obj.get('callee');
          } else if (obj.isMemberExpression()) {
            identifier = obj.get('object');
          }
        }
        if (!identifier.isIdentifier()) {
          return;
        }
        const {
          scope
        } = identifier;
        const binding = scope.getBinding(identifier.node.name);
        const parent = (_binding$path$parentP = binding === null || binding === void 0 ? void 0 : binding.path.parentPath) !== null && _binding$path$parentP !== void 0 ? _binding$path$parentP : null;
        if (!(parent !== null && parent !== void 0 && parent.isImportDeclaration())) {
          return;
        }
        const importSource = parent.node.source.value;
        if (isLibrary(importSource)) {
          path.get('quasi').traverse(visitors);
        }
      }
    }
  };
};
exports.default = _default;
//# sourceMappingURL=index.js.map