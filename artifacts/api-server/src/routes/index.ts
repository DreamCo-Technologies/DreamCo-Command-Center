import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botsRouter from "./bots";
import githubRouter from "./github";
import stripeRouter from "./stripe";
import buddyRouter from "./buddy";
import dashboardRouter from "./dashboard";
import copilotRouter from "./copilot";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botsRouter);
router.use(githubRouter);
router.use(stripeRouter);
router.use(buddyRouter);
router.use(dashboardRouter);
router.use(copilotRouter);
router.use(authRouter);

export default router;
