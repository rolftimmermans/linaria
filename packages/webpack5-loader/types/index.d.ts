/**
 * This file contains a Webpack loader for Linaria.
 * It uses the transform.ts function to generate class names from source code,
 * returns transformed code without template literals and attaches generated source maps
 */
import type { RawLoaderDefinitionFunction } from 'webpack';
import type { Preprocessor } from '@linaria/babel-preset';
import type { ICache } from './cache';
declare type Loader = RawLoaderDefinitionFunction<{
    sourceMap?: boolean;
    preprocessor?: Preprocessor;
    extension?: string;
    cacheProvider?: string | ICache;
}>;
declare const webpack5Loader: Loader;
export default webpack5Loader;