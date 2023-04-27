/**
 * This file contains a Rollup loader for Linaria.
 * It uses the transform.ts function to generate class names from source code,
 * returns transformed code without template literals and attaches generated source maps
 */
import type { Plugin } from 'rollup';
import type { PluginOptions, Preprocessor } from '@linaria/babel-preset';
declare type RollupPluginOptions = {
    include?: string | string[];
    exclude?: string | string[];
    sourceMap?: boolean;
    preprocessor?: Preprocessor;
} & Partial<PluginOptions>;
export default function linaria({ include, exclude, sourceMap, preprocessor, ...rest }?: RollupPluginOptions): Plugin;
export {};
