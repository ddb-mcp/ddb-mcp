import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getBrowser, getContext } from "./browser.js";
import { login } from "./auth.js";
import { getCharacter, downloadCharacter, scrapeCharacterSheet, listCharacters } from "./tools/character.js";
import { getCampaign, listMyCampaigns } from "./tools/campaign.js";
import { navigate, interact, getCurrentPageContent } from "./tools/navigate.js";
import { search } from "./tools/search.js";
import { listLibrary, readBook } from "./tools/library.js";
const server = new McpServer({
    name: "dndbeyond",
    version: "1.0.0",
});
// Lazy-initialized shared browser context
async function getSharedContext() {
    const browser = await getBrowser();
    const context = await getContext(browser);
    return context;
}
// ─── ddb_login ────────────────────────────────────────────────────────────────
server.tool("ddb_login", "Launch a browser and log into D&D Beyond via Google OAuth. Run this once to save your session to disk. Subsequent tool calls restore the session automatically.", {}, async () => {
    try {
        const context = await getSharedContext();
        const result = await login(context);
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Login failed: ${msg}` }], isError: true };
    }
});
// ─── ddb_list_characters ──────────────────────────────────────────────────────
server.tool("ddb_list_characters", "List all characters in your D&D Beyond account, including their ID, level, race, and class.", {}, async () => {
    try {
        const context = await getSharedContext();
        const result = await listCharacters(context);
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to list characters: ${msg}` }], isError: true };
    }
});
// ─── ddb_get_character ────────────────────────────────────────────────────────
server.tool("ddb_get_character", "Fetch full character data JSON from the D&D Beyond character service API. Requires character ID (the number in the character URL).", {
    character_id: z.string().describe("The D&D Beyond character ID (e.g. '12345678')"),
    fallback_scrape: z
        .boolean()
        .optional()
        .describe("If true, fall back to scraping the rendered character sheet HTML if the API fails"),
}, async ({ character_id, fallback_scrape }) => {
    try {
        const context = await getSharedContext();
        const data = await getCharacter(context, character_id);
        return { content: [{ type: "text", text: data }] };
    }
    catch (err) {
        if (fallback_scrape) {
            try {
                const context = await getSharedContext();
                const scraped = await scrapeCharacterSheet(context, character_id);
                return { content: [{ type: "text", text: scraped }] };
            }
            catch (scrapeErr) {
                const msg = scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr);
                return { content: [{ type: "text", text: `API and scrape both failed: ${msg}` }], isError: true };
            }
        }
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to get character: ${msg}` }], isError: true };
    }
});
// ─── ddb_download_character ───────────────────────────────────────────────────
server.tool("ddb_download_character", "Download a character's full JSON data to a local file.", {
    character_id: z.string().describe("The D&D Beyond character ID"),
    output_path: z
        .string()
        .optional()
        .describe("Full file path to save to (defaults to ~/Downloads/{name}-{id}.json)"),
}, async ({ character_id, output_path }) => {
    try {
        const context = await getSharedContext();
        const result = await downloadCharacter(context, character_id, output_path);
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Download failed: ${msg}` }], isError: true };
    }
});
// ─── ddb_get_campaign ─────────────────────────────────────────────────────────
server.tool("ddb_get_campaign", "Fetch campaign information including player characters, notes, and description from a D&D Beyond campaign page.", {
    campaign_id: z.string().describe("The D&D Beyond campaign ID (found in the campaign URL)"),
}, async ({ campaign_id }) => {
    try {
        const context = await getSharedContext();
        const data = await getCampaign(context, campaign_id);
        return { content: [{ type: "text", text: data }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to get campaign: ${msg}` }], isError: true };
    }
});
// ─── ddb_list_campaigns ───────────────────────────────────────────────────────
server.tool("ddb_list_campaigns", "List all D&D Beyond campaigns you are part of (as DM or player).", {}, async () => {
    try {
        const context = await getSharedContext();
        const data = await listMyCampaigns(context);
        return { content: [{ type: "text", text: data }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to list campaigns: ${msg}` }], isError: true };
    }
});
// ─── ddb_navigate ─────────────────────────────────────────────────────────────
server.tool("ddb_navigate", "Navigate to any D&D Beyond URL and return the page's text content. Only dndbeyond.com URLs are allowed.", {
    url: z
        .string()
        .describe("Full D&D Beyond URL to navigate to (must start with https://www.dndbeyond.com/)"),
}, async ({ url }) => {
    try {
        const context = await getSharedContext();
        const content = await navigate(context, url);
        return { content: [{ type: "text", text: content }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Navigation failed: ${msg}` }], isError: true };
    }
});
// ─── ddb_interact ─────────────────────────────────────────────────────────────
server.tool("ddb_interact", "Interact with the currently loaded D&D Beyond page by clicking, filling a form field, or taking a screenshot.", {
    action: z
        .enum(["click", "fill", "screenshot"])
        .describe("The action to perform: click an element, fill a text field, or take a screenshot"),
    selector: z.string().describe("CSS selector or text selector for the target element"),
    value: z
        .string()
        .optional()
        .describe("Value to type into the field (required for 'fill' action)"),
}, async ({ action, selector, value }) => {
    try {
        const context = await getSharedContext();
        const result = await interact(context, action, selector, value);
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Interaction failed: ${msg}` }], isError: true };
    }
});
// ─── ddb_current_page ─────────────────────────────────────────────────────────
server.tool("ddb_current_page", "Return the text content of the currently loaded page in the browser.", {}, async () => {
    try {
        const context = await getSharedContext();
        const content = await getCurrentPageContent(context);
        return { content: [{ type: "text", text: content }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to get page content: ${msg}` }], isError: true };
    }
});
// ─── ddb_search ───────────────────────────────────────────────────────────────
server.tool("ddb_search", "Search D&D Beyond for spells, monsters, magic items, races, classes, or feats.", {
    query: z.string().describe("The search query (e.g. 'Fireball', 'Beholder', 'Vorpal Sword')"),
    category: z
        .enum(["spells", "monsters", "items", "races", "classes", "feats", "all"])
        .optional()
        .describe("Category to search within (defaults to 'all')"),
}, async ({ query, category }) => {
    try {
        const context = await getSharedContext();
        const results = await search(context, query, category ?? "all");
        return { content: [{ type: "text", text: results }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Search failed: ${msg}` }], isError: true };
    }
});
// ─── ddb_list_library ─────────────────────────────────────────────────────────
server.tool("ddb_list_library", "List all books and sourcebooks you own in your D&D Beyond library.", {}, async () => {
    try {
        const context = await getSharedContext();
        const books = await listLibrary(context);
        return { content: [{ type: "text", text: books }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to list library: ${msg}` }], isError: true };
    }
});
// ─── ddb_read_book ────────────────────────────────────────────────────────────
server.tool("ddb_read_book", "Read content from an owned D&D Beyond sourcebook. Provide the book slug (e.g. 'players-handbook') and optionally a chapter slug.", {
    book_slug: z
        .string()
        .describe("The book slug from the D&D Beyond URL (e.g. 'players-handbook', 'dungeon-masters-guide')"),
    chapter_slug: z
        .string()
        .optional()
        .describe("Optional chapter or section slug (e.g. 'classes/ranger'). If omitted, returns the book's table of contents."),
}, async ({ book_slug, chapter_slug }) => {
    try {
        const context = await getSharedContext();
        const content = await readBook(context, book_slug, chapter_slug);
        return { content: [{ type: "text", text: content }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to read book: ${msg}` }], isError: true };
    }
});
// ─── Start server ─────────────────────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("D&D Beyond MCP server running on stdio\n");
}
main().catch((err) => {
    process.stderr.write(`Fatal error: ${err}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map