"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uvCounters = exports.uptime = exports.umask = exports.title = exports.platform = exports.pid = exports.nextTick = exports.memoryUsage = exports.kill = exports.features = exports.exit = exports.execPath = exports.env = exports.dlopen = exports.cwd = exports.chdir = exports.browser = exports.binding = exports.argv = exports.arch = void 0;
/**
 * It contains API for mocked process variable available in node environment used to evaluate scripts with node's `vm` in ./module.ts
 */
const nextTick = fn => setTimeout(fn, 0);
exports.nextTick = nextTick;
const platform = 'browser';
exports.platform = platform;
const arch = 'browser';
exports.arch = arch;
const execPath = 'browser';
exports.execPath = execPath;
const title = 'browser';
exports.title = title;
const pid = 1;
exports.pid = pid;
const browser = true;
exports.browser = browser;
const argv = [];
exports.argv = argv;
const binding = function binding() {
  throw new Error('No such module. (Possibly not yet loaded)');
};
exports.binding = binding;
const cwd = () => '/';
exports.cwd = cwd;
const noop = () => {};
const exit = noop;
exports.exit = exit;
const kill = noop;
exports.kill = kill;
const chdir = noop;
exports.chdir = chdir;
const umask = noop;
exports.umask = umask;
const dlopen = noop;
exports.dlopen = dlopen;
const uptime = noop;
exports.uptime = uptime;
const memoryUsage = noop;
exports.memoryUsage = memoryUsage;
const uvCounters = noop;
exports.uvCounters = uvCounters;
const features = {};
exports.features = features;
const {
  env
} = process;
exports.env = env;
//# sourceMappingURL=process.js.map