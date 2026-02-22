import { BrowserContext } from "playwright";
export declare function getCharacter(context: BrowserContext, characterId: string): Promise<string>;
export declare function downloadCharacter(context: BrowserContext, characterId: string, outputPath?: string): Promise<string>;
export declare function listCharacters(context: BrowserContext): Promise<string>;
export declare function scrapeCharacterSheet(context: BrowserContext, characterId: string): Promise<string>;
//# sourceMappingURL=character.d.ts.map