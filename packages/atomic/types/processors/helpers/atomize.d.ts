export default function atomize(cssText: string, hasPriority?: boolean): {
    className?: string | undefined;
    cssText: string;
    property: string;
}[];
