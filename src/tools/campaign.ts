import { BrowserContext } from "playwright";
import { getPage, isLoggedIn } from "../browser.js";

export async function getCampaign(context: BrowserContext, campaignId: string): Promise<string> {
  const page = await getPage(context);

  if (!(await isLoggedIn(page))) {
    throw new Error("Not logged in. Please run ddb_login first.");
  }

  await page.goto(`https://www.dndbeyond.com/campaigns/${campaignId}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const campaign = await page.evaluate(() => {
    const data: Record<string, unknown> = {};

    // Campaign name
    const name = document.querySelector("h1.page-title")?.textContent?.trim();
    if (name) data["name"] = name;

    // DM/Owner
    const dm = document.querySelector("span.user-interactions-profile-nickname")?.textContent?.trim();
    if (dm) data["dungeonMaster"] = dm;

    // Campaign description — first substantial <p> in the campaign detail body
    const descEl = Array.from(document.querySelectorAll(".ddb-campaigns-detail p"))
      .find((el) => (el.textContent?.trim().length ?? 0) > 50);
    if (descEl) data["description"] = descEl.textContent?.trim();

    // Active characters
    const characters: Array<{ character: string; level: string; player: string; url: string }> = [];
    document.querySelectorAll("li.ddb-campaigns-character-card-wrapper").forEach((el) => {
      const charName = el.querySelector(".ddb-campaigns-character-card-header-upper-character-info-primary")?.textContent?.trim() ?? "";
      const secondaries = el.querySelectorAll(".ddb-campaigns-character-card-header-upper-character-info-secondary");
      const summary = secondaries[0]?.textContent?.trim() ?? "";
      const playerRaw = secondaries[1]?.textContent?.trim() ?? "";
      const player = playerRaw.replace(/^Player:\s*/i, "");
      const charLink = (el.querySelector("a.ddb-campaigns-character-card-header-upper-details-link") as HTMLAnchorElement)?.href ?? "";
      if (charName) characters.push({ character: charName, level: summary, player, url: charLink });
    });
    if (characters.length) data["characters"] = characters;

    return data;
  });

  return JSON.stringify(campaign, null, 2);
}

export async function listMyCampaigns(context: BrowserContext): Promise<string> {
  const page = await getPage(context);

  if (!(await isLoggedIn(page))) {
    throw new Error("Not logged in. Please run ddb_login first.");
  }

  await page.goto("https://www.dndbeyond.com/my-campaigns", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const campaigns = await page.evaluate(() => {
    const list: Array<{ name: string; id: string; role: string; url: string }> = [];
    document.querySelectorAll("li.ddb-campaigns-list-item-wrapper").forEach((el) => {
      const name = el.querySelector(".ddb-campaigns-list-item-body-title")?.textContent?.trim() ?? "";
      const link = (el.querySelector("a.ddb-campaigns-list-item-footer-buttons-item[href*='/campaigns/']") as HTMLAnchorElement)?.href ?? "";
      const idMatch = link.match(/\/campaigns\/(\d+)/);
      const id = idMatch?.[1] ?? "";
      const roleText = el.querySelector(".ddb-campaigns-list-item-body-role")?.textContent?.trim() ?? "";
      const role = roleText.replace(/^Role:\s*/i, "").split("\n")[0].trim();
      if (name && id) list.push({ name, id, role, url: link });
    });
    return list;
  });

  return JSON.stringify(campaigns, null, 2);
}
