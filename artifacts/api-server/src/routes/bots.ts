import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const ORG = "DreamCo-Technologies";
const REPO = "Dreamcobots";

const BOT_CATEGORIES: Record<string, string> = {
  buddy_bot: "AI Companion",
  stripe_integration: "Payments",
  stripe_payment_bot: "Payments",
  stripe_key_rotation_bot: "Payments",
  token_billing: "Billing",
  stock_trading_bot: "Finance",
  real_estate_bot: "Real Estate",
  lead_gen_bot: "Lead Generation",
  social_media_bot: "Marketing",
  social_media_manager_bot: "Marketing",
  email_campaign_manager_bot: "Marketing",
  influencer_bot: "Marketing",
  shopify_automation_bot: "E-Commerce",
  saas_bot: "SaaS",
  software_bot: "Software",
  god_bot: "Core",
  god_mode_bot: "Core",
  space_ai_bot: "AI Research",
  quantum_ai_bot: "AI Research",
  quantum_decision_bot: "AI Research",
  smart_city_bot: "Infrastructure",
  legal_money_bot: "Legal",
  government_contract_grant_bot: "Government",
  wealth_system_bot: "Finance",
  stack_and_profit_bot: "Finance",
  voice_replicator_bot: "Media",
  sql_bot: "Data",
  selenium_job_application_bot: "Automation",
  health_wellness_bot: "Health",
  education_bot: "Education",
  dream_finance: "Finance",
};

async function fetchGitHubBotTree(): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${ORG}/${REPO}/git/trees/HEAD?recursive=1`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "User-Agent": "dreamco-dashboard",
        },
      }
    );
    const data = await res.json() as { tree?: Array<{ type: string; path: string }> };
    if (!data.tree) return [];
    return data.tree
      .filter((f) => f.type === "tree" && f.path.startsWith("bots/") && f.path.split("/").length === 2)
      .map((f) => f.path.replace("bots/", ""));
  } catch (err) {
    logger.error({ err }, "Failed to fetch GitHub bot tree");
    return [];
  }
}

let botCache: ReturnType<typeof buildBots> | null = null;
let botCacheTime = 0;

function buildBots(botNames: string[]) {
  return botNames.map((name) => {
    const key = name.toLowerCase();
    const category = BOT_CATEGORIES[key] ?? "Automation";
    const statusOptions = ["active", "idle", "active", "active"] as const;
    const tierOptions = ["FREE", "PRO", "ENTERPRISE"] as const;
    const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      name,
      repoPath: `bots/${name}`,
      status: statusOptions[hash % statusOptions.length],
      tier: tierOptions[hash % 3] as "FREE" | "PRO" | "ENTERPRISE",
      category,
      description: `DreamCo ${category} bot — ${name.replace(/_/g, " ")}`,
      lastHeartbeat: new Date(Date.now() - (hash % 3600000)).toISOString(),
      pendingPRs: hash % 4,
      revenue: parseFloat(((hash % 500) + Math.random() * 100).toFixed(2)),
      lastUpdate: new Date(Date.now() - (hash % 86400000)).toISOString(),
    };
  });
}

router.get("/bots", async (req, res): Promise<void> => {
  const now = Date.now();
  if (botCache && now - botCacheTime < 60000) {
    res.json(botCache);
    return;
  }
  const names = await fetchGitHubBotTree();
  const bots = buildBots(names.length > 0 ? names : [
    "buddy_bot", "stripe_integration", "stock_trading_bot", "lead_gen_bot",
    "social_media_bot", "shopify_automation_bot", "real_estate_bot",
    "wealth_system_bot", "sql_bot", "voice_replicator_bot",
    "space_ai_bot", "government_contract_grant_bot", "legal_money_bot",
    "saas_bot", "software_bot", "email_campaign_manager_bot",
    "token_billing", "stripe_payment_bot",
  ]);
  botCache = bots;
  botCacheTime = now;
  req.log.info({ count: bots.length }, "Returning bots");
  res.json(bots);
});

router.get("/bots/:name", async (req, res): Promise<void> => {
  const rawName = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
  const name = rawName ?? "";
  const bots = botCache ?? buildBots([name]);
  const bot = bots.find((b) => b.name.toLowerCase() === name.toLowerCase());
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }
  res.json(bot);
});

export default router;
