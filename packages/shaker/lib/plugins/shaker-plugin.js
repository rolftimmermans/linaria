"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = shakerPlugin;
exports.hasShakerMetadata = void 0;
var _logger = require("@linaria/logger");
var _utils = require("@linaria/utils");
var _shouldKeepSideEffect = _interopRequireDefault(require("./utils/shouldKeepSideEffect"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const hasShakerMetadata = metadata => metadata !== undefined && '__linariaShaker' in metadata;
exports.hasShakerMetadata = hasShakerMetadata;
function getBindingForExport(exportPath) {
  if (exportPath.isIdentifier()) {
    return exportPath.scope.getBinding(exportPath.node.name);
  }
  const variableDeclarator = exportPath.findParent(p => p.isVariableDeclarator());
  if (variableDeclarator) {
    const id = variableDeclarator.get('id');
    if (id.isIdentifier()) {
      return variableDeclarator.scope.getBinding(id.node.name);
    }
  }
  if (exportPath.isAssignmentExpression()) {
    const left = exportPath.get('left');
    if (left.isIdentifier()) {
      return exportPath.scope.getBinding(left.node.name);
    }
  }
  return undefined;
}
const withoutRemoved = items => items.filter(({
  local
}) => !(0, _utils.isRemoved)(local));
function rearrangeExports({
  types: t
}, root, exportRefs, exports) {
  let rearranged = [...exports];
  const rootScope = root.scope;
  exportRefs.forEach((refs, name) => {
    if (refs.length <= 1) {
      return;
    }
    const uid = rootScope.generateUid(name);
    // Define variable in the beginning
    const [declaration] = root.unshiftContainer('body', [t.variableDeclaration('var', [t.variableDeclarator(t.identifier(uid))])]);
    rootScope.registerDeclaration(declaration);

    // Replace every reference with defined variable
    refs.forEach(ref => {
      const [replaced] = ref.replaceWith(t.identifier(uid));
      if (replaced.isBindingIdentifier()) {
        rootScope.registerConstantViolation(replaced);
      } else {
        (0, _utils.reference)(replaced);
      }
    });

    // Assign defined variable to the export
    const [pushed] = root.pushContainer('body', [t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.identifier('exports'), t.identifier(name)), t.identifier(uid)))]);
    const local = pushed.get('expression.right');
    (0, _utils.reference)(local);
    rearranged = rearranged.map(exp => exp.exported === name ? {
      ...exp,
      local
    } : exp);
  });
  return rearranged;
}
function shakerPlugin(babel, {
  keepSideEffects = false,
  ifUnknownExport = 'skip-shaking',
  onlyExports
}) {
  return {
    name: '@linaria/shaker',
    pre(file) {
      this.filename = file.opts.filename;
      const log = (0, _logger.createCustomDebug)('shaker', (0, _utils.getFileIdx)(this.filename));
      log('start', `${this.filename}, onlyExports: ${onlyExports.join(',')}`);
      const collected = (0, _utils.collectExportsAndImports)(file.path);
      const sideEffectImports = collected.imports.filter(_utils.sideEffectImport);
      log('import-and-exports', [`imports: ${collected.imports.length} (side-effects: ${sideEffectImports.length})`, `exports: ${collected.exports.length}`, `reexports: ${collected.reexports.length}`].join(', '));

      // We cannot just throw out exports if they are referred in the code
      // Let's dome some replacements
      const exports = rearrangeExports(babel, file.path, collected.exportRefs, collected.exports);
      collected.exports.forEach(({
        local
      }) => {
        if (local.isAssignmentExpression()) {
          const left = local.get('left');
          if (left.isIdentifier()) {
            // For some reason babel does not mark id in AssignmentExpression as a reference
            // So we need to do it manually
            (0, _utils.reference)(left, left, true);
          }
        }
      });
      if (onlyExports.length === 1 && onlyExports[0] === '__linariaPreval' && !exports.find(i => i.exported === '__linariaPreval')) {
        // Fast-lane: if only __linariaPreval is requested, and it's not exported,
        // we can just shake out the whole file
        this.imports = [];
        this.exports = [];
        this.reexports = [];
        file.path.get('body').forEach(p => {
          p.remove();
        });
        return;
      }
      // Hackaround for packages which include a 'default' export without specifying __esModule; such packages cannot be
      // shaken as they will break interopRequireDefault babel helper
      // See example in shaker-plugin.test.ts
      // Real-world example was found in preact/compat npm package
      if (onlyExports.includes('default') && exports.find(({
        exported
      }) => exported === 'default') && !collected.isEsModule) {
        this.imports = collected.imports;
        this.exports = exports;
        this.reexports = collected.reexports;
        return;
      }
      if (!onlyExports.includes('*')) {
        const aliveExports = new Set();
        const importNames = collected.imports.map(({
          imported
        }) => imported);
        exports.forEach(exp => {
          if (onlyExports.includes(exp.exported)) {
            aliveExports.add(exp);
          } else if (importNames.includes(exp.local.node.name || '')) {
            aliveExports.add(exp);
          } else if ([...aliveExports].some(liveExp => liveExp.local === exp.local)) {
            // It's possible to export multiple values from a single variable initializer, e.g
            // export const { foo, bar } = baz();
            // We need to treat all of them as used if any of them are used, since otherwise
            // we'll attempt to delete the baz() call
            aliveExports.add(exp);
          }
        });
        collected.reexports.forEach(exp => {
          if (onlyExports.includes(exp.exported)) {
            aliveExports.add(exp);
          }
        });
        const isAllExportsFound = aliveExports.size === onlyExports.length;
        if (!isAllExportsFound && ifUnknownExport !== 'ignore') {
          if (ifUnknownExport === 'error') {
            throw new Error(`Unknown export(s) requested: ${onlyExports.join(',')}`);
          }
          if (ifUnknownExport === 'reexport-all') {
            // If there are unknown exports, we have keep alive all re-exports.
            exports.forEach(exp => {
              if (exp.exported === '*') {
                aliveExports.add(exp);
              }
            });
            collected.reexports.forEach(exp => {
              if (exp.exported === '*') {
                aliveExports.add(exp);
              }
            });
          }
          if (ifUnknownExport === 'skip-shaking') {
            this.imports = collected.imports;
            this.exports = exports;
            this.reexports = collected.reexports;
            return;
          }
        }
        const forDeleting = [...exports, ...collected.reexports].filter(exp => !aliveExports.has(exp)).map(exp => exp.local);
        if (!keepSideEffects && sideEffectImports.length > 0) {
          // Remove all imports that don't import something explicitly and should not be kept
          sideEffectImports.forEach(i => {
            if (!(0, _shouldKeepSideEffect.default)(i.source)) {
              forDeleting.push(i.local);
            }
          });
        }
        const deleted = new Set();
        const dereferenced = [];
        let changed = true;
        while (changed && deleted.size < forDeleting.length) {
          changed = false;
          // eslint-disable-next-line no-restricted-syntax
          for (const path of forDeleting) {
            const binding = getBindingForExport(path);
            const action = (0, _utils.findActionForNode)(path);
            const parent = action === null || action === void 0 ? void 0 : action[1];
            const outerReferences = ((binding === null || binding === void 0 ? void 0 : binding.referencePaths) || []).filter(ref => ref !== parent && !(parent !== null && parent !== void 0 && parent.isAncestor(ref)));
            if (outerReferences.length > 0 && path.isIdentifier()) {
              // Temporary deref it in order to simplify further checks.
              (0, _utils.dereference)(path);
              dereferenced.push(path);
            }
            if (!deleted.has(path) && (!binding || outerReferences.length === 0)) {
              if (action) {
                (0, _utils.applyAction)(action);
              } else {
                (0, _utils.removeWithRelated)([path]);
              }
              deleted.add(path);
              changed = true;
            }
          }
        }
        dereferenced.forEach(path => {
          // If path is still alive, we need to reference it back
          if (!(0, _utils.isRemoved)(path)) {
            (0, _utils.reference)(path);
          }
        });
      }
      this.imports = withoutRemoved(collected.imports);
      this.exports = withoutRemoved(exports);
      this.reexports = withoutRemoved(collected.reexports);
    },
    visitor: {},
    post(file) {
      const log = (0, _logger.createCustomDebug)('shaker', (0, _utils.getFileIdx)(file.opts.filename));
      const imports = new Map();
      this.imports.forEach(({
        imported,
        source
      }) => {
        if (!imports.has(source)) {
          imports.set(source, []);
        }
        if (imported) {
          imports.get(source).push(imported);
        }
      });
      this.reexports.forEach(({
        imported,
        source
      }) => {
        if (!imports.has(source)) {
          imports.set(source, []);
        }
        imports.get(source).push(imported);
      });
      log('end', `remaining imports: %O`, imports);

      // eslint-disable-next-line no-param-reassign
      file.metadata.__linariaShaker = {
        imports
      };
    }
  };
}
//# sourceMappingURL=shaker-plugin.js.map