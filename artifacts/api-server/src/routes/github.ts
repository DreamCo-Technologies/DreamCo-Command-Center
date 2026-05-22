import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const ORG = "DreamCo-Technologies";
const REPOS = ["Dreamcobots", "Dreamco", "Ai-bots", "demo-repository"];

async function ghFetch(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "User-Agent": "dreamco-dashboard",
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${path}`);
  return res.json();
}

router.get("/github/repos", async (req, res): Promise<void> => {
  try {
    const data = await ghFetch(`/orgs/${ORG}/repos?per_page=50&sort=updated`) as Array<{
      name: string; full_name: string; description: string | null;
      private: boolean; html_url: string; stargazers_count: number;
      forks_count: number; updated_at: string; language: string | null;
      open_issues_count: number;
    }>;
    const repos = data.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      isPrivate: r.private,
      url: r.html_url,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updatedAt: r.updated_at,
      language: r.language,
      openIssues: r.open_issues_count,
    }));
    res.json(repos);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch repos");
    res.json([]);
  }
});

router.get("/github/commits", async (req, res): Promise<void> => {
  try {
    const allCommits: object[] = [];
    for (const repo of REPOS) {
      try {
        const commits = await ghFetch(
          `/repos/${ORG}/${repo}/commits?per_page=10`
        ) as Array<{
          sha: string;
          commit: { message: string; author: { name: string; date: string } };
          html_url: string;
        }>;
        for (const c of commits) {
          allCommits.push({
            sha: c.sha.slice(0, 7),
            message: c.commit.message.split("\n")[0],
            author: c.commit.author.name,
            date: c.commit.author.date,
            repoName: repo,
            url: c.html_url,
          });
        }
      } catch {
        // skip repo if inaccessible
      }
    }
    allCommits.sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    res.json(allCommits.slice(0, 30));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch commits");
    res.json([]);
  }
});

router.get("/github/activity", async (req, res): Promise<void> => {
  try {
    const reposData = await ghFetch(`/orgs/${ORG}/repos?per_page=50`) as Array<{ name: string }>;
    const totalRepos = reposData.length;

    let totalCommits = 0;
    const recentEvents: object[] = [];

    for (const repo of REPOS) {
      try {
        const commits = await ghFetch(
          `/repos/${ORG}/${repo}/commits?per_page=5`
        ) as Array<{
          sha: string;
          commit: { message: string; author: { date: string } };
        }>;
        totalCommits += commits.length;
        for (const c of commits) {
          recentEvents.push({
            type: "commit",
            repo,
            description: c.commit.message.split("\n")[0],
            date: c.commit.author.date,
          });
        }
      } catch {
        // skip
      }
    }

    recentEvents.sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json({
      totalCommits,
      totalRepos,
      totalBots: 100,
      activeRepos: totalRepos,
      recentEvents: recentEvents.slice(0, 20),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch activity");
    res.json({
      totalCommits: 0, totalRepos: 4, totalBots: 100,
      activeRepos: 4, recentEvents: [],
    });
  }
});

export default router;
