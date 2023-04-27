import type { Expression } from '@babel/types';
import type { ValueCache, Params, TailProcessorParams } from '@linaria/tags';
import { BaseProcessor } from '@linaria/tags';
export default class MakeStylesProcessor extends BaseProcessor {
    #private;
    constructor(params: Params, ...args: TailProcessorParams);
    get asSelector(): string;
    build(valueCache: ValueCache): void;
    doEvaltimeReplacement(): void;
    doRuntimeReplacement(): void;
    get value(): Expression;
    toString(): string;
}
