/* eslint @typescript-eslint/no-use-before-define: ["error", { "functions": false }] */
/* eslint-disable no-restricted-syntax,no-continue */

import { warn } from '@linaria/logger';
import { getScope } from './getScope';
import isExports from './isExports';
import isNotNull from './isNotNull';
import isRequire from './isRequire';
import isTypedNode from './isTypedNode';
export const sideEffectImport = item => item.imported === null;
export const explicitImport = item => item.imported !== null;
function getValue({
  node
}) {
  return node.type === 'Identifier' ? node.name : node.value;
}

// We ignore imports and exports of types
const isType = p => 'importKind' in p.node && p.node.importKind === 'type' || 'exportKind' in p.node && p.node.exportKind === 'type';

// Force TypeScript to check, that we have implementation for every possible specifier

const collectors = {
  ImportSpecifier(path, source) {
    if (isType(path)) return [];
    const imported = getValue(path.get('imported'));
    const local = path.get('local');
    return [{
      imported,
      local,
      source,
      type: 'esm'
    }];
  },
  ImportDefaultSpecifier(path, source) {
    const local = path.get('local');
    return [{
      imported: 'default',
      local,
      source,
      type: 'esm'
    }];
  },
  ImportNamespaceSpecifier(path, source) {
    const local = path.get('local');
    return unfoldNamespaceImport({
      imported: '*',
      local,
      source,
      type: 'esm'
    });
  }
};
function collectFromImportDeclaration(path, state) {
  // If importKind is specified, and it's not a value, ignore that import
  if (isType(path)) return;
  const source = getValue(path.get('source'));
  const specifiers = path.get('specifiers');
  if (specifiers.length === 0) {
    state.imports.push({
      imported: null,
      local: path,
      source
    });
  }
  specifiers.forEach(specifier => {
    if (specifier.isImportSpecifier() && isType(specifier)) return;
    const collector = collectors[specifier.node.type];
    state.imports.push(...collector(specifier, source));
  });
}
function getAncestorsWhile(path, cond) {
  const result = [];
  let current = path;
  while (current && cond(current)) {
    result.push(current);
    current = current.parentPath;
  }
  return result;
}
function whatIsDestructed(objectPattern) {
  const destructedProps = [];
  objectPattern.traverse({
    Identifier(identifier) {
      if (identifier.isBindingIdentifier()) {
        const parent = identifier.parentPath;
        if (parent.isObjectProperty({
          value: identifier.node
        })) {
          const chain = getAncestorsWhile(parent, p => p !== objectPattern).filter(isTypedNode('ObjectProperty')).map(p => {
            const key = p.get('key');
            if (!key.isIdentifier()) {
              // TODO: try to process other type of keys or at least warn about this
              return null;
            }
            return key;
          }).filter(isNotNull);
          chain.reverse();
          if (chain.length > 0) {
            destructedProps.push({
              what: chain[0].node.name,
              as: identifier
            });
          }
          return;
        }
        if (parent.isRestElement({
          argument: identifier.node
        })) {
          destructedProps.push({
            what: '*',
            as: identifier
          });
        }
      }
    }
  });
  return destructedProps;
}
function importFromVariableDeclarator(path, isSync) {
  const id = path.get('id');
  if (id.isIdentifier()) {
    // It's the simplest case when the full namespace is imported
    return [{
      as: id,
      what: '*'
    }];
  }
  if (!isSync) {
    // Something went wrong
    // Is it something like `const { … } = import(…)`?
    warn('evaluator:collectExportsAndImports', '`import` should be awaited');
    return [];
  }
  if (id.isObjectPattern()) {
    return whatIsDestructed(id);
  }

  // What else it can be?
  warn('evaluator:collectExportsAndImports:importFromVariableDeclarator', 'Unknown type of id', id.node.type);
  return [];
}
function exportFromVariableDeclarator(path) {
  const id = path.get('id');
  const init = path.get('init');

  // If there is no init expression, we can ignore this export
  if (!init || !init.isExpression()) return [];
  if (id.isIdentifier()) {
    // It is `export const a = 1;`
    return [{
      local: init,
      exported: id.node.name
    }];
  }
  if (id.isObjectPattern()) {
    // It is `export const { a, ...rest } = obj;`
    return whatIsDestructed(id).map(destructed => ({
      local: init,
      exported: destructed.as.node.name
    }));
  }

  // What else it can be?
  warn('evaluator:collectExportsAndImports:exportFromVariableDeclarator', 'Unknown type of id', id.node.type);
  return [];
}
function collectFromDynamicImport(path, state) {
  const {
    parentPath: callExpression
  } = path;
  if (!callExpression.isCallExpression()) {
    // It's wrong `import`
    return;
  }
  const [sourcePath] = callExpression.get('arguments');
  if (!sourcePath || !sourcePath.isStringLiteral()) {
    // Import should have at least one argument, and it should be StringLiteral
    return;
  }
  const source = sourcePath.node.value;
  let {
    parentPath: container,
    key
  } = callExpression;
  let isAwaited = false;
  if (container.isAwaitExpression()) {
    // If it's not awaited import, it imports the full namespace
    isAwaited = true;
    key = container.key;
    container = container.parentPath;
  }

  // Is it `const something = await import("something")`?
  if (key === 'init' && container.isVariableDeclarator()) {
    importFromVariableDeclarator(container, isAwaited).map(prop => state.imports.push({
      imported: prop.what,
      local: prop.as,
      source,
      type: 'dynamic'
    }));
  }
}
function getImportExportTypeByInteropFunction(path) {
  const callee = path.get('callee');
  let name;
  if (callee.isIdentifier()) {
    name = callee.node.name;
  }
  if (callee.isMemberExpression()) {
    const property = callee.get('property');
    if (property.isIdentifier()) {
      name = property.node.name;
    }
  }
  if (name === undefined) {
    return undefined;
  }
  if (name.startsWith('__exportStar')) {
    return 're-export:*';
  }
  if (name.startsWith('_interopRequireDefault') || name.startsWith('__importDefault')) {
    return 'default';
  }
  if (name.startsWith('_interopRequireWildcard') || name.startsWith('__importStar') || name.startsWith('__toESM')) {
    return 'import:*';
  }
  if (name.startsWith('__rest') || name.startsWith('__objRest') || name.startsWith('_objectDestructuringEmpty')) {
    return 'import:*';
  }
  return undefined;
}
function collectFromRequire(path, state) {
  if (!isRequire(path)) return;
  const {
    parentPath: callExpression
  } = path;
  if (!callExpression.isCallExpression()) {
    // It's wrong `require`
    return;
  }
  const [sourcePath] = callExpression.get('arguments');
  if (!sourcePath || !sourcePath.isStringLiteral()) {
    // Import should have at least one argument, and it should be StringLiteral
    return;
  }
  const source = sourcePath.node.value;
  const {
    parentPath: container,
    key
  } = callExpression;
  if (container.isCallExpression() && key === 0) {
    // It may be transpiled import such as
    // `var _atomic = _interopRequireDefault(require("@linaria/atomic"));`
    const imported = getImportExportTypeByInteropFunction(container);
    if (!imported) {
      // It's not a transpiled import.
      // TODO: Can we guess that it's a namespace import?
      warn('evaluator:collectExportsAndImports', 'Unknown wrapper of require', container.node.callee);
      return;
    }
    if (imported === 're-export:*') {
      state.reexports.push({
        exported: '*',
        imported: '*',
        local: path,
        source
      });
      return;
    }
    let {
      parentPath: variableDeclarator
    } = container;
    if (variableDeclarator.isCallExpression()) {
      if (variableDeclarator.get('callee').isIdentifier({
        name: '_extends'
      })) {
        variableDeclarator = variableDeclarator.parentPath;
      }
    }
    if (!variableDeclarator.isVariableDeclarator()) {
      // TODO: Where else it can be?
      warn('evaluator:collectExportsAndImports', 'Unexpected require inside', variableDeclarator.node.type);
      return;
    }
    const id = variableDeclarator.get('id');
    if (!id.isIdentifier()) {
      warn('evaluator:collectExportsAndImports', 'Id should be Identifier', variableDeclarator.node.type);
      return;
    }
    if (imported === 'import:*') {
      const unfolded = unfoldNamespaceImport({
        imported: '*',
        local: id,
        source,
        type: 'cjs'
      });
      state.imports.push(...unfolded);
    } else {
      state.imports.push({
        imported,
        local: id,
        source,
        type: 'cjs'
      });
    }
  }
  if (container.isMemberExpression()) {
    // It is `require('@linaria/shaker').dep`
    const property = container.get('property');
    if (!property.isIdentifier() && !property.isStringLiteral()) {
      warn('evaluator:collectExportsAndImports', 'Property should be Identifier or StringLiteral', property.node.type);
      return;
    }
    const {
      parentPath: variableDeclarator
    } = container;
    if (variableDeclarator.isVariableDeclarator()) {
      // It is `const … = require('@linaria/shaker').dep`;
      const id = variableDeclarator.get('id');
      if (id.isIdentifier()) {
        state.imports.push({
          imported: getValue(property),
          local: id,
          source,
          type: 'cjs'
        });
      } else {
        warn('evaluator:collectExportsAndImports', 'Id should be Identifier', variableDeclarator.node.type);
      }
    } else {
      // Maybe require is passed as an argument to some function?
      // Just use the whole MemberExpression as a local
      state.imports.push({
        imported: getValue(property),
        local: container,
        source,
        type: 'cjs'
      });
    }
    return;
  }

  // Is it `const something = require("something")`?
  if (key === 'init' && container.isVariableDeclarator()) {
    importFromVariableDeclarator(container, true).forEach(prop => {
      if (prop.what === '*') {
        const unfolded = unfoldNamespaceImport({
          imported: '*',
          local: prop.as,
          source,
          type: 'cjs'
        });
        state.imports.push(...unfolded);
      } else {
        state.imports.push({
          imported: prop.what,
          local: prop.as,
          source,
          type: 'cjs'
        });
      }
    });
  }
  if (container.isExpressionStatement()) {
    // Looks like standalone require
    state.imports.push({
      imported: null,
      local: container,
      source
    });
  }
}
function isChainOfVoidAssignment(path) {
  const right = path.get('right');
  if (right.isUnaryExpression({
    operator: 'void'
  })) {
    return true;
  }
  if (right.isAssignmentExpression()) {
    return isChainOfVoidAssignment(right);
  }
  return false;
}
function getReturnValue(path) {
  if (path.node.params.length !== 0) return undefined;
  const body = path.get('body');
  if (body.isExpression()) {
    return body;
  }
  if (body.node.body.length === 1) {
    const returnStatement = body.get('body')?.[0];
    if (!returnStatement.isReturnStatement()) return undefined;
    const argument = returnStatement.get('argument');
    if (!argument.isExpression()) return undefined;
    return argument;
  }
  return undefined;
}
function getGetterValueFromDescriptor(descriptor) {
  const getter = descriptor.get('properties').filter(isTypedNode('ObjectProperty')).find(p => p.get('key').isIdentifier({
    name: 'get'
  }));
  const value = getter?.get('value');
  if (value?.isFunctionExpression() || value?.isArrowFunctionExpression()) {
    return getReturnValue(value);
  }
  return undefined;
}
function collectFromExports(path, state) {
  if (!isExports(path)) return;
  if (path.parentPath.isMemberExpression({
    object: path.node
  })) {
    // It is `exports.prop = …`
    const memberExpression = path.parentPath;
    const property = memberExpression.get('property');
    if (!property.isIdentifier()) {
      return;
    }
    const exportName = property.node.name;
    const saveRef = () => {
      // Save all export.____ usages for later
      if (!state.exportRefs.has(exportName)) {
        state.exportRefs.set(exportName, []);
      }
      state.exportRefs.get(exportName).push(memberExpression);
    };
    const assignmentExpression = memberExpression.parentPath;
    if (!assignmentExpression.isAssignmentExpression({
      left: memberExpression.node
    })) {
      // If it's not `exports.prop = …`. Just save it.
      saveRef();
      return;
    }
    const right = assignmentExpression.get('right');
    if (isChainOfVoidAssignment(assignmentExpression)) {
      // It is `exports.foo = void 0`
      return;
    }
    const {
      name
    } = property.node;
    if (name === '__esModule') {
      // eslint-disable-next-line no-param-reassign
      state.isEsModule = true;
      return;
    }
    saveRef();
    state.exports.push({
      exported: property.node.name,
      local: right
    });
    return;
  }
  if (path.parentPath.isCallExpression() && path.parentPath.get('callee').matchesPattern('Object.defineProperty')) {
    const [obj, prop, descriptor] = path.parentPath.get('arguments');
    if (obj?.isIdentifier(path.node) && prop?.isStringLiteral() && descriptor?.isObjectExpression()) {
      if (prop.node.value === '__esModule') {
        // eslint-disable-next-line no-param-reassign
        state.isEsModule = true;
      } else {
        /**
         *  Object.defineProperty(exports, "token", {
         *    enumerable: true,
         *    get: function get() {
         *      return _unknownPackage.token;
         *    }
         *  });
         */
        const exported = prop.node.value;
        const local = getGetterValueFromDescriptor(descriptor);
        if (local) {
          state.exports.push({
            exported,
            local
          });
        }
      }
    } else if (obj?.isIdentifier(path.node) && prop?.isIdentifier() && descriptor?.isObjectExpression()) {
      /**
       *  Object.defineProperty(exports, key, {
       *    enumerable: true,
       *    get: function get() {
       *      return _unknownPackage[key];
       *    }
       *  });
       */
      const local = getGetterValueFromDescriptor(descriptor);
      if (local) {
        state.exports.push({
          exported: '*',
          local
        });
      }
    }
  }
}
function collectFromRequireOrExports(path, state) {
  if (isRequire(path)) {
    collectFromRequire(path, state);
  } else if (isExports(path)) {
    collectFromExports(path, state);
  }
}
function unfoldNamespaceImport(importItem) {
  const result = [];
  const {
    local
  } = importItem;
  if (!local.isIdentifier()) {
    // TODO: handle it
    return [importItem];
  }
  const binding = getScope(local).getBinding(local.node.name);
  if (!binding?.referenced) {
    // Imported namespace is not referenced and probably not used,
    // but it can have side effects, so we should keep it as is
    return [importItem];
  }
  for (const referencePath of binding?.referencePaths ?? []) {
    if (referencePath.find(ancestor => ancestor.isTSType() || ancestor.isFlowType())) {
      continue;
    }
    const {
      parentPath
    } = referencePath;
    if (parentPath?.isMemberExpression() && referencePath.key === 'object') {
      const property = parentPath.get('property');
      const object = parentPath.get('object');
      let imported;
      if (parentPath.node.computed && property.isStringLiteral()) {
        imported = property.node.value;
      } else if (!parentPath.node.computed && property.isIdentifier()) {
        imported = property.node.name;
      } else {
        imported = null;
      }
      if (object.isIdentifier() && imported) {
        result.push({
          ...importItem,
          imported,
          local: parentPath
        });
      } else {
        result.push(importItem);
        break;
      }
      continue;
    }
    if (parentPath?.isVariableDeclarator() && referencePath.key === 'init') {
      importFromVariableDeclarator(parentPath, true).map(prop => result.push({
        ...importItem,
        imported: prop.what,
        local: prop.as
      }));
      continue;
    }
    if (parentPath?.isExportSpecifier()) {
      // The whole namespace is re-exported
      result.push(importItem);
      break;
    }

    // Otherwise, we can't predict usage and import it as is
    // TODO: handle more cases
    warn('evaluator:collectExportsAndImports:unfoldNamespaceImports', 'Unknown reference', referencePath.node.type);
    result.push(importItem);
    break;
  }
  return result;
}
function collectFromExportAllDeclaration(path, state) {
  if (isType(path)) return;
  const source = path.get('source')?.node?.value;
  if (!source) return;

  // It is `export * from './css';`
  state.reexports.push({
    exported: '*',
    imported: '*',
    local: path,
    source
  });
}
function collectFromExportSpecifier(path, source, state) {
  if (path.isExportSpecifier()) {
    const exported = getValue(path.get('exported'));
    if (source) {
      // It is `export { foo } from './css';`
      const imported = path.get('local').node.name;
      state.reexports.push({
        exported,
        imported,
        local: path,
        source
      });
    } else {
      const local = path.get('local');
      state.exports.push({
        local,
        exported
      });
    }
    return;
  }
  if (path.isExportDefaultSpecifier() && source) {
    // It is `export default from './css';`
    state.reexports.push({
      exported: 'default',
      imported: 'default',
      local: path,
      source
    });
  }
  if (path.isExportNamespaceSpecifier() && source) {
    const exported = path.get('exported').node.name;
    // It is `export * as foo from './css';`
    state.reexports.push({
      exported,
      imported: '*',
      local: path,
      source
    });
  }

  // TODO: handle other cases
  warn('evaluator:collectExportsAndImports:collectFromExportSpecifier', 'Unprocessed ExportSpecifier', path.node.type);
}
function collectFromExportNamedDeclaration(path, state) {
  if (isType(path)) return;
  const source = path.get('source')?.node?.value;
  const specifiers = path.get('specifiers');
  if (specifiers) {
    specifiers.forEach(specifier => collectFromExportSpecifier(specifier, source, state));
  }
  const declaration = path.get('declaration');
  if (declaration.isVariableDeclaration()) {
    declaration.get('declarations').forEach(declarator => {
      exportFromVariableDeclarator(declarator).forEach(prop => {
        // What is defined
        state.exports.push(prop);
      });
    });
  }
  if (declaration.isFunctionDeclaration()) {
    const id = declaration.get('id');
    if (id.isIdentifier()) {
      state.exports.push({
        exported: id.node.name,
        local: id
      });
    }
  }
}
function collectFromExportDefaultDeclaration(path, state) {
  if (isType(path)) return;
  const declaration = path.get('declaration');
  state.exports.push({
    exported: 'default',
    local: declaration
  });
}
const cache = new WeakMap();
function collectFromAssignmentExpression(path, state) {
  const left = path.get('left');
  const right = path.get('right');
  let exported;
  if (left.isMemberExpression() && isExports(left.get('object'))) {
    const property = left.get('property');
    if (property.isIdentifier()) {
      exported = property.node.name;
    }
  } else if (isExports(left)) {
    exported = '*'; // maybe
  }

  if (!exported) return;
  if (!right.isCallExpression() || !isRequire(right.get('callee'))) return;
  const sourcePath = right.get('arguments')?.[0];
  const source = sourcePath.isStringLiteral() ? sourcePath.node.value : undefined;
  if (!source) return;

  // It is `exports.foo = require('./css');`

  state.reexports.push({
    exported,
    imported: '*',
    local: path,
    source
  });
  path.skip();
}
function collectFromExportStarCall(path, state) {
  const [requireCall, exports] = path.get('arguments');
  if (!isExports(exports)) return;
  if (!requireCall.isCallExpression()) return;
  const callee = requireCall.get('callee');
  const sourcePath = requireCall.get('arguments')?.[0];
  if (!isRequire(callee) || !sourcePath.isStringLiteral()) return;
  const source = sourcePath.node.value;
  if (!source) return;
  state.reexports.push({
    exported: '*',
    imported: '*',
    local: path,
    source
  });
  path.skip();
}
function collectFromMap(map, state) {
  const properties = map.get('properties');
  properties.forEach(property => {
    if (!property.isObjectProperty()) return;
    const key = property.get('key');
    const value = property.get('value');
    if (!key.isIdentifier()) return;
    const exported = key.node.name;
    if (!value.isFunction()) return;
    if (value.node.params.length !== 0) return;
    const returnValue = getReturnValue(value);
    if (!returnValue) return;
    state.exports.push({
      exported,
      local: returnValue
    });
  });
}
function collectFromEsbuildExportCall(path, state) {
  const [sourceExports, map] = path.get('arguments');
  if (!sourceExports.isIdentifier({
    name: 'source_exports'
  })) return;
  if (!map.isObjectExpression()) return;
  collectFromMap(map, state);
  path.skip();
}
function collectFromEsbuildReExportCall(path, state) {
  const [sourceExports, requireCall, exports] = path.get('arguments');
  if (!sourceExports.isIdentifier({
    name: 'source_exports'
  })) return;
  if (!requireCall.isCallExpression()) return;
  if (!isExports(exports)) return;
  const callee = requireCall.get('callee');
  if (!isRequire(callee)) return;
  const sourcePath = requireCall.get('arguments')?.[0];
  if (!sourcePath.isStringLiteral()) return;
  state.reexports.push({
    exported: '*',
    imported: '*',
    local: path,
    source: sourcePath.node.value
  });
  path.skip();
}
function collectFromSwcExportCall(path, state) {
  const [exports, map] = path.get('arguments');
  if (!isExports(exports)) return;
  if (!map.isObjectExpression()) return;
  collectFromMap(map, state);
  path.skip();
}
function collectFromCallExpression(path, state) {
  const maybeExportStart = path.get('callee');
  if (!maybeExportStart.isIdentifier()) {
    return;
  }
  const {
    name
  } = maybeExportStart.node;

  // TypeScript
  if (name.startsWith('__exportStar')) {
    collectFromExportStarCall(path, state);
    return;
  }

  // swc
  if (name === '_exportStar') {
    collectFromExportStarCall(path, state);
  }
  if (name === '_export') {
    collectFromSwcExportCall(path, state);
  }

  // esbuild
  if (name === '__export') {
    collectFromEsbuildExportCall(path, state);
  }
  if (name === '__reExport') {
    collectFromEsbuildReExportCall(path, state);
  }
}
export default function collectExportsAndImports(path, force = false) {
  const state = {
    exportRefs: new Map(),
    exports: [],
    imports: [],
    reexports: [],
    isEsModule: false
  };
  if (!force && cache.has(path)) {
    return cache.get(path) ?? state;
  }
  path.traverse({
    AssignmentExpression: collectFromAssignmentExpression,
    CallExpression: collectFromCallExpression,
    ExportAllDeclaration: collectFromExportAllDeclaration,
    ExportDefaultDeclaration: collectFromExportDefaultDeclaration,
    ExportNamedDeclaration: collectFromExportNamedDeclaration,
    ImportDeclaration: collectFromImportDeclaration,
    Import: collectFromDynamicImport,
    Identifier: collectFromRequireOrExports
  }, state);
  cache.set(path, state);
  return state;
}
//# sourceMappingURL=collectExportsAndImports.js.map