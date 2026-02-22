import { BrowserContext } from "playwright";
import { getPage } from "../browser.js";

export async function navigate(context: BrowserContext, url: string): Promise<string> {
  const page = await getPage(context);

  // Only allow D&D Beyond URLs
  if (!url.startsWith("https://www.dndbeyond.com") && !url.startsWith("https://dndbeyond.com")) {
    throw new Error("Only D&D Beyond URLs (https://www.dndbeyond.com/...) are supported.");
  }

  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);

  // Extract page text content and convert to readable markdown-ish format
  const content = await page.evaluate(() => {
    // Remove scripts and styles
    document.querySelectorAll("script, style, nav, footer, .ad-container, .advertisement").forEach((el) =>
      el.remove()
    );

    // Try to get the main content area
    const main =
      document.querySelector("main, article, .main-content, .page-content, #content") ?? document.body;

    return (main as HTMLElement).innerText;
  });

  const truncated = content.length > 8000 ? content.slice(0, 8000) + "\n\n[Content truncated — use ddb_read_book or a more specific URL to get full content]" : content;

  return `URL: ${url}\n\n${truncated}`;
}

export async function interact(
  context: BrowserContext,
  action: "click" | "fill" | "screenshot",
  selector: string,
  value?: string
): Promise<string> {
  const page = await getPage(context);

  switch (action) {
    case "click": {
      await page.locator(selector).first().click();
      await page.waitForTimeout(1000);
      return `Clicked element: ${selector}`;
    }

    case "fill": {
      if (value === undefined) throw new Error("'value' is required for fill action.");
      await page.locator(selector).first().fill(value);
      await page.waitForTimeout(500);
      return `Filled '${selector}' with: ${value}`;
    }

    case "screenshot": {
      const screenshotPath = `/tmp/ddb-screenshot-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      return `Screenshot saved to: ${screenshotPath}`;
    }

    default:
      throw new Error(`Unknown action: ${action}. Use 'click', 'fill', or 'screenshot'.`);
  }
}

export async function getCurrentPageContent(context: BrowserContext): Promise<string> {
  const page = await getPage(context);
  const url = page.url();
  const content = await page.evaluate(() => {
    document.querySelectorAll("script, style, nav, footer, .ad-container").forEach((el) => el.remove());
    const main =
      document.querySelector("main, article, .main-content, .page-content") ?? document.body;
    return (main as HTMLElement).innerText;
  });

  const truncated = content.length > 8000 ? content.slice(0, 8000) + "\n[truncated]" : content;
  return `Current URL: ${url}\n\n${truncated}`;
}
