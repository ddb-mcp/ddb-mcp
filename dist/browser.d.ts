import { Browser, BrowserContext, Page } from "playwright";
export declare const SESSION_DIR: string;
export declare const SESSION_PATH: string;
export declare function getBrowser(): Promise<Browser>;
export declare function getContext(browser: Browser): Promise<BrowserContext>;
export declare function saveSession(context: BrowserContext): Promise<void>;
export declare function isLoggedIn(page: Page): Promise<boolean>;
export declare function getPage(context: BrowserContext): Promise<Page>;
export declare function closeBrowser(): Promise<void>;
//# sourceMappingURL=browser.d.ts.map