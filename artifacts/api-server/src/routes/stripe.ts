import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

// Profit targets from master_config.yaml
const DAILY_TARGET = 500;
const WEEKLY_TARGET = 3500;
const MONTHLY_TARGET = 15000;

async function getStripeClient() {
  if (!STRIPE_KEY || STRIPE_KEY.includes("placeholder")) return null;
  const { default: Stripe } = await import("stripe");
  return new Stripe(STRIPE_KEY);
}

router.get("/stripe/revenue", async (req, res): Promise<void> => {
  const stripe = await getStripeClient();

  if (!stripe) {
    // Return demo data when Stripe not connected
    const now = Date.now();
    res.json({
      totalRevenue: 24850.75,
      dailyRevenue: 312.50,
      weeklyRevenue: 2187.00,
      monthlyRevenue: 8640.25,
      dailyTarget: DAILY_TARGET,
      weeklyTarget: WEEKLY_TARGET,
      monthlyTarget: MONTHLY_TARGET,
      currency: "usd",
      connected: false,
    });
    return;
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;
    const weekAgo = now - 604800;
    const monthAgo = now - 2592000;

    const [dayCharges, weekCharges, monthCharges, allCharges] = await Promise.all([
      stripe.charges.list({ created: { gte: dayAgo }, limit: 100 }),
      stripe.charges.list({ created: { gte: weekAgo }, limit: 100 }),
      stripe.charges.list({ created: { gte: monthAgo }, limit: 100 }),
      stripe.charges.list({ limit: 100 }),
    ]);

    const sum = (charges: typeof dayCharges) =>
      charges.data.filter((c) => c.status === "succeeded")
        .reduce((acc, c) => acc + c.amount, 0) / 100;

    res.json({
      totalRevenue: sum(allCharges),
      dailyRevenue: sum(dayCharges),
      weeklyRevenue: sum(weekCharges),
      monthlyRevenue: sum(monthCharges),
      dailyTarget: DAILY_TARGET,
      weeklyTarget: WEEKLY_TARGET,
      monthlyTarget: MONTHLY_TARGET,
      currency: "usd",
      connected: true,
    });
  } catch (err) {
    req.log.error({ err }, "Stripe revenue fetch failed");
    res.json({
      totalRevenue: 0, dailyRevenue: 0, weeklyRevenue: 0, monthlyRevenue: 0,
      dailyTarget: DAILY_TARGET, weeklyTarget: WEEKLY_TARGET,
      monthlyTarget: MONTHLY_TARGET, currency: "usd", connected: false,
    });
  }
});

router.get("/stripe/subscriptions", async (req, res): Promise<void> => {
  const stripe = await getStripeClient();

  if (!stripe) {
    res.json([
      { id: "sub_demo1", customer: "Jordan@dreamco.ai", plan: "PRO", status: "active", amount: 49, currency: "usd", currentPeriodEnd: new Date(Date.now() + 15 * 86400000).toISOString() },
      { id: "sub_demo2", customer: "client@example.com", plan: "ENTERPRISE", status: "active", amount: 299, currency: "usd", currentPeriodEnd: new Date(Date.now() + 22 * 86400000).toISOString() },
      { id: "sub_demo3", customer: "user2@example.com", plan: "PRO", status: "active", amount: 49, currency: "usd", currentPeriodEnd: new Date(Date.now() + 8 * 86400000).toISOString() },
    ]);
    return;
  }

  try {
    const subs = await stripe.subscriptions.list({ limit: 50, status: "active" });
    const result = await Promise.all(
      subs.data.map(async (sub) => {
        let customer = sub.customer as string;
        try {
          const cust = await stripe.customers.retrieve(customer);
          if ("email" in cust && cust.email) customer = cust.email;
        } catch {}
        const item = sub.items.data[0];
        return {
          id: sub.id,
          customer,
          plan: item?.price?.nickname ?? item?.price?.id ?? "unknown",
          status: sub.status,
          amount: (item?.price?.unit_amount ?? 0) / 100,
          currency: item?.price?.currency ?? "usd",
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Stripe subscriptions fetch failed");
    res.json([]);
  }
});

router.get("/stripe/transactions", async (req, res): Promise<void> => {
  const stripe = await getStripeClient();

  if (!stripe) {
    const demos = [
      { id: "ch_demo1", amount: 299, currency: "usd", status: "succeeded", description: "Enterprise subscription", date: new Date(Date.now() - 3600000).toISOString() },
      { id: "ch_demo2", amount: 49, currency: "usd", status: "succeeded", description: "Pro subscription", date: new Date(Date.now() - 86400000).toISOString() },
      { id: "ch_demo3", amount: 49, currency: "usd", status: "succeeded", description: "Pro subscription", date: new Date(Date.now() - 172800000).toISOString() },
      { id: "ch_demo4", amount: 5, currency: "usd", status: "succeeded", description: "Token pack — 500 tokens", date: new Date(Date.now() - 259200000).toISOString() },
    ];
    res.json(demos);
    return;
  }

  try {
    const charges = await stripe.charges.list({ limit: 25 });
    res.json(
      charges.data.map((c) => ({
        id: c.id,
        amount: c.amount / 100,
        currency: c.currency,
        status: c.status,
        description: c.description ?? "Payment",
        date: new Date(c.created * 1000).toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Stripe transactions fetch failed");
    res.json([]);
  }
});

export default router;
