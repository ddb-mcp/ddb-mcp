import { BrowserContext } from "playwright";
export type SearchCategory = "spells" | "monsters" | "items" | "races" | "classes" | "feats" | "all";
export declare function search(context: BrowserContext, query: string, category?: SearchCategory): Promise<string>;
//# sourceMappingURL=search.d.ts.map