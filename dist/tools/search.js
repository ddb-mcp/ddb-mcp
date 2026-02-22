import { getPage } from "../browser.js";
export async function search(context, query, category = "all") {
    const page = await getPage(context);
    const categoryPaths = {
        spells: "spells",
        monsters: "monsters",
        items: "magic-items",
        races: "races",
        classes: "classes",
        feats: "feats",
        all: "search",
    };
    const path = categoryPaths[category];
    const encodedQuery = encodeURIComponent(query);
    let searchUrl;
    if (category === "all") {
        searchUrl = `https://www.dndbeyond.com/search?q=${encodedQuery}`;
    }
    else {
        searchUrl = `https://www.dndbeyond.com/${path}?filter-search=${encodedQuery}`;
    }
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);
    const results = await page.evaluate((cat) => {
        const items = [];
        if (cat === "all") {
            // General search results page
            document.querySelectorAll(".search-result, .results-item").forEach((el) => {
                const nameLink = el.querySelector("a.result-title, a.listing-name, h2 a, h3 a");
                const name = nameLink?.textContent?.trim() ?? el.querySelector("h2, h3")?.textContent?.trim() ?? "";
                const type = el.querySelector(".result-category, .result-type, .listing-tag")?.textContent?.trim() ?? "";
                const link = (nameLink ?? el.querySelector("a"))?.href ?? "";
                if (name)
                    items.push({ name, type, url: link });
            });
        }
        else {
            // Category listing page — items are in div.info[data-slug] containers
            document.querySelectorAll(".listing-body div.info[data-slug]").forEach((el) => {
                // Use a.link for the name — avoids picking up child tags like <i class="i-concentration">
                const nameLink = el.querySelector("a.link");
                const name = nameLink?.textContent?.trim() ?? "";
                const url = nameLink?.href ?? "";
                // Pull level/CR/rarity from typed rows (avoids the noisy name row)
                const levelEl = el.querySelector(".row.spell-level span, .row.monster-challenge span, .row.item-rarity span, .row.class-level span, .row.feat-prerequisite span");
                const schoolEl = el.querySelector(".row.spell-school .school");
                const schoolName = schoolEl
                    ? (schoolEl.className.replace("school", "").trim() || "")
                    : "";
                const extras = [levelEl?.textContent?.trim(), schoolName].filter(Boolean).join(" | ");
                if (name)
                    items.push({ name, type: extras, url });
            });
        }
        return items;
    }, category);
    if (results.length === 0) {
        return `No results found for "${query}" in category "${category}". The page URL was: ${searchUrl}`;
    }
    return JSON.stringify({ query, category, url: searchUrl, count: results.length, results }, null, 2);
}
//# sourceMappingURL=search.js.map