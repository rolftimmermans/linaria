"use strict";

var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _glob = _interopRequireDefault(require("glob"));
var _mkdirp = _interopRequireDefault(require("mkdirp"));
var _normalizePath = _interopRequireDefault(require("normalize-path"));
var _yargs = _interopRequireDefault(require("yargs"));
var _babelPreset = require("@linaria/babel-preset");
var _utils = require("@linaria/utils");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/* eslint-disable no-console */
/**
 * This file contains a CLI for Linaria.
 */

const modulesOptions = ['commonjs', 'es2015', 'es6', 'esnext', 'native'];
const argv = _yargs.default.usage('Usage: $0 [options] <files ...>').option('config', {
  alias: 'c',
  type: 'string',
  description: 'Path to a config file',
  requiresArg: true
}).option('out-dir', {
  alias: 'o',
  type: 'string',
  description: 'Output directory for the extracted CSS files',
  demandOption: true,
  requiresArg: true
}).option('source-maps', {
  alias: 's',
  type: 'boolean',
  description: 'Generate source maps for the CSS files',
  default: false
}).option('source-root', {
  alias: 'r',
  type: 'string',
  description: 'Directory containing the source JS files',
  demandOption: true,
  requiresArg: true
}).option('insert-css-requires', {
  alias: 'i',
  type: 'string',
  description: 'Directory containing JS files to insert require statements for the CSS files',
  requiresArg: true
}).option('transform', {
  alias: 't',
  type: 'boolean',
  description: 'Replace template tags with evaluated values'
}).option('modules', {
  alias: 'm',
  choices: modulesOptions,
  description: 'Specifies a type of used imports',
  default: 'commonjs',
  coerce: s => s.toLowerCase()
}).implies('insert-css-requires', 'source-root').implies('transform', 'insert-css-requires').option('ignore', {
  alias: 'x',
  type: 'string',
  description: 'Pattern of files to ignore. Be sure to provide a string',
  requiresArg: true
}).alias('help', 'h').alias('version', 'v').parseSync();
function resolveRequireInsertionFilename(filename) {
  return filename.replace(/\.tsx?/, '.js');
}
function resolveOutputFilename(filename, outDir, sourceRoot) {
  const outputFolder = _path.default.relative(sourceRoot, _path.default.dirname(filename));
  const outputBasename = _path.default.basename(filename).replace(_path.default.extname(filename), '.css');
  return _path.default.join(outDir, outputFolder, outputBasename);
}
async function processFiles(files, options) {
  const startedAt = performance.now();
  let count = 0;
  const resolvedFiles = files.reduce((acc, pattern) => [...acc, ..._glob.default.sync(pattern.toString(), {
    absolute: true,
    ignore: options.ignore
  })], []);
  const cache = new _babelPreset.TransformCacheCollection();
  const timings = new Map();
  const addTiming = (key, value) => {
    timings.set(key, Math.round((timings.get(key) || 0) + value));
  };
  const startTimes = new Map();
  const onEvent = unknownEvent => {
    const ev = unknownEvent;
    const [, stage, type] = ev.type.split(':');
    if (type === 'start') {
      startTimes.set(ev.filename, performance.now());
      startTimes.set(stage, performance.now());
    } else {
      const startTime = startTimes.get(ev.filename);
      if (startTime) {
        addTiming(ev.filename, performance.now() - startTime);
      }
      const stageStartTime = startTimes.get(stage);
      if (stageStartTime) {
        addTiming(stage, performance.now() - stageStartTime);
      }
    }
  };
  const modifiedFiles = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const filename of resolvedFiles) {
    if (_fs.default.lstatSync(filename).isDirectory()) {
      return;
    }
    const outputFilename = resolveOutputFilename(filename, options.outDir, options.sourceRoot);

    // eslint-disable-next-line no-await-in-loop
    const {
      code,
      cssText,
      sourceMap,
      cssSourceMapText
    } = await (0, _babelPreset.transform)(_fs.default.readFileSync(filename).toString(), {
      filename,
      outputFilename,
      pluginOptions: {
        configFile: options.configFile
      },
      root: options.sourceRoot
    }, _utils.asyncResolveFallback, {}, cache, onEvent);
    if (cssText) {
      _mkdirp.default.sync(_path.default.dirname(outputFilename));
      const cssContent = options.sourceMaps && sourceMap ? `${cssText}\n/*# sourceMappingURL=${outputFilename}.map */` : cssText;
      _fs.default.writeFileSync(outputFilename, cssContent);
      if (options.sourceMaps && sourceMap && typeof cssSourceMapText !== 'undefined') {
        _fs.default.writeFileSync(`${outputFilename}.map`, cssSourceMapText);
      }
      if (options.sourceRoot && options.insertCssRequires) {
        const inputFilename = _path.default.resolve(options.insertCssRequires, _path.default.relative(options.sourceRoot, filename));
        const relativePath = (0, _normalizePath.default)(_path.default.relative(_path.default.dirname(inputFilename), outputFilename));
        const pathForImport = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
        const statement = options.modules === 'commonjs' ? `\nrequire('${pathForImport}');` : `\nimport "${pathForImport}";`;
        const normalizedInputFilename = resolveRequireInsertionFilename(inputFilename);
        const inputContent = options.transform ? code : _fs.default.readFileSync(normalizedInputFilename, 'utf-8');
        if (!inputContent.trim().endsWith(statement)) {
          modifiedFiles.push({
            name: normalizedInputFilename,
            content: `${inputContent}\n${statement}\n`
          });
        }
      }
      count += 1;
    }
  }
  modifiedFiles.forEach(({
    name,
    content
  }) => {
    _fs.default.writeFileSync(name, content);
  });
  console.log(`Successfully extracted ${count} CSS files.`);
  console.log(`\nTimings:`);
  console.log(`  Total: ${(performance.now() - startedAt).toFixed()}ms`);
  console.log(`\n  By stages:`);
  let stage = 1;
  while (timings.has(`stage-${stage}`)) {
    console.log(`    Stage ${stage}: ${timings.get(`stage-${stage}`)}ms`);
    timings.delete(`stage-${stage}`);
    stage += 1;
  }
  console.log('\n  By files:');
  const byFiles = Array.from(timings.entries());
  byFiles.sort(([, a], [, b]) => b - a);
  byFiles.forEach(([filename, time]) => {
    var _options$sourceRoot;
    const relativeFilename = _path.default.relative((_options$sourceRoot = options.sourceRoot) !== null && _options$sourceRoot !== void 0 ? _options$sourceRoot : process.cwd(), filename);
    console.log(`    ${relativeFilename}: ${time}ms`);
  });
}
processFiles(argv._, {
  configFile: argv.config,
  ignore: argv.ignore,
  insertCssRequires: argv['insert-css-requires'],
  modules: argv.modules,
  outDir: argv['out-dir'],
  sourceMaps: argv['source-maps'],
  sourceRoot: argv['source-root'],
  transform: argv.transform
});
//# sourceMappingURL=linaria.js.map