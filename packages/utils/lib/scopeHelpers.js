"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyAction = applyAction;
exports.dereference = dereference;
exports.findActionForNode = findActionForNode;
exports.mutate = mutate;
exports.reference = reference;
exports.referenceAll = referenceAll;
exports.removeWithRelated = removeWithRelated;
var _types = require("@babel/types");
var _findIdentifiers = _interopRequireWildcard(require("./findIdentifiers"));
var _getScope = require("./getScope");
var _isNotNull = _interopRequireDefault(require("./isNotNull"));
var _isRemoved = _interopRequireDefault(require("./isRemoved"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
/* eslint-disable no-restricted-syntax */
/* eslint @typescript-eslint/no-use-before-define: ["error", { "functions": false }] */

function validateField(node, key, val, field) {
  if (!(field != null && field.validate)) return true;
  if (field.optional && val == null) return true;
  try {
    field.validate(node, key, val);
    return true;
  } catch {
    return false;
  }
}
function getBinding(path) {
  const binding = (0, _getScope.getScope)(path).getBinding(path.node.name);
  if (!binding) {
    return undefined;
  }
  return binding;
}
function reference(path, referencePath = path, force = false) {
  if (!force && !path.isReferencedIdentifier()) return;
  const binding = getBinding(path);
  if (!binding) return;
  if (binding.referencePaths.includes(referencePath)) {
    return;
  }
  binding.referenced = true;
  binding.references += 1;
  binding.referencePaths.push(referencePath !== null && referencePath !== void 0 ? referencePath : path);
}
function isReferenced(binding) {
  if (!binding.referenced) {
    return false;
  }

  // If it's a param binding, we can't just remove it
  // because it brakes the function signature. Keep it alive for now.
  if (binding.kind === 'param') {
    return true;
  }

  // If all remaining references are in TS/Flow types, binding is unreferenced
  return binding.referencePaths.some(i => !i.find(ancestor => ancestor.isTSType() || ancestor.isFlowType()));
}
function dereference(path) {
  const binding = getBinding(path);
  if (!binding) return null;
  if (!binding.referencePaths.includes(path)) {
    return null;
  }
  binding.references -= 1;
  binding.referencePaths = binding.referencePaths.filter(i => i !== path);
  binding.referenced = binding.referencePaths.length > 0;
  return binding;
}
function dereferenceAll(path) {
  return (0, _findIdentifiers.default)([path]).map(identifierPath => dereference(identifierPath)).filter(_isNotNull.default);
}
function referenceAll(path) {
  (0, _findIdentifiers.default)([path]).forEach(identifierPath => reference(identifierPath));
}
const deletingNodes = new WeakSet();
const isEmptyList = list => list.length === 0 || list.every(i => deletingNodes.has(i));
const getPathFromAction = action => {
  if (!Array.isArray(action)) {
    return action;
  }
  if (action[0] === 'replace' || action[0] === 'remove') {
    return action[1];
  }
  throw new Error(`Unknown action type: ${action[0]}`);
};
function canFunctionBeDelete(fnPath) {
  const fnScope = fnPath.scope;
  const parentScope = fnScope.parent;
  if (parentScope.parent) {
    // It isn't a top-level function, so we can't delete it
    return true;
  }
  if (fnPath.listKey === 'arguments') {
    // It is passed as an argument to another function, we can't delete it
    return true;
  }
  return false;
}
function findActionForNode(path) {
  if ((0, _isRemoved.default)(path)) return null;
  deletingNodes.add(path);
  const parent = path.parentPath;
  if (!parent) return ['remove', path];
  if (parent.isProgram()) {
    // Do not delete Program node
    return ['remove', path];
  }
  if (parent.isFunction()) {
    if (path.listKey === 'params') {
      // Do not remove params of functions
      return null;
    }
    if (path.isBlockStatement() && isEmptyList(path.get('body')) || path === parent.get('body')) {
      if (!canFunctionBeDelete(parent)) {
        return ['replace', parent, {
          ...parent.node,
          async: false,
          body: {
            type: 'BlockStatement',
            body: [],
            directives: []
          },
          generator: false,
          params: []
        }];
      }
    }
  }
  if (parent.isLogicalExpression({
    operator: '&&'
  })) {
    return ['replace', parent, {
      type: 'BooleanLiteral',
      value: false
    }];
  }
  if (parent.isObjectProperty()) {
    // let's check if it is a special case with Object.defineProperty
    const key = parent.get('key');
    if (key.isIdentifier({
      name: 'get'
    })) {
      const maybeDefineProperty = parent.parentPath.parentPath;
      if (maybeDefineProperty !== null && maybeDefineProperty !== void 0 && maybeDefineProperty.isCallExpression() && maybeDefineProperty.get('callee').matchesPattern('Object.defineProperty')) {
        return findActionForNode(maybeDefineProperty);
      }
    }
    return findActionForNode(parent);
  }
  if (parent.isTemplateLiteral()) {
    return ['replace', path, {
      type: 'StringLiteral',
      value: ''
    }];
  }
  if (parent.isAssignmentExpression()) {
    return findActionForNode(parent);
  }
  if (parent.isCallExpression()) {
    return findActionForNode(parent);
  }
  if (parent.isForInStatement({
    left: path.node
  })) {
    return findActionForNode(parent);
  }
  if (parent.isFunctionExpression({
    body: path.node
  }) || parent.isFunctionDeclaration() || parent.isObjectMethod() || parent.isClassMethod()) {
    return findActionForNode(parent);
  }
  if (parent.isBlockStatement()) {
    const body = parent.get('body');
    if (isEmptyList(body)) {
      return findActionForNode(parent);
    }
    if (path.listKey === 'body' && typeof path.key === 'number') {
      if (path.key > 0) {
        // We can check whether the previous one can be removed
        const prevStatement = body[path.key - 1];
        if (prevStatement.isIfStatement() && prevStatement.get('consequent').isReturnStatement()) {
          // It's `if (…) return …`, we can remove it.
          return findActionForNode(prevStatement);
        }
      } else if (body.slice(1).every(statement => deletingNodes.has(statement))) {
        // If it is the first statement and all other statements
        // are marked for deletion, we can remove the whole block.
        return findActionForNode(parent);
      }
    }
  }
  if (parent.isVariableDeclarator()) {
    return findActionForNode(parent);
  }
  if (parent.isExportNamedDeclaration() && (path.key === 'specifiers' && isEmptyList(parent.get('specifiers')) || path.key === 'declaration' && parent.node.declaration === path.node)) {
    return findActionForNode(parent);
  }
  for (const key of ['body', 'declarations', 'specifiers']) {
    if (path.listKey === key && typeof path.key === 'number') {
      const list = parent.get(key);
      if (isEmptyList(list)) {
        return findActionForNode(parent);
      }
    }
  }
  if (parent.isTryStatement()) {
    return findActionForNode(parent);
  }
  if (!path.listKey) {
    const field = _types.NODE_FIELDS[parent.type][path.key];
    if (!validateField(parent.node, path.key, null, field)) {
      // The parent node isn't valid without this field, so we should remove it also.
      return findActionForNode(parent);
    }
  }
  for (const key of ['argument', 'block', 'body', 'callee', 'discriminant', 'expression', 'id', 'left', 'object', 'property', 'right', 'test']) {
    if (path.key === key && parent.get(key) === path) {
      return findActionForNode(parent);
    }
  }
  return ['remove', path];
}

// @babel/preset-typescript transpiles enums, but doesn't reference used identifiers.
function referenceEnums(program) {
  /*
   * We are looking for transpiled enums.
   *   (function (Colors) {
   *     Colors["BLUE"] = "#27509A";
   *   })(Colors || (Colors = {}));
   */
  program.traverse({
    ExpressionStatement(expressionStatement) {
      const expression = expressionStatement.get('expression');
      if (!expression.isCallExpression()) return;
      const callee = expression.get('callee');
      const args = expression.get('arguments');
      if (!callee.isFunctionExpression() || args.length !== 1) return;
      const [arg] = args;
      if (arg.isLogicalExpression({
        operator: '||'
      })) {
        referenceAll(arg);
      }
    }
  });
}
const fixed = new WeakSet();
function removeUnreferenced(items) {
  const referenced = new Set();
  items.forEach(item => {
    if (!item.node || (0, _isRemoved.default)(item)) return;
    const binding = (0, _getScope.getScope)(item).getBinding(item.node.name);
    if (!binding) return;
    const hasReferences = binding.referencePaths.filter(i => !(0, _isRemoved.default)(i)).length > 0;
    if (hasReferences) {
      referenced.add(item);
      return;
    }
    const forDeleting = [binding.path, ...binding.constantViolations].map(findActionForNode).filter(_isNotNull.default).map(getPathFromAction);
    if (forDeleting.length === 0) return;
    (0, _findIdentifiers.default)(forDeleting).forEach(identifier => {
      referenced.add(identifier);
    });
    removeWithRelated(forDeleting);
  });
  const result = [...referenced];
  result.sort((a, b) => {
    var _a$node, _b$node;
    return (_a$node = a.node) === null || _a$node === void 0 ? void 0 : _a$node.name.localeCompare((_b$node = b.node) === null || _b$node === void 0 ? void 0 : _b$node.name);
  });
  return result;
}
function applyAction(action) {
  mutate(action[1], p => {
    if ((0, _isRemoved.default)(p)) return;
    if (action[0] === 'remove') {
      p.remove();
    }
    if (action[0] === 'replace') {
      p.replaceWith(action[2]);
    }
  });
}
function removeWithRelated(paths) {
  if (paths.length === 0) return;
  const rootPath = (0, _getScope.getScope)(paths[0]).getProgramParent().path;
  if (!fixed.has(rootPath)) {
    // Some libraries don't care about bindings, references, and other staff
    // So we have to fix the scope before we can detect unused code
    referenceEnums(rootPath);
    fixed.add(rootPath);
  }
  const actions = paths.map(findActionForNode).filter(_isNotNull.default);
  const affectedPaths = actions.map(getPathFromAction);
  let referencedIdentifiers = (0, _findIdentifiers.default)(affectedPaths, 'referenced');
  referencedIdentifiers.sort((a, b) => {
    var _a$node2, _b$node2;
    return (_a$node2 = a.node) === null || _a$node2 === void 0 ? void 0 : _a$node2.name.localeCompare((_b$node2 = b.node) === null || _b$node2 === void 0 ? void 0 : _b$node2.name);
  });
  const referencesOfBinding = (0, _findIdentifiers.default)(affectedPaths, 'binding').map(i => {
    var _ref;
    return (_ref = i.node && (0, _getScope.getScope)(i).getBinding(i.node.name)) !== null && _ref !== void 0 ? _ref : null;
  }).filter(_isNotNull.default).reduce((acc, i) => [...acc, ...i.referencePaths.filter(_findIdentifiers.nonType)], []);
  actions.forEach(applyAction);
  removeWithRelated(referencesOfBinding);
  let clean = false;
  while (!clean && referencedIdentifiers.length > 0) {
    const referenced = removeUnreferenced(referencedIdentifiers);
    clean = referenced.map(i => {
      var _i$node;
      return (_i$node = i.node) === null || _i$node === void 0 ? void 0 : _i$node.name;
    }).join('|') === referencedIdentifiers.map(i => {
      var _i$node2;
      return (_i$node2 = i.node) === null || _i$node2 === void 0 ? void 0 : _i$node2.name;
    }).join('|');
    referencedIdentifiers = referenced;
  }
}
function mutate(path, fn) {
  const dereferenced = dereferenceAll(path);
  const mutated = fn(path);
  referenceAll(path);
  mutated === null || mutated === void 0 ? void 0 : mutated.forEach(p => referenceAll(p));
  const dead = dereferenced.filter(p => !isReferenced(p));
  const forDeleting = [];
  dead.forEach(binding => {
    const assignments = [binding.path, ...binding.constantViolations];
    assignments.forEach(assignment => {
      const {
        scope
      } = assignment;
      const declared = Object.values(assignment.getOuterBindingIdentifiers(false));
      if (declared.length === 1 && 'name' in declared[0] && declared[0].name === binding.identifier.name) {
        // Only one identifier is declared, so we can remove the whole declaration
        forDeleting.push(assignment);
        return;
      }
      if (declared.every(identifier => {
        var _scope$getBinding;
        return identifier.type === 'Identifier' && !((_scope$getBinding = scope.getBinding(identifier.name)) !== null && _scope$getBinding !== void 0 && _scope$getBinding.referenced);
      })) {
        // No other identifier is referenced, so we can remove the whole declaration
        forDeleting.push(assignment);
        return;
      }

      // We can't remove the binding, but we can remove the part of it
      assignment.traverse({
        Identifier(identifier) {
          if (identifier.node.name === binding.identifier.name) {
            const parent = identifier.parentPath;
            if (parent.isArrayPattern() && identifier.listKey === 'elements' && typeof identifier.key === 'number') {
              parent.node.elements[identifier.key] = null;
            } else if (parent.isObjectProperty()) {
              forDeleting.push(parent);
            }
          }
        }
      });
    });
  });
  removeWithRelated(forDeleting);
}
//# sourceMappingURL=scopeHelpers.js.map