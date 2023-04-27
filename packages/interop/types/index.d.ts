import type core from '@babel/core';
import type { NodePath } from '@babel/traverse';
import type { TaggedTemplateExpression } from '@babel/types';
export declare type Core = typeof core;
declare const _default: ({ types: t }: Core, config?: {
    library?: string | RegExp;
}) => {
    visitor: {
        TaggedTemplateExpression(path: NodePath<TaggedTemplateExpression>): void;
    };
};
export default _default;
