/**
 * This is a custom implementation for the module system for evaluating code,
 * used for resolving values for dependencies interpolated in `css` or `styled`.
 *
 * This serves 2 purposes:
 * - Avoid leakage from evaluated code to module cache in current context, e.g. `babel-register`
 * - Allow us to invalidate the module cache without affecting other stuff, necessary for rebuilds
 *
 * We also use it to transpile the code with Babel by default.
 * We also store source maps for it to provide correct error stacktraces.
 *
 */

import fs from 'fs';
import NativeModule from 'module';
import path from 'path';
import vm from 'vm';
import * as babel from '@babel/core';
import { createCustomDebug } from '@linaria/logger';
import { buildOptions, getFileIdx } from '@linaria/utils';
import { TransformCacheCollection } from './cache';
import * as process from './process';
export const DefaultModuleImplementation = NativeModule;

// Supported node builtins based on the modules polyfilled by webpack
// `true` means module is polyfilled, `false` means module is empty
const builtins = {
  assert: true,
  buffer: true,
  child_process: false,
  cluster: false,
  console: true,
  constants: true,
  crypto: true,
  dgram: false,
  dns: false,
  domain: true,
  events: true,
  fs: false,
  http: true,
  https: true,
  module: false,
  net: false,
  os: true,
  path: true,
  punycode: true,
  process: true,
  querystring: true,
  readline: false,
  repl: false,
  stream: true,
  string_decoder: true,
  sys: true,
  timers: true,
  tls: false,
  tty: true,
  url: true,
  util: true,
  vm: true,
  zlib: true
};
const VALUES = Symbol('values');
const isProxy = obj => typeof obj === 'object' && obj !== null && VALUES in obj;
const NOOP = () => {};
const padStart = (num, len) => num.toString(10).padStart(len, '0');
const hasKey = (obj, key) => (typeof obj === 'object' || typeof obj === 'function') && obj !== null && key in obj;
class Module {
  #isEvaluated = false;
  #exports;
  #lazyValues;
  tagProcessors = [];
  #resolveCache;
  #codeCache;
  #evalCache;
  constructor(filename, options, cache = new TransformCacheCollection(), debuggerDepth = 0, parentModule, moduleImpl = DefaultModuleImplementation) {
    this.debuggerDepth = debuggerDepth;
    this.parentModule = parentModule;
    this.moduleImpl = moduleImpl;
    this.idx = getFileIdx(filename);
    this.id = filename;
    this.filename = filename;
    this.options = options;
    this.imports = null;
    this.dependencies = null;
    this.transform = null;
    this.debug = createCustomDebug('module', this.idx);
    this.#resolveCache = cache.resolveCache;
    this.#codeCache = cache.codeCache;
    this.#evalCache = cache.evalCache;
    this.#lazyValues = new Map();
    const exports = {};
    this.#exports = new Proxy(exports, {
      get: (target, key) => {
        if (key === VALUES) {
          const values = {};
          this.#lazyValues.forEach((v, k) => {
            values[k] = v();
          });
          return values;
        }
        let value;
        if (this.#lazyValues.has(key)) {
          value = this.#lazyValues.get(key)?.();
        } else {
          // Support Object.prototype methods on `exports`
          // e.g `exports.hasOwnProperty`
          value = Reflect.get(target, key);
        }
        if (value === undefined && this.#lazyValues.has('default')) {
          const defaultValue = this.#lazyValues.get('default')?.();
          if (hasKey(defaultValue, key)) {
            this.debug('evaluated', '⚠️  %s has been found in `default`. It indicates that ESM to CJS conversion of %s went wrong.', key, filename);
            value = defaultValue[key];
          }
        }
        this.debug('evaluated', 'get %s: %o', key, value);
        return value;
      },
      has: (target, key) => {
        if (key === VALUES) return true;
        return this.#lazyValues.has(key);
      },
      ownKeys: () => {
        return Array.from(this.#lazyValues.keys());
      },
      set: (target, key, value) => {
        if (value !== undefined) {
          if (key !== '__esModule') {
            this.debug('evaluated', 'set %s: %o', key, value);
          }
          this.#lazyValues.set(key, () => value);
        }
        return true;
      },
      defineProperty: (target, key, descriptor) => {
        const {
          value
        } = descriptor;
        if (value !== undefined) {
          this.#lazyValues.set(key, () => value);
          if (key !== '__esModule') {
            this.debug('evaluated', 'defineProperty %s with value %o', key, value);
          }
          this.#lazyValues.set(key, () => value);
          return true;
        }
        if ('get' in descriptor) {
          this.#lazyValues.set(key, descriptor.get);
          this.debug('evaluated', 'defineProperty %s with getter', key);
        }
        return true;
      },
      getOwnPropertyDescriptor: (target, key) => {
        if (this.#lazyValues.has(key)) return {
          enumerable: true,
          configurable: true
        };
        return undefined;
      }
    });
    this.extensions = options.extensions;
    this.debug('init', filename);
  }
  get exports() {
    return this.#exports;
  }
  set exports(value) {
    if (isProxy(value)) {
      this.#exports = value[VALUES];
    } else {
      this.#exports = value;
    }
    this.debug('evaluated', 'the whole exports was overridden with %O', this.#exports);
  }
  resolve = id => {
    const resolveCacheKey = `${this.filename} -> ${id}`;
    if (this.#resolveCache.has(resolveCacheKey)) {
      return this.#resolveCache.get(resolveCacheKey);
    }
    const extensions = this.moduleImpl._extensions;
    const added = [];
    try {
      // Check for supported extensions
      this.extensions.forEach(ext => {
        if (ext in extensions) {
          return;
        }

        // When an extension is not supported, add it
        // And keep track of it to clean it up after resolving
        // Use noop for the transform function since we handle it
        extensions[ext] = NOOP;
        added.push(ext);
      });
      const {
        filename
      } = this;
      return this.moduleImpl._resolveFilename(id, {
        id: filename,
        filename,
        paths: this.moduleImpl._nodeModulePaths(path.dirname(filename))
      });
    } finally {
      // Cleanup the extensions we added to restore previous behaviour
      added.forEach(ext => delete extensions[ext]);
    }
  };
  require = Object.assign(id => {
    if (id in builtins) {
      // The module is in the allowed list of builtin node modules
      // Ideally we should prevent importing them, but webpack polyfills some
      // So we check for the list of polyfills to determine which ones to support
      if (builtins[id]) {
        this.debug('require', `builtin '${id}'`);
        return require(id);
      }
      return null;
    }

    // Resolve module id (and filename) relatively to parent module
    const resolved = this.resolve(id);
    const [filename, onlyList] = resolved.split('\0');
    if (filename === id && !path.isAbsolute(id)) {
      // The module is a builtin node modules, but not in the allowed list
      throw new Error(`Unable to import "${id}". Importing Node builtins is not supported in the sandbox.`);
    }
    this.dependencies?.push(id);
    let m;
    this.debug('require', `${id} -> ${filename}`);
    if (this.#evalCache.has(filename)) {
      m = this.#evalCache.get(filename);
      this.debug('eval-cache', '✅ %r has been gotten from cache', {
        namespace: `module:${padStart(m.idx, 5)}`
      });
    } else {
      this.debug('eval-cache', `➕ %r is going to be initialized`, {
        namespace: `module:${padStart(getFileIdx(filename), 5)}`
      });
      // Create the module if cached module is not available
      m = new Module(filename, this.options, {
        codeCache: this.#codeCache,
        evalCache: this.#evalCache,
        resolveCache: this.#resolveCache
      }, this.debuggerDepth + 1, this);
      m.transform = this.transform;

      // Store it in cache at this point with, otherwise
      // we would end up in infinite loop with cyclic dependencies
      this.#evalCache.set(filename, m);
    }
    const extension = path.extname(filename);
    if (extension === '.json' || this.extensions.includes(extension)) {
      let code;
      // Requested file can be already prepared for evaluation on the stage 1
      if (onlyList && this.#codeCache.has(filename)) {
        const cached = this.#codeCache.get(filename);
        const only = onlyList.split(',').filter(token => !m.#lazyValues.has(token));
        const cachedOnly = new Set(cached?.only ?? []);
        const isMatched = cachedOnly.has('*') || only && only.every(token => cachedOnly.has(token));
        if (cached && isMatched) {
          m.debug('code-cache', '✅');
          code = cached.result.code;
        } else {
          m.debug('code-cache', '%o is missing (%o were cached)', only?.filter(token => !cachedOnly.has(token)) ?? [], [...cachedOnly.values()]);
        }
      } else if (m.#isEvaluated) {
        m.debug('code-cache', '✅ not in the code cache, but is already evaluated');
      } else {
        // If code wasn't extracted from cache, read it from the file system
        // and transpile it.
        m.debug('code-cache', '❌ file has not been processed during prepare stage');
        if (/\.json$/.test(filename)) {
          code = fs.readFileSync(filename, 'utf-8');
        } else {
          const transformConfig = buildOptions({
            envName: 'linaria',
            plugins: [],
            sourceMaps: true,
            sourceFileName: filename,
            inputSourceMap: this.options.babelOptions.inputSourceMap,
            root: this.options.babelOptions.root,
            babelrc: false,
            configFile: false
          });
          const result = babel.transformFileSync(filename, {
            ...transformConfig,
            filename
          });
          if (!result) {
            throw new Error('Babel transform failed');
          }
          if (result.code) {
            code = result.code;
          }
        }
      }
      if (code) {
        if (/\.json$/.test(filename)) {
          // For JSON files, parse it to a JS object similar to Node
          m.exports = JSON.parse(code);
          m.#isEvaluated = true;
        } else {
          // For JS/TS files, evaluate the module
          m.evaluate(code);
        }
      }
    } else {
      // For non JS/JSON requires, just export the id
      // This is to support importing assets in webpack
      // The module will be resolved by css-loader
      m.exports = filename;
      m.#isEvaluated = true;
    }
    return m.exports;
  }, {
    ensure: NOOP,
    resolve: this.resolve
  });
  evaluate(source) {
    if (!source) {
      this.debug(`evaluate`, 'there is nothing to evaluate');
    }
    if (this.#isEvaluated) {
      this.debug('evaluate', `is already evaluated`);
      return;
    }
    this.debug('evaluate', `\n${source}`);
    this.#isEvaluated = true;
    const {
      filename
    } = this;
    const context = vm.createContext({
      clearImmediate: NOOP,
      clearInterval: NOOP,
      clearTimeout: NOOP,
      setImmediate: NOOP,
      setInterval: NOOP,
      setTimeout: NOOP,
      global,
      process,
      module: this,
      exports: this.#exports,
      require: this.require,
      __filename: filename,
      __dirname: path.dirname(filename)
    });
    try {
      const script = new vm.Script(`(function (exports) { ${source}\n})(exports);`, {
        filename
      });
      script.runInContext(context);
      return;
    } catch (e) {
      if (e instanceof EvalError) {
        throw e;
      }
      const callstack = ['', filename];
      let module = this.parentModule;
      while (module) {
        callstack.push(module.filename);
        module = module.parentModule;
      }
      this.debug('evaluate:error', '%O\n%O', e, callstack);
      throw new EvalError(`${e.message} in${callstack.join('\n| ')}\n`);
    }
  }
}
export default Module;
//# sourceMappingURL=module.js.map