import { BrowserContext } from "playwright";
export declare function listLibrary(context: BrowserContext): Promise<string>;
export declare function readBook(context: BrowserContext, bookSlug: string, chapterSlug?: string): Promise<string>;
//# sourceMappingURL=library.d.ts.map