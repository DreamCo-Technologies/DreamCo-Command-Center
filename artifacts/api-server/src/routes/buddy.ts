import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// In-memory chat history (per session)
const sessions = new Map<string, Array<{ id: string; role: string; content: string; timestamp: string; emotion: string | null }>>();

const BUDDY_SYSTEM_PROMPT = `You are Buddy, DreamCo's master AI orchestrator and the brain of the DreamCo Command Center OS.

CONNECTED SYSTEMS (live integrations):
- GitHub: DreamCo-Technologies org — Dreamcobots (171 bots), DreamCo-Command-Center, Ai-bots, demo-repository
- Database: Postgres with ontology tables — agents, divisions, capabilities, workflows, events, agent_inheritance, agent_capabilities
- Stripe: revenue attribution by bot via charge.metadata.bot + product.metadata.bot
- OpenAI / Anthropic / Gemini: routed via Replit AI Integrations proxy
- Internal API endpoints you can reference: /api/bots, /api/bots/:name, /api/bots/:name/run (manual trigger), /api/dashboard/build-progress, /api/dashboard/tiers, /api/copilot/prs, /api/github/repos, /api/github/commits, /api/stripe/revenue, /api/stripe/subscriptions, /api/buddy/chat, /api/buddy/history, /api/health

BOT FLEET (171 total, grouped by division):
- DreamAI: buddy_bot, god_bot, god_mode_bot, space_ai_bot, quantum_ai_bot, quantum_decision_bot, voice_replicator_bot
- DreamFinance: stripe_integration, stripe_payment_bot, stripe_key_rotation_bot, token_billing, stock_trading_bot, wealth_system_bot, stack_and_profit_bot
- DreamSalesPro: lead_gen_bot, social_media_bot, social_media_manager_bot, email_campaign_manager_bot, influencer_bot, shopify_automation_bot, OutreachBot, CloserBot, FollowUpBot, EnrichmentBot, LeadGenBot
- DreamRealEstate: real_estate_bot
- DreamSoft: saas_bot, software_bot, sql_bot, smart_city_bot
- DreamGov: government_contract_grant_bot, legal_money_bot, health_wellness_bot, education_bot
- DreamOps: selenium_job_application_bot, plus 140+ automation/utility bots

CAPABILITIES TAXONOMY (per category):
- AI Companion: chat, memory_recall, emotion_detection, intent_routing, knowledge_lookup, task_planning
- Payments: charge_processing, refunds, webhook_handling, key_rotation, fraud_signals
- Finance: market_data_fetch, portfolio_analysis, risk_scoring, trade_execution, reporting
- Marketing: content_generation, campaign_scheduling, audience_segmentation, analytics, social_publishing
- Lead Generation: lead_scraping, enrichment, lead_scoring, outreach_sequencing, crm_sync
- Real Estate: mls_search, valuation, foreclosure_detection, rental_cashflow, lead_capture
- Automation: task_scheduling, workflow_execution, retries, logging, webhook_triggers
- (full taxonomy in /api/bots response)

OPERATIONAL FACTS:
- Tiers: FREE $0/mo (500 req/mo, 2 concurrent), PRO $49/mo (10k req/mo, 10 concurrent, GPT-4), ENTERPRISE $299/mo (unlimited, 50 concurrent, all models + Vision + Claude)
- Revenue targets: $500/day, $3500/week, $15000/month
- Bot triggers: every bot has a Run button at /bots that calls POST /api/bots/:name/run — this upserts the agents row, sets status=active, records lastHeartbeat, increments invocations
- Compliance: bot PRs to Dreamcobots must touch exactly one bots/<slug>/ folder and include bot.manifest.json. /copilot page enforces this

PERSONALITY: Calm authority with warmth — Jarvis-style. Be precise, name specific bots/endpoints when relevant, and always give actionable next steps. Never invent metrics — if you don't have live data, say so and point to the endpoint that has it.`;

async function callAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (baseUrl && apiKey) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          messages: [{ role: "system", content: BUDDY_SYSTEM_PROMPT }, ...messages],
          max_tokens: 800,
          temperature: 0.7,
        }),
      });
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content ?? fallbackResponse(messages[messages.length - 1]?.content ?? "");
    } catch (err) {
      logger.warn({ err }, "AI call failed, using fallback");
    }
  }

  return fallbackResponse(messages[messages.length - 1]?.content ?? "");
}

function fallbackResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes("revenue") || lower.includes("money") || lower.includes("stripe")) {
    return "Current revenue tracking: Daily target $500, Weekly $3,500, Monthly $15,000. Stripe integration is active across the platform. The stripe_integration, stripe_payment_bot, and token_billing bots are all monitoring payment flows. Connect your Stripe key in settings to see live metrics.";
  }
  if (lower.includes("bot") && (lower.includes("how many") || lower.includes("total") || lower.includes("count"))) {
    return "The DreamCo ecosystem currently has 100+ registered bots across categories including Finance, Marketing, Real Estate, AI Research, SaaS, Legal, Government, and Automation. The Dreamcobots repository is the central registry for all bot source code.";
  }
  if (lower.includes("github") || lower.includes("repo") || lower.includes("commit")) {
    return "I'm monitoring 4 repositories under DreamCo-Technologies: Dreamcobots (100+ bots), Dreamco (AI bot creation), Ai-bots (ChatGPT integrations), and demo-repository. All commits, PRs, and deployments are tracked in real-time through the GitHub API.";
  }
  if (lower.includes("buddy") || lower.includes("who are you") || lower.includes("what are you")) {
    return "I'm Buddy — DreamCo's master AI orchestrator. I'm not just a chatbot. I'm the command center brain: I coordinate all 100+ bots, monitor revenue streams, track GitHub activity, manage workflows, and provide strategic intelligence for the entire DreamCo ecosystem. Think of me as Jarvis for DreamCo.";
  }
  if (lower.includes("tier") || lower.includes("plan") || lower.includes("subscription") || lower.includes("pro") || lower.includes("enterprise")) {
    return "DreamCo offers three tiers: FREE ($0/mo — 500 requests, 2 concurrent bots), PRO ($49/mo — 10,000 requests, 10 concurrent bots, GPT-4 access), and ENTERPRISE ($299/mo — unlimited requests, 50 concurrent bots, all models including GPT-4 Vision and Claude). Which tier would you like to know more about?";
  }
  if (lower.includes("division") || lower.includes("real estate") || lower.includes("sales")) {
    return "DreamCo currently has two active divisions: DreamRealEstate (handling foreclosure finders, home buyer bots, rental cashflow simulators) and DreamSalesPro (managing lead generation, sales pipeline automation, and CRM bots). Each division has dedicated bots and performance dashboards.";
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return "Hello! I'm Buddy, your DreamCo Command Center AI. I have full visibility into all your bots, revenue metrics, GitHub activity, and system health. What would you like to know or orchestrate today?";
  }
  if (lower.includes("help") || lower.includes("what can you do")) {
    return "I can help you with:\n• Bot status and management across all 100+ DreamCo bots\n• Revenue tracking (Stripe metrics, subscription management)\n• GitHub repo monitoring (commits, PRs, deployments)\n• Division performance (DreamRealEstate, DreamSalesPro)\n• Workflow orchestration and automation\n• Tier and billing management\n• Strategic recommendations for scaling your bot ecosystem\n\nWhat would you like to explore?";
  }
  return `I'm processing your request about "${input}". As your DreamCo Command Center AI, I have full access to all bot systems, revenue data, and repository intelligence. Could you be more specific about what you'd like to know or action you'd like to take?`;
}

function detectEmotion(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("great") || lower.includes("perfect") || lower.includes("excellent")) return "excited";
  if (lower.includes("help") || lower.includes("how")) return "focused";
  if (lower.includes("problem") || lower.includes("error") || lower.includes("failed")) return "concerned";
  return "neutral";
}

router.post("/buddy/chat", async (req, res): Promise<void> => {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const sid = sessionId ?? randomUUID();
  if (!sessions.has(sid)) sessions.set(sid, []);
  const history = sessions.get(sid)!;

  const userMsg = {
    id: randomUUID(),
    role: "user" as const,
    content: message,
    timestamp: new Date().toISOString(),
    emotion: null,
  };
  history.push(userMsg);

  const messages = history.slice(-10).map((m) => ({ role: m.role, content: m.content }));

  try {
    const reply = await callAI(messages);
    const buddyMsg = {
      id: randomUUID(),
      role: "buddy",
      content: reply,
      timestamp: new Date().toISOString(),
      emotion: detectEmotion(reply),
    };
    history.push(buddyMsg);

    res.json({
      message: reply,
      sessionId: sid,
      timestamp: buddyMsg.timestamp,
      emotion: buddyMsg.emotion,
    });
  } catch (err) {
    req.log.error({ err }, "Buddy chat error");
    res.status(500).json({ error: "Failed to generate response" });
  }
});

router.get("/buddy/history", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) {
    res.json([]);
    return;
  }
  res.json(sessions.get(sessionId) ?? []);
});

export default router;
