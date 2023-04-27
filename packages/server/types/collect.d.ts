declare type CollectResult = {
    critical: string;
    other: string;
};
interface ClassnameModifiers {
    ignoredClasses?: string[];
    blockedClasses?: string[];
}
/**
 * This utility extracts critical CSS from given HTML and CSS file to be used in SSR environments
 * @param {string} html the HTML from which classes will be parsed
 * @param {string} css the CSS file from which selectors will be parsed and determined as critical or other
 * @param {string[]} ignoredClasses classes that, when present in the HTML, will not be included in the regular expression used to match selectors
 * @param {string[]} blockedClasses classes that, when contained in a selector, will cause the selector to be marked as not critical
 * @returns {CollectResult} object containing the critical and other CSS styles
 */
export default function collect(html: string, css: string, classnameModifiers?: ClassnameModifiers): CollectResult;
export {};
