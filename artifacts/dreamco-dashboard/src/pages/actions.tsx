import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GitMerge, CheckCircle2, XCircle, Loader2, PlayCircle, ExternalLink } from "lucide-react";

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
    queryFn: async () => {
      const r = await fetch("/api/github/actions");
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    },
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-border/40 pb-4">
        <h1 className="font-mono text-2xl text-primary tracking-wider flex items-center gap-2">
          <PlayCircle className="h-6 w-6" /> GITHUB_ACTIONS
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          Live workflow runs across DreamCo-Technologies repositories — refreshes every 15s
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="TOTAL_RUNS" value={q.data?.totals.totalRuns ?? 0} loading={q.isLoading} />
        <Stat label="SUCCEEDED" value={q.data?.totals.success ?? 0} loading={q.isLoading} tone="emerald" />
        <Stat label="FAILED" value={q.data?.totals.failure ?? 0} loading={q.isLoading} tone="destructive" />
        <Stat label="IN_PROGRESS" value={q.data?.totals.inProgress ?? 0} loading={q.isLoading} tone="primary" />
      </div>

      <Card className="p-4 border-border/40">
        <h2 className="font-mono text-sm text-primary uppercase tracking-wider mb-3">// recent workflow runs</h2>
        {q.isLoading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (q.data?.runs ?? []).length === 0 ? (
          <div className="font-mono text-xs text-muted-foreground py-6 text-center">No workflow runs found. Push a .github/workflows/*.yml to any repo to start seeing runs here.</div>
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
      </Card>
    </div>
  );
}

function Stat({ label, value, loading, tone }: { label: string; value: number; loading: boolean; tone?: "emerald" | "destructive" | "primary" }) {
  const color = tone === "emerald" ? "text-emerald-400" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <Card className="p-3 border-border/40">
      <div className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      {loading ? <Skeleton className="h-7 w-16 mt-1" /> : <div className={`font-mono text-2xl mt-1 ${color}`}>{value}</div>}
    </Card>
  );
}
