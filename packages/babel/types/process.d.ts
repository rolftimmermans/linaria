/// <reference types="node" />
/// <reference types="node" />
/**
 * It contains API for mocked process variable available in node environment used to evaluate scripts with node's `vm` in ./module.ts
 */
export declare const nextTick: (fn: (...args: unknown[]) => void) => NodeJS.Timeout;
export declare const platform = "browser";
export declare const arch = "browser";
export declare const execPath = "browser";
export declare const title = "browser";
export declare const pid = 1;
export declare const browser = true;
export declare const argv: never[];
export declare const binding: () => never;
export declare const cwd: () => string;
export declare const exit: () => void;
export declare const kill: () => void;
export declare const chdir: () => void;
export declare const umask: () => void;
export declare const dlopen: () => void;
export declare const uptime: () => void;
export declare const memoryUsage: () => void;
export declare const uvCounters: () => void;
export declare const features: {};
export declare const env: NodeJS.ProcessEnv;