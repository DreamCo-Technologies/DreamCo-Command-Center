import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitMerge, CheckCircle2, XCircle, Loader2, PlayCircle, ExternalLink, Terminal, Bot, Send, Zap } from "lucide-react";

interface Run {
  id: number; repo: string; name: string; branch: string | null;
  status: string; conclusion: string | null; event: string;
  runNumber: number; actor: string | null; url: string;
  createdAt: string; updatedAt: string;
}
interface ActionsResp {
  totals: { totalRuns: number; success: number; failure: number; inProgress: number };
  runs: Run[];
}
interface BotItem { name: string; displayName?: string; status?: string; invocations?: number; tier?: string }

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}

function statusBadge(r: Run) {
  if (r.status === "in_progress" || r.status === "queued") {
    return <Badge variant="outline" className="font-mono text-[10px] gap-1"><Loader2 className="h-3 w-3 animate-spin" />{r.status}</Badge>;
  }
  if (r.conclusion === "success") return <Badge className="font-mono text-[10px] gap-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3" />success</Badge>;
  if (r.conclusion === "failure") return <Badge variant="destructive" className="font-mono text-[10px] gap-1"><XCircle className="h-3 w-3" />failure</Badge>;
  return <Badge variant="secondary" className="font-mono text-[10px]">{r.conclusion ?? r.status}</Badge>;
}

export default function ActionsPage() {
  const q = useQuery<ActionsResp>({
    queryKey: ["github-actions"],
    queryFn: () => api<ActionsResp>("/github/actions"),
    refetchInterval: 15000,
  });

  const bots = useQuery<BotItem[]>({
    queryKey: ["bots-list"],
    queryFn: () => api<BotItem[]>("/bots"),
    staleTime: 60000,
  });

  // Buddy quick-chat
  const [buddyMsg, setBuddyMsg] = useState("");
  const [buddyReply, setBuddyReply] = useState<string | null>(null);
  const buddyChat = useMutation({
    mutationFn: (message: string) => api<{ message: string; emotion?: string }>("/buddy/chat", {
      method: "POST", body: JSON.stringify({ message, sessionId: "actions-quick-test" }),
    }),
    onSuccess: (d) => setBuddyReply(d.message),
  });

  // Bot trigger
  const [botName, setBotName] = useState("");
  const [botResult, setBotResult] = useState<string | null>(null);
  const botRun = useMutation({
    mutationFn: (name: string) => api<{ ok: boolean; name: string; status: string; invocations: number; message: string }>(`/bots/${encodeURIComponent(name)}/run`, {
      method: "POST", body: JSON.stringify({ trigger: "actions-page" }),
    }),
    onSuccess: (d) => setBotResult(`✓ ${d.name} → ${d.status} (invocations: ${d.invocations})`),
    onError: (err) => setBotResult(`✗ ${String(err)}`),
  });

  const featuredBots = ["buddy_bot", "stripe_payment_bot", "lead_gen_bot", "social_media_bot", "real_estate_bot", "stock_trading_bot"];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header — matches /dashboard styling */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
          <PlayCircle className="h-8 w-8 text-primary" />
          Live_Operations
        </h1>
        <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
          GitHub Actions Feed // Buddy + Bot Live Test Console
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="TOTAL_RUNS" value={q.data?.totals.totalRuns ?? 0} loading={q.isLoading} icon={<PlayCircle className="h-5 w-5 text-primary" />} />
        <Stat label="SUCCEEDED" value={q.data?.totals.success ?? 0} loading={q.isLoading} tone="emerald" icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} />
        <Stat label="FAILED" value={q.data?.totals.failure ?? 0} loading={q.isLoading} tone="destructive" icon={<XCircle className="h-5 w-5 text-destructive" />} />
        <Stat label="IN_PROGRESS" value={q.data?.totals.inProgress ?? 0} loading={q.isLoading} tone="primary" icon={<Loader2 className="h-5 w-5 text-primary" />} />
      </div>

      {/* Live test console — Buddy + Bots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Buddy */}
        <Card className="p-4 space-y-3 border-border/40 bg-card/50 backdrop-blur">
          <h2 className="font-mono text-sm text-primary uppercase tracking-wider flex items-center gap-2">
            <Terminal className="h-4 w-4" /> // buddy quick-test
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            Send Buddy any directive. Live response from GPT-5 via Replit AI proxy.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); if (buddyMsg.trim()) buddyChat.mutate(buddyMsg.trim()); }}
            className="flex gap-2"
          >
            <Input
              value={buddyMsg} onChange={(e) => setBuddyMsg(e.target.value)}
              placeholder="e.g. status of revenue today"
              className="font-mono text-sm" data-testid="input-buddy-quick"
            />
            <Button type="submit" disabled={!buddyMsg.trim() || buddyChat.isPending} className="font-mono text-xs">
              {buddyChat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          {buddyChat.error ? <div className="font-mono text-xs text-destructive">{String(buddyChat.error as Error)}</div> : null}
          {buddyReply ? (
            <div className="font-mono text-xs bg-background/80 border border-border/40 rounded p-3 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {buddyReply}
            </div>
          ) : null}
        </Card>

        {/* Bot trigger */}
        <Card className="p-4 space-y-3 border-border/40 bg-card/50 backdrop-blur">
          <h2 className="font-mono text-sm text-primary uppercase tracking-wider flex items-center gap-2">
            <Bot className="h-4 w-4" /> // bot quick-test ({bots.data?.length ?? 0} bots loaded)
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            Click any featured bot or type a name. Records heartbeat + invocation in Postgres.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {featuredBots.map((b) => (
              <Button
                key={b} size="sm" variant="outline"
                onClick={() => { setBotName(b); botRun.mutate(b); }}
                disabled={botRun.isPending}
                className="font-mono text-[10px] h-7"
                data-testid={`bot-quick-${b}`}
              >
                <Zap className="h-3 w-3 mr-1" />{b}
              </Button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (botName.trim()) botRun.mutate(botName.trim()); }}
            className="flex gap-2"
          >
            <Input
              value={botName} onChange={(e) => setBotName(e.target.value)}
              placeholder="bot_name (e.g. god_bot)"
              className="font-mono text-sm" data-testid="input-bot-name"
              list="bot-suggestions"
            />
            <datalist id="bot-suggestions">
              {(bots.data ?? []).slice(0, 50).map((b) => <option key={b.name} value={b.name} />)}
            </datalist>
            <Button type="submit" disabled={!botName.trim() || botRun.isPending} className="font-mono text-xs">
              {botRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "RUN"}
            </Button>
          </form>
          {botResult ? (
            <div className={`font-mono text-xs rounded p-2 border ${botResult.startsWith("✓") ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
              {botResult}
            </div>
          ) : null}
        </Card>
      </div>

      {/* Workflow runs */}
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <div className="p-4 border-b border-border/40">
          <h2 className="font-mono text-sm text-primary uppercase tracking-wider flex items-center gap-2">
            <GitMerge className="h-4 w-4" /> // recent workflow runs · auto-refresh 15s
          </h2>
        </div>
        <div className="p-4">
          {q.isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (q.data?.runs ?? []).length === 0 ? (
            <div className="font-mono text-xs text-muted-foreground py-6 text-center">No workflow runs found. Push a .github/workflows/*.yml to any repo to see runs here.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {q.data!.runs.map(r => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-2.5 hover:bg-muted/30 px-2 -mx-2 rounded">
                  <GitMerge className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm text-foreground truncate">{r.name} <span className="text-muted-foreground">#{r.runNumber}</span></div>
                    <div className="font-mono text-[10px] text-muted-foreground truncate">
                      {r.repo} · {r.branch ?? "—"} · {r.event} · {r.actor ?? "system"} · {new Date(r.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  {statusBadge(r)}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, loading, tone, icon }: { label: string; value: number; loading: boolean; tone?: "emerald" | "destructive" | "primary"; icon?: React.ReactNode }) {
  const color = tone === "emerald" ? "text-emerald-400" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <Card className="p-4 border-border/40 bg-card/50 backdrop-blur">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
        {icon}
      </div>
      {loading ? <Skeleton className="h-8 w-16" /> : <div className={`font-mono text-3xl ${color}`}>{value}</div>}
    </Card>
  );
}
