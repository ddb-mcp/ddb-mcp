import { getPage, isLoggedIn } from "../browser.js";
export async function createHomebrewMagicItem(context, input) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    await page.goto("https://www.dndbeyond.com/homebrew/creations/create-magic-item/create", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    // Fill the form using known selectors (TinyMCE editor, native selects, etc.)
    const result = await page.evaluate((opts) => {
        // Name
        const nameInput = document.getElementById("field-name");
        if (!nameInput)
            throw new Error("Could not find name field (#field-name).");
        nameInput.value = opts.name;
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
        // Rarity
        const raritySelect = document.getElementById("field-rarity");
        if (raritySelect) {
            const option = Array.from(raritySelect.options).find((o) => o.text === opts.rarity);
            if (option) {
                raritySelect.value = option.value;
                raritySelect.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }
        // Base Item Type
        if (opts.base_item_type) {
            const baseTypeSelect = document.getElementById("field-item-base-type");
            if (baseTypeSelect) {
                const option = Array.from(baseTypeSelect.options).find((o) => o.text === opts.base_item_type);
                if (option) {
                    baseTypeSelect.value = option.value;
                    baseTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }
        }
        // Magic Item Type
        if (opts.magic_item_type) {
            const typeSelect = document.getElementById("field-type");
            if (typeSelect) {
                const option = Array.from(typeSelect.options).find((o) => o.text === opts.magic_item_type);
                if (option) {
                    typeSelect.value = option.value;
                    typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }
        }
        // Requires Attunement
        if (opts.requires_attunement) {
            const cb = document.getElementById("field-requires-attunement");
            if (cb && !cb.checked) {
                cb.click();
            }
        }
        // Attunement Description
        if (opts.attunement_description) {
            const attInput = document.getElementById("field-attunement-description");
            if (attInput) {
                attInput.value = opts.attunement_description;
                attInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        // Description — TinyMCE iframe editor
        const iframe = document.getElementById("field-item-description-wysiwyg_ifr");
        if (iframe) {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc?.body) {
                doc.body.innerHTML = opts.description;
            }
        }
        else {
            throw new Error("Could not find description editor (#field-item-description-wysiwyg_ifr).");
        }
        return { filled: true };
    }, {
        name: input.name,
        rarity: input.rarity,
        base_item_type: input.base_item_type,
        magic_item_type: input.magic_item_type,
        requires_attunement: input.requires_attunement,
        attunement_description: input.attunement_description,
        description: input.description,
    });
    await page.waitForTimeout(1000);
    // Click CREATE MAGIC ITEM
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const createBtn = buttons.find((b) => b.textContent?.trim().toUpperCase().includes("CREATE MAGIC ITEM"));
        if (createBtn) {
            createBtn.click();
        }
        else {
            throw new Error("Could not find CREATE MAGIC ITEM button.");
        }
    });
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    if (currentUrl.includes("/edit") || currentUrl.includes("/magic-items/")) {
        return JSON.stringify({
            success: true,
            message: `Homebrew magic item "${input.name}" created successfully.`,
            url: currentUrl,
        }, null, 2);
    }
    return JSON.stringify({
        success: false,
        message: `Creation attempted for "${input.name}". Please verify on D&D Beyond.`,
        url: currentUrl,
    }, null, 2);
}
// Maps for spell form select values (matching D&D Beyond's internal IDs)
const SPELL_LEVEL_VALUES = {
    "Cantrip": "0", "1st": "1", "2nd": "2", "3rd": "3", "4th": "4",
    "5th": "5", "6th": "6", "7th": "7", "8th": "8", "9th": "9",
};
const SPELL_SCHOOL_VALUES = {
    "Abjuration": "3", "Conjuration": "4", "Divination": "5", "Enchantment": "6",
    "Evocation": "7", "Illusion": "8", "Necromancy": "9", "Transmutation": "10",
};
const CASTING_TIME_VALUES = {
    "Action": "1", "Bonus Action": "3", "Reaction": "4", "Minute": "6",
    "Hour": "7", "No Action": "2", "Special": "8",
};
const RANGE_TYPE_VALUES = {
    "Self": "1", "Touch": "2", "Ranged": "3", "Sight": "4", "Unlimited": "9",
};
const DURATION_TYPE_VALUES = {
    "Instantaneous": "1", "Concentration": "2", "Time": "3",
    "Special": "4", "Until Dispelled": "5", "Until Dispelled or Triggered": "7",
};
const DURATION_UNIT_VALUES = {
    "Round": "1", "Minute": "2", "Hour": "3", "Day": "4",
};
export async function createHomebrewSpell(context, input) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    await page.goto("https://www.dndbeyond.com/homebrew/creations/create-spell/create", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.evaluate((opts) => {
        function setSelect(id, value) {
            const sel = document.getElementById(id);
            if (sel) {
                sel.value = value;
                sel.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }
        function setInput(id, value) {
            const inp = document.getElementById(id);
            if (inp) {
                inp.value = value;
                inp.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        function setCheckbox(id, checked) {
            const cb = document.getElementById(id);
            if (cb && cb.checked !== checked) {
                cb.click();
            }
        }
        // Name
        const nameInput = document.getElementById("field-Name");
        if (!nameInput)
            throw new Error("Could not find spell name field (#field-Name).");
        nameInput.value = opts.name;
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
        // Level, School, Casting Time, Range, Duration
        setSelect("field-spell-level", opts.levelValue);
        setSelect("field-spell-school", opts.schoolValue);
        setSelect("field-spell-activation", opts.castingTimeValue);
        setSelect("field-origin", opts.rangeTypeValue);
        setSelect("field-spell-duration", opts.durationTypeValue);
        // Casting time amount
        if (opts.casting_time_amount) {
            setInput("field-spell-casting-time", String(opts.casting_time_amount));
        }
        // Reaction description
        if (opts.reaction_description) {
            setInput("field-spell-casting-time-description", opts.reaction_description);
        }
        // Range distance
        if (opts.range_distance) {
            setInput("field-spell-range", String(opts.range_distance));
        }
        // Duration amount and unit
        if (opts.duration_amount) {
            setInput("field-spell-duration-interval", String(opts.duration_amount));
        }
        if (opts.durationUnitValue) {
            setSelect("field-spell-duration-unit", opts.durationUnitValue);
        }
        // Components
        setCheckbox("field-verbal-field", opts.components_verbal ?? true);
        setCheckbox("field-somatic-field", opts.components_somatic ?? true);
        setCheckbox("field-material-field", opts.components_material ?? false);
        // Material description
        if (opts.material_description) {
            setInput("field-spell-components", opts.material_description);
        }
        // Ritual
        if (opts.ritual) {
            setCheckbox("field-can-cast-as-ritual", true);
        }
        // Description — TinyMCE iframe editor
        const iframes = document.querySelectorAll("iframe");
        for (const iframe of iframes) {
            if (iframe.id && iframe.id.includes("wysiwyg")) {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (doc?.body) {
                    doc.body.innerHTML = opts.description;
                }
                break;
            }
        }
        return { filled: true };
    }, {
        name: input.name,
        levelValue: SPELL_LEVEL_VALUES[input.level],
        schoolValue: SPELL_SCHOOL_VALUES[input.school],
        castingTimeValue: CASTING_TIME_VALUES[input.casting_time_type],
        casting_time_amount: input.casting_time_amount ?? 1,
        reaction_description: input.reaction_description,
        rangeTypeValue: RANGE_TYPE_VALUES[input.range_type],
        range_distance: input.range_distance,
        durationTypeValue: DURATION_TYPE_VALUES[input.duration_type],
        duration_amount: input.duration_amount,
        durationUnitValue: input.duration_unit ? DURATION_UNIT_VALUES[input.duration_unit] : undefined,
        components_verbal: input.components_verbal,
        components_somatic: input.components_somatic,
        components_material: input.components_material,
        material_description: input.material_description,
        ritual: input.ritual,
        description: input.description,
    });
    // Set classes via jQuery Select2 (multi-select)
    if (input.classes && input.classes.length > 0) {
        await page.evaluate((classNames) => {
            const sel = document.getElementById("field-class-mapping");
            if (sel && window.jQuery) {
                const values = classNames.map((name) => {
                    const opt = Array.from(sel.options).find((o) => o.text === name);
                    return opt?.value;
                }).filter(Boolean);
                window.jQuery(sel).select2("val", values).trigger("change");
            }
        }, input.classes);
    }
    await page.waitForTimeout(1000);
    // Click CREATE SPELL
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const createBtn = buttons.find((b) => b.textContent?.trim().toUpperCase().includes("CREATE SPELL"));
        if (createBtn) {
            createBtn.click();
        }
        else {
            throw new Error("Could not find CREATE SPELL button.");
        }
    });
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    if (currentUrl.includes("/edit") || currentUrl.includes("/spells/")) {
        return JSON.stringify({
            success: true,
            message: `Homebrew spell "${input.name}" created successfully.`,
            url: currentUrl,
        }, null, 2);
    }
    return JSON.stringify({
        success: false,
        message: `Creation attempted for "${input.name}". Please verify on D&D Beyond.`,
        url: currentUrl,
    }, null, 2);
}
const CHARGE_RESET_VALUES = {
    "Short Rest": "1", "Long Rest": "2", "Dawn": "3", "Other": "5", "None, Consumable": "4",
};
export async function setItemCharges(context, input) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    await page.goto(input.edit_url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.evaluate((opts) => {
        // Enable charges
        const cb = document.querySelector('input[name="has-charges"], input[id*="has-charges"]');
        if (cb && !cb.checked)
            cb.click();
        // Number of charges
        const chargesInput = document.querySelector('input[name="number-of-charges"], input[id*="number-of-charges"]');
        if (chargesInput) {
            chargesInput.value = String(opts.number_of_charges);
            chargesInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        // Reset condition — set native select value and update Select2 display
        const resetSel = document.getElementById("field-charge-reset-condition");
        if (resetSel) {
            resetSel.value = opts.resetValue;
            resetSel.dispatchEvent(new Event("change", { bubbles: true }));
            const container = document.getElementById("s2id_field-charge-reset-condition");
            const chosen = container?.querySelector(".select2-chosen");
            if (chosen)
                chosen.textContent = opts.reset_condition;
        }
        // Reset description
        if (opts.reset_description) {
            const ta = document.querySelector('textarea[name="charge-reset-description"], textarea[id*="charge-reset-description"]');
            if (ta) {
                ta.value = opts.reset_description;
                ta.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        return { filled: true };
    }, {
        number_of_charges: input.number_of_charges,
        reset_condition: input.reset_condition,
        resetValue: CHARGE_RESET_VALUES[input.reset_condition],
        reset_description: input.reset_description,
    });
    await page.waitForTimeout(500);
    // Click SAVE CHANGES
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const saveBtn = buttons.find((b) => b.textContent?.trim().toUpperCase().includes("SAVE CHANGES"));
        if (saveBtn)
            saveBtn.click();
        else
            throw new Error("Could not find SAVE CHANGES button.");
    });
    await page.waitForTimeout(2000);
    return JSON.stringify({
        success: true,
        message: `Set ${input.number_of_charges} charges (${input.reset_condition} reset).`,
        url: page.url(),
    }, null, 2);
}
export async function addItemModifier(context, input) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    // Navigate to the edit page, then to the add modifier page
    await page.goto(input.edit_url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    // Click ADD A MODIFIER
    await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a, button"));
        const addBtn = links.find((el) => el.textContent?.trim().toUpperCase().includes("ADD A MODIFIER"));
        if (addBtn)
            addBtn.click();
        else
            throw new Error("Could not find ADD A MODIFIER button.");
    });
    await page.waitForTimeout(2000);
    // Select modifier type via Select2 click
    await page.evaluate(() => {
        const container = document.getElementById("s2id_field-spell-modifier-type");
        if (container)
            container.click();
    });
    await page.waitForTimeout(500);
    // Click the matching option in the dropdown
    await page.evaluate((typeName) => {
        const items = document.querySelectorAll(".select2-results li");
        for (const item of items) {
            if (item.textContent?.trim() === typeName) {
                item.click();
                return;
            }
        }
        throw new Error(`Modifier type "${typeName}" not found in dropdown.`);
    }, input.modifier_type);
    await page.waitForTimeout(1000);
    // Set subtype — update native select value and Select2 display
    await page.evaluate((opts) => {
        const sel = document.getElementById("field-spell-modifier-sub-type");
        if (!sel)
            throw new Error("Could not find modifier subtype select.");
        const option = Array.from(sel.options).find((o) => o.text === opts.subtype);
        if (!option)
            throw new Error(`Modifier subtype "${opts.subtype}" not found. Available: ${Array.from(sel.options).map((o) => o.text).join(", ")}`);
        sel.value = option.value;
        const container = document.getElementById("s2id_field-spell-modifier-sub-type");
        const chosen = container?.querySelector(".select2-chosen");
        if (chosen)
            chosen.textContent = opts.subtype;
        // Fixed value
        if (opts.fixed_value !== undefined) {
            const fixedInput = document.getElementById("field-fixed-value");
            if (fixedInput) {
                fixedInput.value = String(opts.fixed_value);
                fixedInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        return { filled: true };
    }, { subtype: input.modifier_subtype, fixed_value: input.fixed_value });
    await page.waitForTimeout(500);
    // Click SAVE
    await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a, button"));
        const saveBtn = links.find((el) => el.textContent?.trim() === "SAVE" || el.textContent?.trim() === "Save");
        if (saveBtn)
            saveBtn.click();
        else
            throw new Error("Could not find SAVE button.");
    });
    await page.waitForTimeout(3000);
    return JSON.stringify({
        success: true,
        message: `Added modifier: ${input.modifier_type} - ${input.modifier_subtype}${input.fixed_value !== undefined ? ` (${input.fixed_value})` : ""}.`,
        url: page.url(),
    }, null, 2);
}
export async function addItemSpell(context, input) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    await page.goto(input.edit_url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    // Click ADD A SPELL
    await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a, button"));
        const addBtn = links.find((el) => el.textContent?.trim().toUpperCase().includes("ADD A SPELL"));
        if (addBtn)
            addBtn.click();
        else
            throw new Error("Could not find ADD A SPELL button.");
    });
    await page.waitForTimeout(2000);
    // Select spell via Select2 — find by name in native select, then set value
    await page.evaluate((opts) => {
        const sel = document.getElementById("field-item-spell");
        if (!sel)
            throw new Error("Could not find spell select.");
        const option = Array.from(sel.options).find((o) => o.text.includes(opts.spell_name));
        if (!option)
            throw new Error(`Spell "${opts.spell_name}" not found.`);
        if (window.jQuery) {
            window.jQuery(sel).select2("val", option.value).trigger("change");
        }
        else {
            sel.value = option.value;
            sel.dispatchEvent(new Event("change", { bubbles: true }));
        }
        // Min charges
        if (opts.min_charges !== undefined) {
            const minInput = document.getElementById("field-min-charges");
            if (minInput) {
                minInput.value = String(opts.min_charges);
                minInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        // Max charges
        if (opts.max_charges !== undefined) {
            const maxInput = document.getElementById("field-max-charges");
            if (maxInput) {
                maxInput.value = String(opts.max_charges);
                maxInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        // Cast at level
        if (opts.cast_at_level !== undefined) {
            const castSel = document.getElementById("field-cast-at-level");
            if (castSel && window.jQuery) {
                window.jQuery(castSel).select2("val", String(opts.cast_at_level)).trigger("change");
            }
        }
        // Restriction/details
        if (opts.restriction) {
            const ta = document.querySelector("textarea");
            if (ta) {
                ta.value = opts.restriction;
                ta.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        return { filled: true };
    }, {
        spell_name: input.spell_name,
        min_charges: input.min_charges,
        max_charges: input.max_charges,
        cast_at_level: input.cast_at_level,
        restriction: input.restriction,
    });
    await page.waitForTimeout(500);
    // Click SAVE
    await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a, button"));
        const saveBtn = links.find((el) => el.textContent?.trim() === "SAVE" || el.textContent?.trim() === "Save");
        if (saveBtn)
            saveBtn.click();
        else
            throw new Error("Could not find SAVE button.");
    });
    await page.waitForTimeout(3000);
    return JSON.stringify({
        success: true,
        message: `Added spell "${input.spell_name}" to item${input.min_charges ? ` (${input.min_charges}-${input.max_charges} charges)` : ""}.`,
        url: page.url(),
    }, null, 2);
}
export async function listHomebrewCreations(context) {
    const page = await getPage(context);
    if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Please run ddb_login first.");
    }
    await page.goto("https://www.dndbeyond.com/my-creations", {
        waitUntil: "networkidle",
        timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const content = await page.evaluate(() => {
        document
            .querySelectorAll("script, style, nav, footer, .ad-container")
            .forEach((el) => el.remove());
        const main = document.querySelector("main, .main-content, #content") ?? document.body;
        return main.innerText;
    });
    const truncated = content.length > 8000 ? content.slice(0, 8000) + "\n[truncated]" : content;
    return `URL: ${page.url()}\n\n${truncated}`;
}
//# sourceMappingURL=homebrew.js.map