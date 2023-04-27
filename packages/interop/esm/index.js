export default (({
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
      args[0]?.replaceWith(original);
    }
  };
  const visitors = {
    MemberExpression: fixer,
    Identifier: fixer
  };
  return {
    visitor: {
      TaggedTemplateExpression(path) {
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
        const parent = binding?.path.parentPath ?? null;
        if (!parent?.isImportDeclaration()) {
          return;
        }
        const importSource = parent.node.source.value;
        if (isLibrary(importSource)) {
          path.get('quasi').traverse(visitors);
        }
      }
    }
  };
});
//# sourceMappingURL=index.js.map