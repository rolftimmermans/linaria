import type { LinariaClassName } from '@linaria/core';
import type { CSSProperties } from './CSSProperties';
declare type CSS = (strings: TemplateStringsArray, ...exprs: Array<string | number | CSSProperties>) => LinariaClassName;
export declare const css: CSS;
export default css;
