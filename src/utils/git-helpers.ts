/**
 * Git helper utilities
 * Detects Git repository information and generates source URLs
 */

import * as path from 'path';
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

/**
 * Git repository information
 */
export interface GitRepository {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'unknown';
  url: string;
  branch: string;
  rootDir: string;
}

/**
 * Detect Git repository information from a directory
 */
export async function detectGitRepository(dir: string): Promise<GitRepository | undefined> {
  try {
    const options: Partial<SimpleGitOptions> = {
      baseDir: dir,
      binary: 'git',
      maxConcurrentProcesses: 1,
    };

    const git: SimpleGit = simpleGit(options);

    // Check if directory is inside a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return undefined;
    }

    // Get root directory of the repo
    const rootDir = await git.revparse(['--show-toplevel']);

    // Get remote URL
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');

    if (!origin || !origin.refs.fetch) {
      return undefined;
    }

    const remoteUrl = origin.refs.fetch;

    // Get current branch
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);

    // Detect provider and normalize URL
    const { provider, url } = parseRemoteUrl(remoteUrl);

    return {
      provider,
      url,
      branch: branch.trim(),
      rootDir: rootDir.trim(),
    };
  } catch (error) {
    // Git not available or not a repo
    return undefined;
  }
}

/**
 * Parse remote URL and detect provider
 * Converts SSH URLs to HTTPS format
 */
function parseRemoteUrl(remoteUrl: string): { provider: GitRepository['provider']; url: string } {
  // Normalize SSH URLs to HTTPS
  let url = remoteUrl;

  // SSH protocol format: ssh://git@github.com/user/repo.git
  if (url.startsWith('ssh://')) {
    url = url.replace(/^ssh:\/\/git@/, 'https://');
    url = url.replace(/\.git$/, '');
  }

  // GitHub SSH: git@github.com:user/repo.git
  if (url.startsWith('git@github.com:')) {
    url = url.replace('git@github.com:', 'https://github.com/');
    url = url.replace(/\.git$/, '');
    return { provider: 'github', url };
  }

  // GitLab SSH: git@gitlab.com:user/repo.git
  if (url.startsWith('git@gitlab.com:')) {
    url = url.replace('git@gitlab.com:', 'https://gitlab.com/');
    url = url.replace(/\.git$/, '');
    return { provider: 'gitlab', url };
  }

  // Bitbucket Cloud SSH: git@bitbucket.org:user/repo.git
  if (url.startsWith('git@bitbucket.org:')) {
    url = url.replace('git@bitbucket.org:', 'https://bitbucket.org/');
    url = url.replace(/\.git$/, '');
    return { provider: 'bitbucket', url };
  }

  // Bitbucket Server SSH: ssh://git@bitbucket.company.com:7999/project/repo.git
  // or git@bitbucket.company.com:project/repo.git
  // Convert to: https://bitbucket.company.com/projects/PROJECT/repos/repo/browse
  if (url.includes('bitbucket') && !url.includes('bitbucket.org')) {
    // Remove SSH protocol if present
    url = url.replace(/^ssh:\/\//, '');

    // Handle format: git@host:port/project/repo.git or git@host/scm/project/repo.git
    const serverMatch = url.match(/git@([^:\/]+)(?::\d+)?\/(?:scm\/)?([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (serverMatch) {
      const [, host, project, repo] = serverMatch;
      // Bitbucket Server format
      url = `https://${host}/projects/${project.toUpperCase()}/repos/${repo}/browse`;
      return { provider: 'bitbucket', url };
    }
  }

  // Generic git@ format: git@host:path/repo.git → https://host/path/repo
  if (url.startsWith('git@') && url.includes(':')) {
    url = url.replace(/^git@([^:]+):/, 'https://$1/');
    url = url.replace(/\.git$/, '');
  }

  // Azure DevOps SSH: git@ssh.dev.azure.com:v3/org/project/repo
  if (url.includes('dev.azure.com')) {
    // Azure URLs are complex, try to normalize
    const match = url.match(/dev\.azure\.com[:/]v3[:/]([^/]+)\/([^/]+)\/([^/]+)/);
    if (match) {
      const [, org, project, repo] = match;
      url = `https://dev.azure.com/${org}/${project}/_git/${repo}`;
      return { provider: 'azure', url };
    }
  }

  // Remove .git suffix from HTTPS URLs
  url = url.replace(/\.git$/, '');

  // Detect provider from URL
  if (url.includes('github.com')) {
    return { provider: 'github', url };
  } else if (url.includes('gitlab.com')) {
    return { provider: 'gitlab', url };
  } else if (url.includes('bitbucket.org')) {
    return { provider: 'bitbucket', url };
  } else if (url.includes('dev.azure.com')) {
    return { provider: 'azure', url };
  }

  return { provider: 'unknown', url };
}

/**
 * Generate source URL for a file
 */
export function generateSourceUrl(
  filePath: string,
  gitInfo: GitRepository,
  line?: number
): string | undefined {
  if (gitInfo.provider === 'unknown') {
    return undefined;
  }

  // Make filePath relative to git root
  const relativePath = path.relative(gitInfo.rootDir, filePath).replace(/\\/g, '/');

  const lineFragment = line ? `#L${line}` : '';

  switch (gitInfo.provider) {
    case 'github':
      return `${gitInfo.url}/blob/${gitInfo.branch}/${relativePath}${lineFragment}`;

    case 'gitlab':
      return `${gitInfo.url}/-/blob/${gitInfo.branch}/${relativePath}${lineFragment}`;

    case 'bitbucket':
      // Check if it's Bitbucket Server (contains /projects/ or /repos/)
      if (gitInfo.url.includes('/projects/') || gitInfo.url.includes('/repos/')) {
        // Bitbucket Server format
        const atFragment = line ? `#${line}` : '';
        return `${gitInfo.url}/${relativePath}?at=refs%2Fheads%2F${gitInfo.branch}${atFragment}`;
      } else {
        // Bitbucket Cloud format - uses #lines-N format
        const bitbucketLine = line ? `#lines-${line}` : '';
        return `${gitInfo.url}/src/${gitInfo.branch}/${relativePath}${bitbucketLine}`;
      }

    case 'azure':
      // Azure DevOps format: ?path=/file&line=N
      const azureLine = line ? `&line=${line}` : '';
      return `${gitInfo.url}?path=/${relativePath}${azureLine}`;

    default:
      return undefined;
  }
}

/**
 * Resolve absolute file path from project root
 */
export function resolveFilePath(rootDir: string, relativePath: string): string {
  return path.resolve(rootDir, relativePath);
}

/**
 * Make path relative to root directory
 */
export function makeRelative(absolutePath: string, rootDir: string): string {
  return path.relative(rootDir, absolutePath).replace(/\\/g, '/');
}

/**
 * Get base directory for path resolution
 * Prefers git root over parsing root for consistency
 */
export function getBaseDir(rootDir: string, gitInfo?: GitRepository): string {
  return gitInfo?.rootDir || rootDir;
}

/**
 * Resolve entity file path to absolute path
 * Entity filePath is relative to git root (if git detected) or parsing root
 */
export function resolveEntityPath(
  entityRelativePath: string,
  rootDir: string,
  gitInfo?: GitRepository
): string {
  const baseDir = getBaseDir(rootDir, gitInfo);
  return path.resolve(baseDir, entityRelativePath);
}

/**
 * Generate location metadata with consistent path and sourceUrl
 */
export function generateLocationMetadata(
  absolutePath: string,
  rootDir: string,
  gitInfo?: GitRepository,
  exists?: boolean
): { filePath: string; sourceUrl?: string; exists?: boolean } {
  const baseDir = getBaseDir(rootDir, gitInfo);

  return {
    filePath: makeRelative(absolutePath, baseDir),
    sourceUrl: gitInfo ? generateSourceUrl(absolutePath, gitInfo) : undefined,
    ...(exists !== undefined && { exists }),
  };
}
