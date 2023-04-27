import type { TaggedTemplateExpression } from '@babel/types';
import type { Root, Document, ChildNode } from 'postcss';
/**
 * Creates an AST walker/visitor for correcting PostCSS AST locations to
 * those in the original JavaScript document.
 * @param {TaggedTemplateExpression} expr Expression the original source came
 * from
 * @return {Function}
 */
export declare function locationCorrectionWalker(expr: TaggedTemplateExpression, sourceAsString: string): (node: Document | Root | ChildNode) => void;
