import type webpack from 'webpack';
import type { ICache } from './cache';
export default function outputCssLoader(this: webpack.LoaderContext<{
    cacheProvider: string | ICache | undefined;
}>): Promise<void>;