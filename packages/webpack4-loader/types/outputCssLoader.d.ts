import loaderUtils from 'loader-utils';
declare type LoaderContext = Parameters<typeof loaderUtils.getOptions>[0];
export default function outputCssLoader(this: LoaderContext): Promise<void>;
export {};