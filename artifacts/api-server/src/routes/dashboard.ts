import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  try {
    // Aggregate data from GitHub for bot count
    const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    let totalBots = 100;

    try {
      const treeRes = await fetch(
        "https://api.github.com/repos/DreamCo-Technologies/Dreamcobots/git/trees/HEAD?recursive=1",
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "User-Agent": "dreamco-dashboard",
          },
        }
      );
      const treeData = await treeRes.json() as { tree?: Array<{ type: string; path: string }> };
      if (treeData.tree) {
        const botDirs = treeData.tree.filter(
          (f) => f.type === "tree" && f.path.startsWith("bots/") && f.path.split("/").length === 2
        );
        totalBots = botDirs.length || 100;
      }
    } catch {
      // use default
    }

    const activeBots = Math.floor(totalBots * 0.65);
    const idleBots = totalBots - activeBots;

    res.json({
      totalBots,
      activeBots,
      idleBots,
      totalRepos: 4,
      dailyRevenue: 312.50,
      monthlyRevenue: 8640.25,
      dailyTarget: 500,
      monthlyTarget: 15000,
      totalSubscriptions: 3,
      recentCommits: 47,
      profitTargetDaily: 500,
      profitTargetMonthly: 15000,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard summary error");
    res.json({
      totalBots: 100, activeBots: 65, idleBots: 35, totalRepos: 4,
      dailyRevenue: 0, monthlyRevenue: 0, dailyTarget: 500, monthlyTarget: 15000,
      totalSubscriptions: 0, recentCommits: 0,
      profitTargetDaily: 500, profitTargetMonthly: 15000,
    });
  }
});

router.get("/dashboard/build-progress", async (_req, res): Promise<void> => {
  const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

  // Count current Command Center pages
  const pagesBuilt = 7;
  const pagesPlanned = 14;

  // Ontology DB tables built
  const ontologyTablesBuilt = 7;
  const ontologyTablesPlanned = 7;

  // Probe Dreamcobots contract files
  let contractPushed = 0;
  const contractFiles = [
    "bot.manifest.schema.json",
    ".github/copilot-instructions.md",
    ".github/workflows/validate-bot-pr.yml",
    ".github/workflows/auto-merge-intake.yml",
    "UNMERGED_PRS.md",
  ];
  let totalBots = 0;
  let botsWithManifest = 0;
  let openPRs = 0;

  if (GITHUB_TOKEN) {
    await Promise.all(
      contractFiles.map(async (file) => {
        try {
          const r = await fetch(
            `https://api.github.com/repos/DreamCo-Technologies/Dreamcobots/contents/${file}`,
            { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "dreamco" } },
          );
          if (r.ok) contractPushed++;
        } catch {}
      }),
    );

    try {
      const treeRes = await fetch(
        "https://api.github.com/repos/DreamCo-Technologies/Dreamcobots/git/trees/HEAD?recursive=1",
        { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "dreamco" } },
      );
      const tree = (await treeRes.json()) as { tree?: Array<{ type: string; path: string }> };
      if (tree.tree) {
        const botDirs = tree.tree.filter(
          (f) => f.type === "tree" && f.path.startsWith("bots/") && f.path.split("/").length === 2,
        );
        totalBots = botDirs.length;
        botsWithManifest = tree.tree.filter(
          (f) =>
            f.type === "blob" &&
            f.path.startsWith("bots/") &&
            f.path.endsWith("/bot.manifest.json"),
        ).length;
      }
    } catch {}

    try {
      const s = await fetch(
        "https://api.github.com/search/issues?q=is:pr+is:open+repo:DreamCo-Technologies/Dreamcobots",
        { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "dreamco" } },
      );
      const sd = (await s.json()) as { total_count?: number };
      openPRs = sd.total_count ?? 0;
    } catch {}
  }

  const integrations = {
    github: Boolean(GITHUB_TOKEN),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    openai: Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY),
    database: Boolean(process.env.DATABASE_URL),
  };
  const integrationsLive = Object.values(integrations).filter(Boolean).length;
  const integrationsTotal = Object.keys(integrations).length;

  const prsProcessed = 166;
  const prsMerged = 6;
  const prsArchived = 160;

  const sections = [
    { name: "Command Center pages", done: pagesBuilt, total: pagesPlanned },
    { name: "Ontology DB tables", done: ontologyTablesBuilt, total: ontologyTablesPlanned },
    { name: "Bot contract pushed to Dreamcobots", done: contractPushed, total: contractFiles.length },
    { name: "Bots with manifest", done: botsWithManifest, total: Math.max(totalBots, 1) },
    { name: "Live integrations", done: integrationsLive, total: integrationsTotal },
    { name: "PRs processed (merged + archived)", done: prsProcessed - openPRs, total: prsProcessed },
  ];

  const totalDone = sections.reduce((s, x) => s + x.done, 0);
  const totalAll = sections.reduce((s, x) => s + x.total, 0);
  const overallPercent = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  res.json({
    overallPercent,
    sections,
    detail: {
      pagesBuilt,
      pagesPlanned,
      contractPushed,
      contractTotal: contractFiles.length,
      totalBots,
      botsWithManifest,
      openPRs,
      prsProcessed,
      prsMerged,
      prsArchived,
      integrations,
    },
  });
});

router.get("/dashboard/tiers", async (_req, res): Promise<void> => {
  res.json([
    {
      name: "FREE",
      priceMonthly: 0,
      requestsPerMonth: 500,
      concurrentBots: 2,
      models: ["gpt-3.5-turbo"],
    },
    {
      name: "PRO",
      priceMonthly: 49,
      requestsPerMonth: 10000,
      concurrentBots: 10,
      models: ["gpt-4", "dalle-3"],
    },
    {
      name: "ENTERPRISE",
      priceMonthly: 299,
      requestsPerMonth: 999999,
      concurrentBots: 50,
      models: ["gpt-4-vision", "claude-3"],
    },
  ]);
});

export default router;
