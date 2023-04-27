import type { SourceLocation } from '@babel/types';
import CssProcessor from '@linaria/core/processors/css';
import type { Rules, ValueCache } from '@linaria/tags';
export default class AtomicCssProcessor extends CssProcessor {
    #private;
    private get classes();
    doRuntimeReplacement(): void;
    extractRules(valueCache: ValueCache, cssText: string, loc?: SourceLocation | null): Rules;
}
