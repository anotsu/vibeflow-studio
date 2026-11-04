import { Octokit } from "octokit";
import { parseGitHubRepo, decrypt } from "@/lib/utils";
import type {
  GitHubBranch,
  GitHubDiff,
  GitHubPR,
  GitHubCommit,
} from "@/types";

/**
 * Service class for interacting with the GitHub API via Octokit.
 * Provides methods for branch management, pull requests, issues,
 * file content retrieval, and repository tree inspection.
 */
export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  /**
   * Create a new GitHubService instance.
   * @param githubRepo - Repository in "owner/repo" format.
   * @param token - GitHub personal access token (may be encrypted).
   */
  constructor(githubRepo: string, token: string) {
    const parsed = parseGitHubRepo(githubRepo);
    this.owner = parsed.owner;
    this.repo = parsed.repo;

    let resolvedToken: string;
    try {
      resolvedToken = decrypt(token);
    } catch {
      // If decryption fails, assume the token is already in plaintext
      resolvedToken = token;
    }

    this.octokit = new Octokit({ auth: resolvedToken });
  }

  /**
   * Fetch the repository's default branch name (e.g. "main" or "master").
   * @returns The default branch name.
   */
  async getDefaultBranch(): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return data.default_branch;
    } catch (error) {
      throw new Error(
        `GitHubService.getDefaultBranch failed for ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * List all branches in the repository.
   * @returns Array of branch objects.
   */
  async getBranches(): Promise<GitHubBranch[]> {
    try {
      const branches: GitHubBranch[] = [];
      const iterator = this.octokit.paginate.iterator(
        this.octokit.rest.repos.listBranches,
        {
          owner: this.owner,
          repo: this.repo,
          per_page: 100,
        }
      );

      for await (const response of iterator) {
        for (const branch of response.data) {
          branches.push({
            name: branch.name,
            sha: branch.commit.sha,
            protected: branch.protected,
          });
        }
      }

      return branches;
    } catch (error) {
      throw new Error(
        `GitHubService.getBranches failed for ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a new branch from an existing base branch.
   * @param branchName - Name for the new branch.
   * @param fromBranch - Base branch to branch from. Defaults to the repo's default branch.
   * @returns The newly created branch object.
   */
  async createBranch(
    branchName: string,
    fromBranch?: string
  ): Promise<GitHubBranch> {
    try {
      const baseBranch = fromBranch ?? (await this.getDefaultBranch());

      // Get the SHA of the base branch's HEAD
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${baseBranch}`,
      });
      const baseSha = refData.object.sha;

      // Create the new branch ref
      const { data: newRef } = await this.octokit.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });

      return {
        name: branchName,
        sha: newRef.object.sha,
        protected: false,
      };
    } catch (error) {
      throw new Error(
        `GitHubService.createBranch failed for branch "${branchName}" in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete a branch from the repository.
   * @param branchName - Name of the branch to delete.
   */
  async deleteBranch(branchName: string): Promise<void> {
    try {
      await this.octokit.rest.git.deleteRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branchName}`,
      });
    } catch (error) {
      throw new Error(
        `GitHubService.deleteBranch failed for branch "${branchName}" in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compare two branches and return file-level diffs.
   * @param baseBranch - The base branch for comparison.
   * @param headBranch - The head branch for comparison.
   * @returns Array of file-level diff objects.
   */
  async getBranchDiff(
    baseBranch: string,
    headBranch: string
  ): Promise<GitHubDiff[]> {
    try {
      const { data } = await this.octokit.rest.repos.compareCommits({
        owner: this.owner,
        repo: this.repo,
        base: baseBranch,
        head: headBranch,
      });

      if (!data.files) {
        return [];
      }

      return data.files.map((file) => ({
        filename: file.filename,
        status: file.status as GitHubDiff["status"],
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      }));
    } catch (error) {
      throw new Error(
        `GitHubService.getBranchDiff failed comparing "${baseBranch}" to "${headBranch}" in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the full unified diff text between two branches.
   * @param baseBranch - The base branch for comparison.
   * @param headBranch - The head branch for comparison.
   * @returns The full unified diff as a string.
   */
  async getFullDiff(
    baseBranch: string,
    headBranch: string
  ): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.compareCommits({
        owner: this.owner,
        repo: this.repo,
        base: baseBranch,
        head: headBranch,
        headers: {
          accept: "application/vnd.github.diff",
        },
      });

      // When requesting diff format, the response data is the raw diff string
      return response.data as unknown as string;
    } catch (error) {
      throw new Error(
        `GitHubService.getFullDiff failed comparing "${baseBranch}" to "${headBranch}" in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get recent commits on a branch.
   * @param branch - The branch to list commits for.
   * @param count - Maximum number of commits to return. Defaults to 10.
   * @returns Array of commit objects.
   */
  async getRecentCommits(
    branch: string,
    count: number = 10
  ): Promise<GitHubCommit[]> {
    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        sha: branch,
        per_page: count,
      });

      return data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author:
          commit.commit.author?.name ??
          commit.author?.login ??
          "unknown",
        date: commit.commit.author?.date ?? new Date().toISOString(),
        url: commit.html_url,
      }));
    } catch (error) {
      throw new Error(
        `GitHubService.getRecentCommits failed for branch "${branch}" in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a pull request.
   * @param params - PR parameters including title, body, head, and base branch.
   * @returns The created pull request object.
   */
  async createPullRequest(params: {
    title: string;
    body: string;
    head: string;
    base: string;
  }): Promise<GitHubPR> {
    try {
      const { data } = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base,
      });

      return {
        number: data.number,
        title: data.title,
        body: data.body ?? "",
        state: data.state,
        htmlUrl: data.html_url,
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        mergeable: data.mergeable,
      };
    } catch (error) {
      throw new Error(
        `GitHubService.createPullRequest failed for "${params.title}" (${params.head} -> ${params.base}) in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Merge a pull request.
   * @param prNumber - The PR number to merge.
   * @param mergeMethod - The merge strategy: "merge", "squash", or "rebase". Defaults to "squash".
   * @returns Object with the merge commit SHA and merge status.
   */
  async mergePullRequest(
    prNumber: number,
    mergeMethod: "merge" | "squash" | "rebase" = "squash"
  ): Promise<{ sha: string; merged: boolean }> {
    try {
      const { data } = await this.octokit.rest.pulls.merge({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        merge_method: mergeMethod,
      });

      return {
        sha: data.sha,
        merged: data.merged,
      };
    } catch (error) {
      throw new Error(
        `GitHubService.mergePullRequest failed for PR #${prNumber} in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Close a pull request without merging.
   * @param prNumber - The PR number to close.
   */
  async closePullRequest(prNumber: number): Promise<void> {
    try {
      await this.octokit.rest.pulls.update({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        state: "closed",
      });
    } catch (error) {
      throw new Error(
        `GitHubService.closePullRequest failed for PR #${prNumber} in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get details of a pull request.
   * @param prNumber - The PR number to retrieve.
   * @returns The pull request details.
   */
  async getPullRequest(prNumber: number): Promise<GitHubPR> {
    try {
      const { data } = await this.octokit.rest.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      return {
        number: data.number,
        title: data.title,
        body: data.body ?? "",
        state: data.state,
        htmlUrl: data.html_url,
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        mergeable: data.mergeable,
      };
    } catch (error) {
      throw new Error(
        `GitHubService.getPullRequest failed for PR #${prNumber} in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Add a comment to a pull request.
   * @param prNumber - The PR number to comment on.
   * @param body - The comment body text.
   */
  async addPRComment(prNumber: number, body: string): Promise<void> {
    try {
      await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        body,
      });
    } catch (error) {
      throw new Error(
        `GitHubService.addPRComment failed for PR #${prNumber} in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a GitHub issue.
   * @param title - Issue title.
   * @param body - Issue body text.
   * @param labels - Optional array of label names to apply.
   * @returns The created issue number and URL.
   */
  async createIssue(
    title: string,
    body: string,
    labels?: string[]
  ): Promise<{ number: number; url: string }> {
    try {
      const { data } = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels,
      });

      return {
        number: data.number,
        url: data.html_url,
      };
    } catch (error) {
      throw new Error(
        `GitHubService.createIssue failed for "${title}" in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update an existing issue.
   * @param issueNumber - The issue number to update.
   * @param updates - Fields to update (title, body, state, labels).
   */
  async updateIssue(
    issueNumber: number,
    updates: {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
    }
  ): Promise<void> {
    try {
      await this.octokit.rest.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.body !== undefined && { body: updates.body }),
        ...(updates.state !== undefined && { state: updates.state }),
        ...(updates.labels !== undefined && { labels: updates.labels }),
      });
    } catch (error) {
      throw new Error(
        `GitHubService.updateIssue failed for issue #${issueNumber} in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Read file content from the repository.
   * @param path - File path relative to the repository root.
   * @param branch - Branch to read from. Defaults to the repo's default branch.
   * @returns The decoded file content as a UTF-8 string.
   */
  async getFileContent(path: string, branch?: string): Promise<string> {
    try {
      const ref = branch ?? (await this.getDefaultBranch());

      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });

      // getContent returns a file object when path points to a file
      if (Array.isArray(data)) {
        throw new Error(
          `Path "${path}" is a directory, not a file`
        );
      }

      if (!("content" in data) || data.type !== "file") {
        throw new Error(
          `Path "${path}" is not a regular file (type: ${data.type})`
        );
      }

      // Content is base64-encoded
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return content;
    } catch (error) {
      if (error instanceof Error && error.message.includes("GitHubService")) {
        throw error;
      }
      throw new Error(
        `GitHubService.getFileContent failed for "${path}" on branch "${branch ?? "default"}" in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the file tree of the repository.
   * @param branch - Branch to read from. Defaults to the repo's default branch.
   * @param path - Optional path prefix to filter results.
   * @returns Array of tree entries with path, type, and optional size.
   */
  async getRepoTree(
    branch?: string,
    path?: string
  ): Promise<Array<{ path: string; type: "blob" | "tree"; size?: number }>> {
    try {
      const ref = branch ?? (await this.getDefaultBranch());

      const { data } = await this.octokit.rest.git.getTree({
        owner: this.owner,
        repo: this.repo,
        tree_sha: ref,
        recursive: "1",
      });

      let entries = data.tree
        .filter(
          (item): item is typeof item & { path: string; type: string } =>
            item.path !== undefined && item.type !== undefined
        )
        .filter(
          (item) => item.type === "blob" || item.type === "tree"
        )
        .map((item) => ({
          path: item.path!,
          type: item.type as "blob" | "tree",
          ...(item.size !== undefined && { size: item.size }),
        }));

      // Filter by path prefix if provided
      if (path) {
        const normalizedPath = path.endsWith("/") ? path : `${path}/`;
        entries = entries.filter(
          (entry) =>
            entry.path === path ||
            entry.path.startsWith(normalizedPath)
        );
      }

      return entries;
    } catch (error) {
      throw new Error(
        `GitHubService.getRepoTree failed for branch "${branch ?? "default"}" in ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Factory function to create a GitHubService instance.
 * @param githubRepo - Repository in "owner/repo" format.
 * @param token - GitHub personal access token (may be encrypted).
 * @returns A configured GitHubService instance.
 */
export function createGitHubService(
  githubRepo: string,
  token: string
): GitHubService {
  return new GitHubService(githubRepo, token);
}
