import { getPage, isLoggedIn } from "../browser.js";
export async function listLibrary(context) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    await page.goto("https://www.dndbeyond.com/en/library?type=sourcebooks&ownership=owned-shared", {
        waitUntil: "networkidle",
        timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const books = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll("div[data-testid='sourceCard']").forEach((card) => {
            const titleEl = card.querySelector("a[class*='SourceCard_sourceTitle']");
            const title = titleEl?.textContent?.trim() ?? "";
            const href = titleEl?.href ?? "";
            const slugMatch = href.match(/\/sources\/(.+)/);
            const slug = slugMatch?.[1] ?? "";
            const ownership = card.querySelector("p[class*='SourceCard_sourceSubtitle']")?.textContent?.trim() ?? "";
            if (title)
                items.push({ title, slug, ownership, url: href });
        });
        return items;
    });
    return JSON.stringify({ count: books.length, books }, null, 2);
}
// Marker inserted in front of the section the caller asked for, so the text
// can be cut there after extraction.
const SECTION_MARK = "\u0000SECTION_START\u0000";
export async function readBook(context, bookSlug, chapterSlug, section, offset = 0, maxChars = 12000) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    // Accept "chapter-slug#Anchor" exactly as listed in the table of contents.
    let chapterPath = chapterSlug;
    let anchor = section;
    if (chapterPath && chapterPath.includes("#")) {
        const hashAt = chapterPath.indexOf("#");
        const hash = chapterPath.slice(hashAt + 1);
        chapterPath = chapterPath.slice(0, hashAt) || undefined;
        if (!anchor && hash)
            anchor = hash;
    }
    let url = `https://www.dndbeyond.com/sources/${bookSlug}`;
    if (chapterPath)
        url += `/${chapterPath}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
    // Wait for content to render (DDB uses heavy JS rendering)
    await page.waitForSelector("article, .content-container, .p-content-title", { timeout: 15000 }).catch(() => { });
    const result = await page.evaluate(({ bookSlug, isToc, anchor, mark }) => {
        // Remove non-content elements
        document
            .querySelectorAll("script, style, nav, header, footer, .ad-container, .sidebar, .toc, .breadcrumb")
            .forEach((el) => el.remove());
        // Try to find the main reading area
        const article = document.querySelector("article") ??
            document.querySelector(".content-container") ??
            document.querySelector(".p-content") ??
            document.querySelector("main");
        const root = article ?? document.body;
        // Find where the requested section starts: by element id first,
        // then by heading text (ignoring case, spaces and punctuation).
        let startEl = null;
        if (anchor) {
            startEl = document.getElementById(anchor);
            if (!startEl) {
                const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
                const needle = norm(anchor);
                startEl =
                    Array.from(root.querySelectorAll("h1, h2, h3, h4, h5")).find((h) => norm(h.textContent ?? "").includes(needle)) ?? null;
            }
        }
        const bookPrefix = `/sources/${bookSlug}/`;
        function render(el, tag, childText) {
            // Show heading ids so they can be passed back as `section`.
            const id = el.id ? ` {#${el.id}}` : "";
            if (["h1", "h2"].includes(tag))
                return `\n\n## ${childText.trim()}${id}\n\n`;
            if (["h3", "h4", "h5"].includes(tag))
                return `\n\n### ${childText.trim()}${id}\n\n`;
            if (tag === "p")
                return `\n${childText.trim()}\n`;
            if (tag === "li")
                return `\n- ${childText.trim()}`;
            if (["ul", "ol"].includes(tag))
                return `\n${childText}\n`;
            if (tag === "strong" || tag === "b")
                return `**${childText}**`;
            if (tag === "em" || tag === "i")
                return `_${childText}_`;
            if (tag === "hr")
                return `\n---\n`;
            if (tag === "br")
                return "\n";
            if (tag === "table") {
                // Simplify tables to text
                return `\n[Table]\n${childText}\n`;
            }
            // On a table of contents, show each chapter link's slug.
            if (tag === "a" && isToc) {
                const href = el.getAttribute("href") ?? "";
                const at = href.indexOf(bookPrefix);
                if (at !== -1) {
                    const slug = href.slice(at + bookPrefix.length);
                    const label = childText.trim();
                    if (slug && label)
                        return `${label} \`${slug}\``;
                }
            }
            return childText;
        }
        // Extract text preserving basic structure
        function processNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent ?? "";
            }
            if (node.nodeType !== Node.ELEMENT_NODE)
                return "";
            const el = node;
            const tag = el.tagName.toLowerCase();
            if (["script", "style", "aside", "nav"].includes(tag))
                return "";
            const childText = Array.from(el.childNodes).map(processNode).join("");
            const out = render(el, tag, childText);
            return el === startEl ? mark + out : out;
        }
        return {
            text: article ? processNode(article) : document.body.innerText,
            sectionFound: anchor ? startEl !== null : true,
        };
    }, { bookSlug, isToc: !chapterPath, anchor: anchor ?? null, mark: SECTION_MARK });
    let text = result.text;
    let notice = "";
    if (anchor) {
        const at = text.indexOf(SECTION_MARK);
        if (at === -1 || !result.sectionFound) {
            notice = `[Section "${anchor}" not found on this page; showing it from the start.]\n\n`;
        }
        else {
            text = text.slice(at + SECTION_MARK.length);
        }
    }
    // Drop any leftover marker and squeeze runs of blank lines.
    text = text
        .split(SECTION_MARK)
        .join("")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const limit = Math.min(Math.max(Math.floor(maxChars) || 12000, 1000), 50000);
    const start = Math.min(Math.max(Math.floor(offset) || 0, 0), text.length);
    const slice = text.slice(start, start + limit);
    const end = start + slice.length;
    const position = start > 0 || end < text.length
        ? `\n\n[Characters ${start}–${end} of ${text.length}.${end < text.length ? ` Call again with offset=${end} to continue.` : " End of content."}]`
        : "";
    const heading = `# ${bookSlug}${chapterPath ? ` / ${chapterPath}` : ""}${anchor ? ` #${anchor}` : ""}`;
    return `${heading}\nURL: ${url}\n\n${notice}${slice}${position}`;
}
//# sourceMappingURL=library.js.map