import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
export const SESSION_DIR = join(homedir(), ".config", "ddb-mcp");
export const SESSION_PATH = join(SESSION_DIR, "session.json");
let browserInstance = null;
let contextInstance = null;
export async function getBrowser() {
    if (browserInstance)
        return browserInstance;
    browserInstance = await chromium.launch({
        headless: false,
        args: [
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
        ],
    });
    return browserInstance;
}
export async function getContext(browser) {
    if (contextInstance)
        return contextInstance;
    if (!existsSync(SESSION_DIR)) {
        mkdirSync(SESSION_DIR, { recursive: true });
    }
    if (existsSync(SESSION_PATH)) {
        contextInstance = await browser.newContext({
            storageState: SESSION_PATH,
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport: { width: 1280, height: 800 },
        });
    }
    else {
        contextInstance = await browser.newContext({
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport: { width: 1280, height: 800 },
        });
    }
    return contextInstance;
}
export async function saveSession(context) {
    if (!existsSync(SESSION_DIR)) {
        mkdirSync(SESSION_DIR, { recursive: true });
    }
    await context.storageState({ path: SESSION_PATH });
}
export async function isLoggedIn(page) {
    try {
        await page.goto("https://www.dndbeyond.com", { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(2000);
        // If we got redirected off dndbeyond.com (e.g. to Wizards login), we're not logged in
        const currentUrl = page.url();
        if (!currentUrl.includes("dndbeyond.com") || currentUrl.includes("/login") || currentUrl.includes("/sign-in")) {
            return false;
        }
        // Check for visible "Sign In" / "Log In" text — these only appear when NOT logged in
        return await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll("a, button"));
            const signInEl = allElements.find((el) => {
                const text = (el.textContent || "").trim().toLowerCase();
                return text === "sign in" || text === "log in";
            });
            return !signInEl;
        });
    }
    catch {
        return false;
    }
}
export async function getPage(context) {
    const pages = context.pages();
    if (pages.length > 0)
        return pages[0];
    return context.newPage();
}
export async function closeBrowser() {
    if (contextInstance) {
        await contextInstance.close();
        contextInstance = null;
    }
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
}
//# sourceMappingURL=browser.js.map