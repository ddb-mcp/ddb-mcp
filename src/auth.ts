import { BrowserContext, Page } from "playwright";
import { saveSession, isLoggedIn, getPage } from "./browser.js";

export async function login(context: BrowserContext): Promise<string> {
  const page = await getPage(context);

  // Navigate to D&D Beyond and check if already logged in
  await page.goto("https://www.dndbeyond.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);

  if (await isLoggedIn(page)) {
    // Save session to disk even when already logged in, so it persists across restarts
    await saveSession(context);
    return "Already logged in. Session is active.";
  }

  // Navigate directly to the DDB login page — this ensures the return_to URL
  // is set correctly to the main DDB site (not a support page).
  // The browser window is non-headless, so the user can complete login manually.
  console.error("[ddb-mcp] Opening D&D Beyond login page. Please complete login in the browser window.");
  await page.goto("https://www.dndbeyond.com/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Poll until the browser lands back on www.dndbeyond.com (not the login page).
  // This handles the full Wizards ID redirect flow automatically.
  try {
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        return (
          url.startsWith("https://www.dndbeyond.com") &&
          !url.includes("/login") &&
          !url.includes("/sign-in")
        );
      },
      { timeout: 180000, polling: 2000 }
    );
  } catch {
    throw new Error("Login timed out. Please complete login in the browser window and try again.");
  }

  await page.waitForTimeout(2000);

  // Verify login succeeded by checking the current page
  const loggedIn = await checkLoggedInOnCurrentPage(page);
  if (!loggedIn) {
    throw new Error(
      "Login may not have completed successfully. Please try again or check if DDB requires additional verification."
    );
  }

  // Save session to disk
  await saveSession(context);
  return "Successfully logged in to D&D Beyond. Session saved to disk.";
}

// Check login state on the page that's already loaded — does not navigate.
async function checkLoggedInOnCurrentPage(page: Page): Promise<boolean> {
  try {
    return await page.evaluate(() => {
      // If there's a visible "Sign In" / "Log In" button, we're not logged in
      const allElements = Array.from(document.querySelectorAll("a, button"));
      const signInEl = allElements.find((el) => {
        const text = (el.textContent || "").trim().toLowerCase();
        return text === "sign in" || text === "log in";
      });
      return !signInEl;
    });
  } catch {
    return false;
  }
}
