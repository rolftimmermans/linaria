import type { SourceLocation } from '@babel/types';
import type { IProps } from '@linaria/react/processors/styled';
import StyledProcessor from '@linaria/react/processors/styled';
import type { Rules, ValueCache } from '@linaria/tags';
export default class AtomicStyledProcessor extends StyledProcessor {
    #private;
    private get classes();
    extractRules(valueCache: ValueCache, cssText: string, loc?: SourceLocation | null): Rules;
    protected getProps(): IProps;
    protected getVariableId(source: string, unit: string, precedingCss: string): string;
}
