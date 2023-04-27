declare type Warning = {
    rule?: string;
    text: string;
    severity: 'error' | 'warning';
    line: number;
    column: number;
};
declare type LintResult = {
    errored: boolean;
    warnings: Warning[];
};
declare function preprocessor(): {
    code(input: string, filename: string): Promise<string>;
    result(result: LintResult, filename: string): LintResult;
};
export default preprocessor;
