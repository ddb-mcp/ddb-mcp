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
import { createHomebrewMagicItem, createHomebrewSpell, setItemCharges, addItemModifier, addItemSpell, listHomebrewCreations } from "./tools/homebrew.js";
// ─── D&D Beyond Homebrew Annotation Reference ────────────────────────────────
// Shared across all homebrew creation tools so any agent knows the full syntax.
const DDB_ANNOTATION_REFERENCE = `
DESCRIPTION FORMATTING — D&D Beyond's annotation system for homebrew descriptions.
Descriptions are HTML. You can embed rollable dice, dynamic character values, and tooltip references.

═══ ROLLABLE DICE ═══
Format: [rollable]DISPLAY_TEXT;{"diceNotation":"DICE","rollType":"TYPE","rollAction":"NAME","rollDamageType":"DTYPE"}[/rollable]

rollType (required):
  "roll"     — generic dice roll
  "to hit"   — attack roll (enables advantage/disadvantage toggle)
  "damage"   — damage roll (enables critical hits; requires rollDamageType)
  "heal"     — healing effect
  "spell"    — spell attack
  "save"     — saving throw
  "check"    — ability/skill check
  "recharge" — recharge mechanic (e.g. Recharge 5–6)

rollDamageType (required when rollType is "damage"):
  Acid, Bludgeoning, Cold, Fire, Force, Lightning, Necrotic, Piercing, Poison, Psychic, Radiant, Slashing, Thunder

Examples:
  Attack:   [rollable]+5;{"diceNotation":"1d20+5","rollType":"to hit","rollAction":"Bite"}[/rollable]
  Damage:   [rollable]1d8 + 3 piercing;{"diceNotation":"1d8+3","rollType":"damage","rollAction":"Bite","rollDamageType":"Piercing"}[/rollable]
  Healing:  [rollable]3d8 + 3;{"diceNotation":"3d8+3","rollType":"heal","rollAction":"Healing Touch"}[/rollable]
  Recharge: [rollable]Recharge 5–6;{"diceNotation":"1d6","rollType":"recharge","rollAction":"Fire Breath"}[/rollable]

═══ SNIPPET CODES (dynamic character values) ═══
These render live values from the character sheet. Display only — they don't modify stats.

  {{modifier:cha}}         — ability modifier (str/dex/con/int/wis/cha)
  {{modifier:str,dex}}     — highest modifier from multiple abilities
  {{abilityscore:str}}     — raw ability score (e.g. 16)
  {{savedc:wis}}           — 8 + proficiency + ability modifier
  {{spellattack:int}}      — proficiency + ability modifier (spell to-hit)
  {{proficiency}}          — proficiency bonus
  {{characterlevel}}       — total character level
  {{classlevel}}           — level in contextual class (subclass homebrew only)
  {{maxhp}}                — maximum hit points
  {{limiteduse}}           — total uses for the contextual feature
  {{fixedvalue}}           — fixed number from the feature
  {{scalevalue}}           — class-specific scaling value (e.g. Rage Damage)

Calculations (use parentheses for complex math):
  {{10+modifier:str}}                     — 10 + STR modifier (e.g. unarmored AC)
  {{8+proficiency+modifier:wis}}          — spell save DC formula
  {{maxhp/2}}                             — half max HP
  {{2*abilityscore:con}}                  — double CON score
  {{(classlevel/3)@rounddown}}            — third of class level, rounded down
  {{(2*modifier:str,dex,con)@min:2}}      — highest of 3 mods, doubled, min 2

Calculation modifiers (inside parentheses with @):
  @rounddown  — round result down
  @roundup    — round result up
  @min:X      — set minimum value
  @max:X      — set maximum value
  Combine: @min:2,max:20

Display modifiers (at end with #):
  #signed     — force +/- sign (e.g. "+3")
  #unsigned   — remove sign (e.g. "3" instead of "+3")
  Example: {{proficiency#unsigned}}x per day → "3x per day"

═══ TOOLTIP TAGS (hover references, 2014 rules) ═══
Wrap game terms to create hover tooltips linking to D&D Beyond entries.

  [spell]Fireball[/spell]                    — spell reference
  [condition]restrained[/condition]           — condition tooltip
  [action]dodge[/action]                      — action reference
  [item]torch[/item]                          — mundane item
  [magicitem]Bag of Holding[/magicitem]       — magic item
  [monster]Banshee[/monster]                  — monster stat block
  [skill]Stealth[/skill]                      — skill reference
  [sense]darkvision[/sense]                   — sense reference
  [rule]falling[/rule]                        — rule reference
  [wprop]finesse[/wprop]                      — weapon property
  [vehicle]rowboat[/vehicle]                  — vehicle reference

Custom display text (show different text than the linked entry):
  [spell]Shield;cast Shield[/spell]           — displays "cast Shield", links to Shield spell
  [monster]Wolf;Wolves[/monster]              — displays "Wolves", links to Wolf
  [magicitem]ioun stone of strength;Strength[/magicitem]

Source specification:
  [monster src=motm]Vegepygmy[/monster]       — link to specific source version
  Sources: vgtm, mtof, motm

═══ TOOLTIP TAGS (2024 rules / 5.5e) ═══
  [spells]Starry Wisp[/spells]               — 2024 spell
  [items]torch[/items]                        — 2024 mundane item
  [magicItems]Bag of Holding[/magicItems]     — 2024 magic item
  [monsters]Banshee[/monsters]                — 2024 monster
  [rules]bloodied[/rules]                     — 2024 rule
  [lore]entry name[/lore]                     — 2024 DMG lore glossary

NOTE: Tooltips do not function in the character sheet — they work in item/spell detail pages only.
`;
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
server.tool("ddb_interact", "Interact with the currently loaded D&D Beyond page by clicking, filling a form field, selecting a dropdown option, running JavaScript, or taking a screenshot.", {
    action: z
        .enum(["click", "fill", "screenshot", "evaluate", "select"])
        .describe("The action to perform: click, fill a text field, screenshot, evaluate JavaScript (selector = JS code), or select a dropdown option"),
    selector: z.string().describe("CSS selector for the target element. For 'evaluate' action, this is the JavaScript code to run on the page."),
    value: z
        .string()
        .optional()
        .describe("Value for 'fill' (text to type) or 'select' (option label to choose)"),
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
// ─── ddb_create_homebrew_item ─────────────────────────────────────────────────
server.tool("ddb_create_homebrew_item", `Create a homebrew magic item on D&D Beyond. Fills the creation form and saves it.\n` + DDB_ANNOTATION_REFERENCE, {
    name: z.string().describe("Item name"),
    rarity: z
        .enum(["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact", "Varies", "Unknown Rarity"])
        .describe("Item rarity"),
    base_item_type: z
        .enum(["Item", "Armor", "Weapon"])
        .optional()
        .describe("Base item type (default: Item)"),
    magic_item_type: z
        .enum(["Wondrous Item", "Rod", "Scroll", "Staff", "Wand", "Ring", "Potion"])
        .optional()
        .describe("Magic item subtype (when base type is Item)"),
    requires_attunement: z.boolean().optional().describe("Whether the item requires attunement"),
    attunement_description: z
        .string()
        .optional()
        .describe("Attunement requirement (e.g. 'a sorcerer')"),
    description: z
        .string()
        .describe("Item description in HTML. Can include D&D Beyond annotations: [rollable], {{snippet}}, and [tooltip] tags."),
}, async ({ name, rarity, base_item_type, magic_item_type, requires_attunement, attunement_description, description }) => {
    try {
        const context = await getSharedContext();
        const result = await createHomebrewMagicItem(context, {
            name,
            rarity,
            base_item_type,
            magic_item_type,
            requires_attunement,
            attunement_description,
            description,
        });
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to create homebrew item: ${msg}` }], isError: true };
    }
});
// ─── ddb_create_homebrew_spell ────────────────────────────────────────────────
server.tool("ddb_create_homebrew_spell", `Create a homebrew spell on D&D Beyond. Fills the spell creation form and saves it.\n` + DDB_ANNOTATION_REFERENCE, {
    name: z.string().describe("Spell name"),
    level: z
        .enum(["Cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"])
        .describe("Spell level"),
    school: z
        .enum(["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"])
        .describe("Spell school"),
    casting_time_type: z
        .enum(["Action", "Bonus Action", "Reaction", "Minute", "Hour", "No Action", "Special"])
        .describe("Casting time type"),
    casting_time_amount: z.number().optional().describe("Casting time amount (default: 1)"),
    reaction_description: z.string().optional().describe("Reaction trigger description (when casting_time_type is Reaction)"),
    components_verbal: z.boolean().optional().describe("Verbal component (default: true)"),
    components_somatic: z.boolean().optional().describe("Somatic component (default: true)"),
    components_material: z.boolean().optional().describe("Material component (default: false)"),
    material_description: z.string().optional().describe("Material components description"),
    range_type: z
        .enum(["Self", "Touch", "Ranged", "Sight", "Unlimited"])
        .describe("Spell range type"),
    range_distance: z.number().optional().describe("Range distance in feet (when range_type is Ranged)"),
    duration_type: z
        .enum(["Instantaneous", "Concentration", "Time", "Special", "Until Dispelled", "Until Dispelled or Triggered"])
        .describe("Spell duration type"),
    duration_amount: z.number().optional().describe("Duration amount (e.g. 1 for '1 Minute')"),
    duration_unit: z
        .enum(["Round", "Minute", "Hour", "Day"])
        .optional()
        .describe("Duration unit (when duration_type is Concentration or Time)"),
    ritual: z.boolean().optional().describe("Can be cast as ritual"),
    description: z.string().describe("Spell description in HTML. Supports D&D Beyond annotations."),
    classes: z
        .array(z.string())
        .optional()
        .describe("Available for classes (e.g. ['Sorcerer', 'Wizard'])"),
}, async ({ name, level, school, casting_time_type, casting_time_amount, reaction_description, components_verbal, components_somatic, components_material, material_description, range_type, range_distance, duration_type, duration_amount, duration_unit, ritual, description, classes }) => {
    try {
        const context = await getSharedContext();
        const result = await createHomebrewSpell(context, {
            name, level, school, casting_time_type, casting_time_amount, reaction_description,
            components_verbal, components_somatic, components_material, material_description,
            range_type, range_distance, duration_type, duration_amount, duration_unit,
            ritual, description, classes,
        });
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to create homebrew spell: ${msg}` }], isError: true };
    }
});
// ─── ddb_set_item_charges ────────────────────────────────────────────────────
server.tool("ddb_set_item_charges", "Set charges on an existing homebrew magic item (number of charges, reset condition, reset description). Requires the item's edit URL.", {
    edit_url: z.string().describe("The D&D Beyond edit URL for the item (e.g. https://www.dndbeyond.com/homebrew/creations/magic-items/12345-item-name/edit)"),
    number_of_charges: z.number().describe("Total number of charges"),
    reset_condition: z
        .enum(["Short Rest", "Long Rest", "Dawn", "Other", "None, Consumable"])
        .describe("When charges reset"),
    reset_description: z.string().optional().describe("Description of how charges reset (e.g. 'Regains all charges at dawn')"),
}, async ({ edit_url, number_of_charges, reset_condition, reset_description }) => {
    try {
        const context = await getSharedContext();
        const result = await setItemCharges(context, { edit_url, number_of_charges, reset_condition, reset_description });
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to set charges: ${msg}` }], isError: true };
    }
});
// ─── ddb_add_item_modifier ──────────────────────────────────────────────────
server.tool("ddb_add_item_modifier", `Add a modifier to an existing homebrew magic item. Requires the item's edit URL.

Common modifier_type values: Bonus, Damage, Advantage, Disadvantage, Resistance, Immunity, Vulnerability, Sense, Set, Proficiency, Language, Expertise

Common modifier_subtype values (for Bonus type):
  Spell Attacks, Spell Save DC, Sorcerer Spell Attacks, Sorcerer Spell Save DC,
  Wizard Spell Attacks, Warlock Spell Attacks, Armor Class, Saving Throws,
  Ability Checks, Melee Attacks, Ranged Attacks, Strength, Dexterity, etc.

The subtype list changes depending on the type selected. If unsure, use ddb_navigate to the
item's edit page and click ADD A MODIFIER to see available options.`, {
    edit_url: z.string().describe("The D&D Beyond edit URL for the item"),
    modifier_type: z.string().describe("Modifier type (e.g. 'Bonus', 'Resistance', 'Sense')"),
    modifier_subtype: z.string().describe("Modifier subtype (e.g. 'Sorcerer Spell Attacks', 'Armor Class')"),
    fixed_value: z.number().optional().describe("Fixed bonus value (e.g. 2 for +2)"),
    requires_attunement: z.boolean().optional().describe("Whether the modifier requires attunement"),
}, async ({ edit_url, modifier_type, modifier_subtype, fixed_value, requires_attunement }) => {
    try {
        const context = await getSharedContext();
        const result = await addItemModifier(context, { edit_url, modifier_type, modifier_subtype, fixed_value, requires_attunement });
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to add modifier: ${msg}` }], isError: true };
    }
});
// ─── ddb_add_item_spell ─────────────────────────────────────────────────────
server.tool("ddb_add_item_spell", "Attach a spell to an existing homebrew magic item. Supports charge costs and cast-at-level. Requires the item's edit URL.", {
    edit_url: z.string().describe("The D&D Beyond edit URL for the item"),
    spell_name: z.string().describe("Name of the spell to attach (must exist on D&D Beyond or in your homebrew)"),
    min_charges: z.number().optional().describe("Minimum charges to cast (e.g. 1)"),
    max_charges: z.number().optional().describe("Maximum charges to cast (e.g. 3)"),
    cast_at_level: z.number().optional().describe("Spell level to cast at (e.g. 1)"),
    restriction: z.string().optional().describe("Restriction or notes about the spell usage"),
}, async ({ edit_url, spell_name, min_charges, max_charges, cast_at_level, restriction }) => {
    try {
        const context = await getSharedContext();
        const result = await addItemSpell(context, { edit_url, spell_name, min_charges, max_charges, cast_at_level, restriction });
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to add spell: ${msg}` }], isError: true };
    }
});
// ─── ddb_list_homebrew ───────────────────────────────────────────────────────
server.tool("ddb_list_homebrew", "List your homebrew creations from D&D Beyond (magic items, monsters, spells, etc.).", {}, async () => {
    try {
        const context = await getSharedContext();
        const result = await listHomebrewCreations(context);
        return { content: [{ type: "text", text: result }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to list homebrew: ${msg}` }], isError: true };
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