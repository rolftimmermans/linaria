export interface ICache {
    get: (key: string) => Promise<string>;
    set: (key: string, value: string) => Promise<void>;
    getDependencies?: (key: string) => Promise<string[]>;
    setDependencies?: (key: string, value: string[]) => Promise<void>;
}
declare class MemoryCache implements ICache {
    private cache;
    private dependenciesCache;
    get(key: string): Promise<string>;
    set(key: string, value: string): Promise<void>;
    getDependencies(key: string): Promise<string[]>;
    setDependencies(key: string, value: string[]): Promise<void>;
}
export declare const memoryCache: MemoryCache;
/**
 * return cache instance from `options.cacheProvider`
 * @param cacheProvider string | ICache | undefined
 * @returns ICache instance
 */
export declare const getCacheInstance: (cacheProvider: string | ICache | undefined) => Promise<ICache>;
export {};
