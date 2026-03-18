import { BrowserContext } from "playwright";
export type ItemRarity = "Common" | "Uncommon" | "Rare" | "Very Rare" | "Legendary" | "Artifact" | "Varies" | "Unknown Rarity";
export type BaseItemType = "Item" | "Armor" | "Weapon";
export type MagicItemType = "Wondrous Item" | "Rod" | "Scroll" | "Staff" | "Wand" | "Ring" | "Potion";
export interface HomebrewMagicItemInput {
    name: string;
    rarity: ItemRarity;
    base_item_type?: BaseItemType;
    magic_item_type?: MagicItemType;
    requires_attunement?: boolean;
    attunement_description?: string;
    description: string;
}
export declare function createHomebrewMagicItem(context: BrowserContext, input: HomebrewMagicItemInput): Promise<string>;
export type SpellLevel = "Cantrip" | "1st" | "2nd" | "3rd" | "4th" | "5th" | "6th" | "7th" | "8th" | "9th";
export type SpellSchool = "Abjuration" | "Conjuration" | "Divination" | "Enchantment" | "Evocation" | "Illusion" | "Necromancy" | "Transmutation";
export type CastingTimeType = "Action" | "Bonus Action" | "Reaction" | "Minute" | "Hour" | "No Action" | "Special";
export type SpellRangeType = "Self" | "Touch" | "Ranged" | "Sight" | "Unlimited";
export type SpellDurationType = "Instantaneous" | "Concentration" | "Time" | "Special" | "Until Dispelled" | "Until Dispelled or Triggered";
export type DurationUnit = "Round" | "Minute" | "Hour" | "Day";
export interface HomebrewSpellInput {
    name: string;
    level: SpellLevel;
    school: SpellSchool;
    casting_time_type: CastingTimeType;
    casting_time_amount?: number;
    reaction_description?: string;
    components_verbal?: boolean;
    components_somatic?: boolean;
    components_material?: boolean;
    material_description?: string;
    range_type: SpellRangeType;
    range_distance?: number;
    duration_type: SpellDurationType;
    duration_amount?: number;
    duration_unit?: DurationUnit;
    ritual?: boolean;
    description: string;
    classes?: string[];
}
export declare function createHomebrewSpell(context: BrowserContext, input: HomebrewSpellInput): Promise<string>;
export type ChargeResetCondition = "Short Rest" | "Long Rest" | "Dawn" | "Other" | "None, Consumable";
export interface ItemChargesInput {
    edit_url: string;
    number_of_charges: number;
    reset_condition: ChargeResetCondition;
    reset_description?: string;
}
export declare function setItemCharges(context: BrowserContext, input: ItemChargesInput): Promise<string>;
export interface ItemModifierInput {
    edit_url: string;
    modifier_type: string;
    modifier_subtype: string;
    fixed_value?: number;
    requires_attunement?: boolean;
}
export declare function addItemModifier(context: BrowserContext, input: ItemModifierInput): Promise<string>;
export interface ItemSpellInput {
    edit_url: string;
    spell_name: string;
    min_charges?: number;
    max_charges?: number;
    cast_at_level?: number;
    restriction?: string;
}
export declare function addItemSpell(context: BrowserContext, input: ItemSpellInput): Promise<string>;
export declare function listHomebrewCreations(context: BrowserContext): Promise<string>;
//# sourceMappingURL=homebrew.d.ts.map