import { getPage, isLoggedIn } from "../browser.js";
import { writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
export async function getCharacter(context, characterId) {
    const page = await getPage(context);
    // Verify session
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    // Use the page context to make an authenticated fetch (cookies are shared)
    const result = await page.evaluate(async (id) => {
        const url = `https://character-service.dndbeyond.com/character/v5/character/${id}`;
        const resp = await fetch(url, {
            credentials: "include",
            headers: {
                Accept: "application/json",
            },
        });
        if (!resp.ok) {
            throw new Error(`API returned ${resp.status}: ${resp.statusText}`);
        }
        return resp.json();
    }, characterId);
    return JSON.stringify(result, null, 2);
}
export async function downloadCharacter(context, characterId, outputPath) {
    const jsonData = await getCharacter(context, characterId);
    const parsed = JSON.parse(jsonData);
    const charName = parsed?.data?.name ?? `character-${characterId}`;
    const filename = `${charName.replace(/\s+/g, "-").toLowerCase()}-${characterId}.json`;
    const savePath = outputPath ?? join(homedir(), "Downloads", filename);
    writeFileSync(savePath, jsonData, "utf8");
    return `Character data for '${charName}' saved to: ${savePath}`;
}
export async function listCharacters(context) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    await page.goto("https://www.dndbeyond.com/characters", {
        waitUntil: "networkidle",
        timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const characters = await page.evaluate(() => {
        const list = [];
        document.querySelectorAll("li.ddb-campaigns-character-card-wrapper").forEach((el) => {
            const name = el.querySelector(".ddb-campaigns-character-card-header-upper-character-info h2")?.textContent?.trim() ?? "";
            const summary = el.querySelector(".ddb-campaigns-character-card-header-upper-character-info-secondary")?.textContent?.trim() ?? "";
            const viewLink = el.querySelector(".ddb-campaigns-character-card-footer-links a[href*='/characters/']");
            const href = viewLink?.href ?? "";
            const idMatch = href.match(/\/characters\/(\d+)/);
            const id = idMatch?.[1] ?? "";
            // Parse "Level 6 | Human | Cleric/War Domain/Fighter/Battle Master"
            const parts = summary.split("|").map((s) => s.trim());
            const level = parts[0] ?? "";
            const race = parts[1] ?? "";
            const charClass = parts.slice(2).join("|").trim();
            if (name && id)
                list.push({ name, id, level, race, class: charClass, url: href });
        });
        return list;
    });
    return JSON.stringify(characters, null, 2);
}
export async function scrapeCharacterSheet(context, characterId) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    await page.goto(`https://www.dndbeyond.com/characters/${characterId}`, {
        waitUntil: "networkidle",
        timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const content = await page.evaluate(() => {
        // Extract key sections from the character sheet
        const sections = {};
        const name = document.querySelector(".character-name, .ddbc-character-name")?.textContent?.trim();
        if (name)
            sections["Name"] = name;
        const level = document.querySelector(".character-level, .ddbc-character-summary__level")?.textContent?.trim();
        if (level)
            sections["Level"] = level;
        const race = document.querySelector(".character-race, .ddbc-character-summary__race")?.textContent?.trim();
        if (race)
            sections["Race"] = race;
        const classEl = document.querySelector(".character-class, .ddbc-character-summary__classes");
        if (classEl)
            sections["Class"] = classEl.textContent?.trim() ?? "";
        const hp = document.querySelector(".ddbc-health-manager__hp-current, .hp-current")?.textContent?.trim();
        if (hp)
            sections["HP"] = hp;
        // Get stat blocks
        const stats = [];
        document.querySelectorAll(".ddbc-ability-summary").forEach((el) => {
            const label = el.querySelector(".ddbc-ability-summary__label")?.textContent?.trim();
            const value = el.querySelector(".ddbc-ability-summary__secondary")?.textContent?.trim();
            if (label && value)
                stats.push(`${label}: ${value}`);
        });
        if (stats.length)
            sections["Ability Scores"] = stats.join(", ");
        // Get skills
        const skills = [];
        document.querySelectorAll(".ddbc-skill-summary").forEach((el) => {
            const skillName = el.querySelector(".ddbc-skill-summary__label")?.textContent?.trim();
            const skillMod = el.querySelector(".ddbc-skill-summary__modifier")?.textContent?.trim();
            if (skillName && skillMod)
                skills.push(`${skillName}: ${skillMod}`);
        });
        if (skills.length)
            sections["Skills"] = skills.join(", ");
        return sections;
    });
    return JSON.stringify(content, null, 2);
}
//# sourceMappingURL=character.js.map