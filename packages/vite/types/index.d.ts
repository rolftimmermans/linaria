/**
 * This file contains a Rollup loader for Linaria.
 * It uses the transform.ts function to generate class names from source code,
 * returns transformed code without template literals and attaches generated source maps
 */
import type { FilterPattern } from '@rollup/pluginutils';
import type { Plugin } from 'vite';
import type { PluginOptions, Preprocessor } from '@linaria/babel-preset';
declare type VitePluginOptions = {
    include?: FilterPattern;
    exclude?: FilterPattern;
    sourceMap?: boolean;
    preprocessor?: Preprocessor;
} & Partial<PluginOptions>;
export { Plugin };
export default function linaria({ include, exclude, sourceMap, preprocessor, ...rest }?: VitePluginOptions): Plugin;
