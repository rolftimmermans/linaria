/**
 * This file contains an esbuild loader for Linaria.
 * It uses the transform.ts function to generate class names from source code,
 * returns transformed code without template literals and attaches generated source maps
 */
import type { Plugin, TransformOptions } from 'esbuild';
import type { PluginOptions, Preprocessor } from '@linaria/babel-preset';
declare type EsbuildPluginOptions = {
    sourceMap?: boolean;
    preprocessor?: Preprocessor;
    esbuildOptions?: TransformOptions;
} & Partial<PluginOptions>;
export default function linaria({ sourceMap, preprocessor, esbuildOptions, ...rest }?: EsbuildPluginOptions): Plugin;
export {};
