import { Agent } from "undici";

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  web_url: string;
}

// Insecure/custom CA agent for internal corporate GitLab instances
const gitlabAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

export async function fetchTodayGitLabCommits(): Promise<{
  commits: GitLabCommit[];
  recentCommits: GitLabCommit[];
  filteredCount: number;
  error?: string;
}> {
  const baseUrl = process.env.GITLAB_BASE_URL?.replace(/\/$/, "");
  const projectId = process.env.GITLAB_PROJECT_ID;
  const token = process.env.GITLAB_TOKEN;
  const authorName = process.env.GITLAB_AUTHOR_NAME?.trim();

  if (!baseUrl || !projectId || !token) {
    return {
      commits: [],
      recentCommits: [],
      filteredCount: 0,
      error: "GitLab configuration is incomplete. Check GITLAB_BASE_URL, GITLAB_PROJECT_ID, and GITLAB_TOKEN in .env",
    };
  }

  // Calculate beginning of today in WIB (UTC+7)
  const now = new Date();
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibDate = new Date(now.getTime() + wibOffsetMs);

  const year = wibDate.getUTCFullYear();
  const month = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wibDate.getUTCDate()).padStart(2, "0");

  // 00:00:00 WIB in ISO representation
  const sinceISO = `${year}-${month}-${day}T00:00:00+07:00`;
  const sinceTime = new Date(sinceISO).getTime();

  try {
    const encodedProjectId = encodeURIComponent(projectId);
    // Fetch last 50 commits to cover both today and recent activity
    const endpoint = new URL(`${baseUrl}/api/v4/projects/${encodedProjectId}/repository/commits`);
    endpoint.searchParams.set("all", "true");
    endpoint.searchParams.set("per_page", "50");
    endpoint.searchParams.set("with_stats", "false");

    const response = await fetch(endpoint.toString(), {
      headers: {
        "PRIVATE-TOKEN": token,
        Accept: "application/json",
      },
      // @ts-ignore
      dispatcher: gitlabAgent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        commits: [],
        recentCommits: [],
        filteredCount: 0,
        error: `GitLab API responded with ${response.status}: ${errorText.slice(0, 150)}`,
      };
    }

    const rawCommits = (await response.json()) as GitLabCommit[];

    const ignoredPatterns = [
      /^merge branch/i,
      /^merge remote-tracking branch/i,
      /^wip$/i,
      /^temp$/i,
    ];

    let filteredCount = 0;
    const cleanCommits = rawCommits.filter((commit) => {
      if (
        authorName &&
        !commit.author_name.toLowerCase().includes(authorName.toLowerCase()) &&
        !commit.author_email.toLowerCase().includes(authorName.toLowerCase())
      ) {
        filteredCount++;
        return false;
      }

      const isIgnored = ignoredPatterns.some((pattern) => pattern.test(commit.title.trim()));
      if (isIgnored) {
        filteredCount++;
        return false;
      }

      return true;
    });

    // Today's commits (since 00:00 WIB)
    const todayCommits = cleanCommits.filter(
      (c) => new Date(c.authored_date).getTime() >= sinceTime
    );

    // Latest 5 commits regardless of date (for preview and fallback)
    const recentCommits = cleanCommits.slice(0, 5);

    return {
      commits: todayCommits,
      recentCommits,
      filteredCount,
    };
  } catch (err: any) {
    return {
      commits: [],
      recentCommits: [],
      filteredCount: 0,
      error: `Failed to connect to GitLab: ${err.message || String(err)}`,
    };
  }
}
