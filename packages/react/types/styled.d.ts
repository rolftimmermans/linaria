import React from 'react';
import type { CSSProperties } from '@linaria/core';
import type { StyledMeta } from '@linaria/tags';
export declare type NoInfer<A> = [A][A extends any ? 0 : never];
declare type Component<TProps> = ((props: TProps) => unknown) | {
    new (props: TProps): unknown;
};
declare type Has<T, TObj> = [T] extends [TObj] ? T : T & TObj;
export declare const omit: <T extends Record<string, unknown>, TKeys extends keyof T>(obj: T, keys: TKeys[]) => Omit<T, TKeys>;
declare function styled(componentWithStyle: () => any): (error: 'The target component should have a className prop') => void;
declare function styled<TProps extends Has<TMustHave, {
    style?: React.CSSProperties;
}>, TMustHave extends {
    style?: React.CSSProperties;
}, TConstructor extends Component<TProps>>(componentWithStyle: TConstructor & Component<TProps>): ComponentStyledTagWithInterpolation<TProps, TConstructor>;
declare function styled<TProps extends Has<TMustHave, {
    className?: string;
}>, TMustHave extends {
    className?: string;
}, TConstructor extends Component<TProps>>(componentWithoutStyle: TConstructor & Component<TProps>): ComponentStyledTagWithoutInterpolation<TConstructor>;
declare function styled<TName extends keyof JSX.IntrinsicElements>(tag: TName): HtmlStyledTag<TName>;
declare function styled(component: 'The target component should have a className prop'): never;
declare type StyledComponent<T> = StyledMeta & ([T] extends [React.FunctionComponent<any>] ? T : React.FunctionComponent<T & {
    as?: React.ElementType;
}>);
declare type StaticPlaceholder = string | number | CSSProperties | StyledMeta;
declare type HtmlStyledTag<TName extends keyof JSX.IntrinsicElements> = <TAdditionalProps = Record<never, unknown>>(strings: TemplateStringsArray, ...exprs: Array<StaticPlaceholder | ((props: JSX.IntrinsicElements[TName] & Omit<TAdditionalProps, never>) => string | number)>) => StyledComponent<JSX.IntrinsicElements[TName] & TAdditionalProps>;
declare type ComponentStyledTagWithoutInterpolation<TOrigCmp> = (strings: TemplateStringsArray, ...exprs: Array<StaticPlaceholder | ((props: 'The target component should have a style prop') => never)>) => StyledMeta & TOrigCmp;
declare type ComponentStyledTagWithInterpolation<TTrgProps, TOrigCmp> = <OwnProps = {}>(strings: TemplateStringsArray, ...exprs: Array<StaticPlaceholder | ((props: NoInfer<OwnProps & TTrgProps>) => string | number)>) => keyof OwnProps extends never ? StyledMeta & TOrigCmp : StyledComponent<OwnProps & TTrgProps>;
export declare type StyledJSXIntrinsics = {
    readonly [P in keyof JSX.IntrinsicElements]: HtmlStyledTag<P>;
};
export declare type Styled = typeof styled & StyledJSXIntrinsics;
declare const _default: Styled;
export default _default;