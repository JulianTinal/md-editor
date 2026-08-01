/**
 * Site-wide constants and build-time data.
 *
 * REPO: set this to the "owner/name" of the public GitHub repository once it
 * exists. While it is empty, the star counter is hidden rather than faked, and
 * GitHub links fall back to the profile.
 */
export const REPO = 'JulianTinal/md-editor';

export const repoUrl = REPO ? `https://github.com/${REPO}` : 'https://github.com/JulianTinal';

/**
 * Reads the real star count at build time. Returns null when no repository is
 * configured, when the request fails, or when GitHub rate-limits the build, so
 * the UI can simply omit the number instead of showing a stale or invented one.
 */
export async function getStarCount(): Promise<number | null> {
  if (!REPO) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    return typeof data?.stargazers_count === 'number' ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

/** Compact display form: 1200 -> "1.2k" */
export function formatStars(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}
