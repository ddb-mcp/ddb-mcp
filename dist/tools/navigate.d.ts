import { BrowserContext } from "playwright";
export declare function navigate(context: BrowserContext, url: string): Promise<string>;
export declare function interact(context: BrowserContext, action: "click" | "fill" | "screenshot", selector: string, value?: string): Promise<string>;
export declare function getCurrentPageContent(context: BrowserContext): Promise<string>;
//# sourceMappingURL=navigate.d.ts.map