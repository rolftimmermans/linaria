import type { Visitor } from '@babel/traverse';
import type { Core } from '../babel';
export default function dynamic({ types: t }: Core): {
    inherits: unknown;
    visitor: Visitor;
};