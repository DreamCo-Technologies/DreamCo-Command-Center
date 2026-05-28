import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";

type BuildProgress = {
  overallPercent: number;
  sections: { name: string; done: number; total: number }[];
  detail: {
    pagesBuilt: number;
    pagesPlanned: number;
    contractPushed: number;
    contractTotal: number;
    totalBots: number;
    botsWithManifest: number;
    openPRs: number;
    prsProcessed: number;
    prsMerged: number;
    prsArchived: number;
    integrations: { github: boolean; stripe: boolean; openai: boolean; database: boolean };
    probeStatus: string;
  };
};

type PhaseItem = { name: string; status: "built" | "partial" | "planned"; note?: string };
type Phase = { num: number; title: string; items: PhaseItem[] };

function buildPhases(d: BuildProgress["detail"]): Phase[] {
  const i = d.integrations;
  return [
    {
      num: 1,
      title: "Foundation Architecture",
      items: [
        { name: "pnpm monorepo workspace", status: "built" },
        { name: "API gateway (Express + OpenAPI codegen)", status: "built" },
        { name: "PostgreSQL + Drizzle ORM (7 ontology tables)", status: "built" },
        { name: "GitHub repo integration", status: i.github ? "built" : "planned" },
        { name: "Stripe billing integration", status: i.stripe ? "built" : "planned", note: i.stripe ? undefined : "STRIPE_SECRET_KEY missing" },
        { name: "OpenAI/Anthropic/Gemini routing", status: i.openai ? "built" : "planned" },
      ],
    },
    {
      num: 2,
      title: "Command Center UI",
      items: [
        { name: "React + TypeScript + Tailwind + Vite", status: "built" },
        { name: "Dashboard summary widgets", status: "built" },
        { name: "Bot registry (171 bots, named capabilities)", status: "built" },
        { name: "Buddy AI chat console", status: "built" },
        { name: "Revenue panel", status: "built" },
        { name: "GitHub repos panel", status: "built" },
        { name: "Divisions panel (6 divisions)", status: "built" },
        { name: "Copilot PR review panel", status: "built" },
        { name: "System Status (this page)", status: "built" },
        { name: "Global command bar (Linear/Raycast-style)", status: "planned" },
        { name: "Draggable real-time widgets", status: "planned" },
        { name: "Multi-agent graph visualization", status: "planned" },
      ],
    },
    {
      num: 3,
      title: "Auth & Security",
      items: [
        { name: "Replit Auth (OIDC + PKCE)", status: "built" },
        { name: "Session storage in Postgres", status: "built" },
        { name: "Clerk (social login)", status: "planned" },
        { name: "GitHub OAuth (act-on-behalf)", status: "planned" },
        { name: "MCP server / bearer tokens", status: "planned" },
        { name: "RBAC + audit logs", status: "planned" },
      ],
    },
    {
      num: 4,
      title: "Bot Fleet & Contract",
      items: [
        { name: `${d.totalBots || 171} bots discovered in Dreamcobots`, status: "built" },
        { name: "Named capabilities per category (21 cats)", status: "built" },
        { name: `Bot contract pushed (${d.contractPushed}/${d.contractTotal} files)`, status: d.contractPushed === d.contractTotal ? "built" : "partial" },
        { name: `Bots with bot.manifest.json (${d.botsWithManifest}/${d.totalBots || 171})`, status: d.botsWithManifest > 0 ? "partial" : "planned" },
        { name: `Open PRs to review (${d.openPRs})`, status: d.openPRs === 0 ? "built" : "partial" },
        { name: "Manual bot Run buttons (POST /api/bots/:name/run)", status: "built" },
      ],
    },
    {
      num: 5,
      title: "AI Orchestration",
      items: [
        { name: "Buddy system prompt with full bot fleet catalog", status: "built" },
        { name: "Buddy tool-calling (run bots from chat)", status: "planned" },
        { name: "Multi-model router (Claude/GPT/Gemini/Groq)", status: "partial", note: "OpenAI proxy wired; routing logic TBD" },
        { name: "Model benchmarking dashboard", status: "planned" },
        { name: "AI Battle Arena", status: "planned" },
      ],
    },
    {
      num: 6,
      title: "Workflow Automation",
      items: [
        { name: "workflows + events tables in DB", status: "built" },
        { name: "Visual workflow builder", status: "planned" },
        { name: "Autonomous workflows (auto repo auditor, market scanner)", status: "planned" },
      ],
    },
    {
      num: 7,
      title: "SQL Intelligence",
      items: [
        { name: "Postgres + Drizzle migrations", status: "built" },
        { name: "Query performance tests", status: "planned" },
        { name: "Stress tests (1k concurrent)", status: "planned" },
        { name: "Vector DB (Qdrant/Pinecone)", status: "planned" },
      ],
    },
    {
      num: 8,
      title: "Observability",
      items: [
        { name: "Pino structured logging", status: "built" },
        { name: "OpenTelemetry / Prometheus / Grafana", status: "planned" },
        { name: "Per-agent health scores", status: "planned" },
      ],
    },
  ];
}

const STATUS_META = {
  built: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10 border-primary/30", label: "BUILT" },
  partial: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", label: "BUILDING" },
  planned: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted/30 border-border/40", label: "PLANNED" },
} as const;

export default function SystemPage() {
  const { data, isLoading, error } = useQuery<BuildProgress>({
    queryKey: ["build-progress"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/build-progress");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <div className="font-mono text-muted-foreground">Loading system status...</div>;
  }
  if (error || !data) {
    return (
      <div className="font-mono text-red-500 flex items-center gap-2">
        <AlertCircle className="h-4 w-4" /> Failed to load build progress
      </div>
    );
  }

  const phases = buildPhases(data.detail);
  const builtCount = phases.flatMap((p) => p.items).filter((i) => i.status === "built").length;
  const partialCount = phases.flatMap((p) => p.items).filter((i) => i.status === "partial").length;
  const plannedCount = phases.flatMap((p) => p.items).filter((i) => i.status === "planned").length;
  const totalItems = builtCount + partialCount + plannedCount;
  const realPercent = Math.round(((builtCount + partialCount * 0.5) / totalItems) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold text-primary tracking-wider uppercase">
          SYSTEM_STATUS
        </h1>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mt-1">
          Built vs Building // Live probe of GitHub + DB + integrations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border border-primary/30 bg-primary/5 rounded-sm">
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Overall</div>
          <div className="font-mono text-3xl font-bold text-primary mt-1">{realPercent}%</div>
          <div className="text-[10px] font-mono text-muted-foreground mt-1">across {totalItems} subsystems</div>
        </div>
        <div className="p-4 border border-primary/30 bg-primary/5 rounded-sm">
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Built</div>
          <div className="font-mono text-3xl font-bold text-primary mt-1">{builtCount}</div>
        </div>
        <div className="p-4 border border-yellow-500/30 bg-yellow-500/5 rounded-sm">
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Building</div>
          <div className="font-mono text-3xl font-bold text-yellow-500 mt-1">{partialCount}</div>
        </div>
        <div className="p-4 border border-border/40 bg-muted/20 rounded-sm">
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Planned</div>
          <div className="font-mono text-3xl font-bold text-muted-foreground mt-1">{plannedCount}</div>
        </div>
      </div>

      <div className="h-2 w-full bg-muted/30 rounded-sm overflow-hidden flex">
        <div className="bg-primary" style={{ width: `${(builtCount / totalItems) * 100}%` }} />
        <div className="bg-yellow-500" style={{ width: `${(partialCount / totalItems) * 100}%` }} />
      </div>

      <div className="space-y-6">
        {phases.map((phase) => (
          <div key={phase.num} className="border border-border/40 rounded-sm bg-card/50">
            <div className="px-4 py-3 border-b border-border/40 flex items-center gap-3">
              <div className="font-mono text-xs text-muted-foreground">PHASE {phase.num}</div>
              <div className="font-mono text-sm font-bold text-foreground uppercase tracking-wider">
                {phase.title}
              </div>
              <div className="ml-auto font-mono text-[10px] text-muted-foreground">
                {phase.items.filter((i) => i.status === "built").length} / {phase.items.length}
              </div>
            </div>
            <div className="divide-y divide-border/40">
              {phase.items.map((item, idx) => {
                const meta = STATUS_META[item.status];
                const Icon = meta.icon;
                return (
                  <div key={idx} className="px-4 py-2.5 flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${meta.color} ${item.status === "partial" ? "animate-spin" : ""}`} />
                    <div className="flex-1 font-mono text-sm">{item.name}</div>
                    {item.note && (
                      <div className="font-mono text-[10px] text-muted-foreground italic">{item.note}</div>
                    )}
                    <div className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
