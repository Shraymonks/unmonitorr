import type { Response } from 'express';
import type { PlexPayload } from './types/plex.js';
import type { components } from './types/radarr.js';

import { Api, getIds } from './utils.js';

export const DEFAULT_RADARR_HOST = 'http://127.0.0.1:7878';

const { RADARR_API_KEY, RADARR_HOST = DEFAULT_RADARR_HOST } = process.env;
const api = new Api(`${RADARR_HOST}/api/v3/`, RADARR_API_KEY);

export async function unmonitorMovie(
  { Guid, title, year }: PlexPayload['Metadata'],
  res: Response,
): Promise<Response> {
  if (!RADARR_API_KEY) {
    return res.end();
  }

  const titleYear = `${title} (${year})`;
  const tmdbIds = getIds(Guid, 'tmdb');
  if (tmdbIds.length === 0) {
    console.warn(`No tmdbId for ${titleYear}`);
    return res.end();
  }

  let movies;
  for (const tmdbId of tmdbIds) {
    let moviesResponse;
    try {
      moviesResponse = await fetch(api.getUrl('movie', { tmdbId }));
    } catch (error) {
      console.error(
        `Failed to get movie information from radarr for tmdbId: ${tmdbId} ${titleYear}`,
      );
      console.error(error);
    }
    if (moviesResponse?.ok) {
      movies =
        (await moviesResponse.json()) as components['schemas']['MovieResource'][];
      break;
    }
    console.error(
      `Error getting movie information: ${moviesResponse?.status} ${moviesResponse?.statusText}`,
    );
  }
  if (!movies) {
    console.warn(`Failed to find ${titleYear} in radarr library`);
    return res.end();
  }
  const [movie] = movies;
  if (movie == null) {
    console.warn(`${titleYear} not found in radarr library`);
    return res.end();
  }
  if (movie.monitored) {
    movie.monitored = false;
    let response;
    try {
      response = await fetch(api.getUrl(`movie/${movie.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movie),
      });
    } catch (error) {
      console.error(`Failed to unmonitor ${titleYear}`);
      console.error(error);
      return res.end();
    }

    if (response.ok) {
      console.log(`${titleYear} unmonitored!`);
      return res.end();
    }

    console.error(
      `Error unmonitoring ${titleYear}: ${response.status} ${response.statusText}`,
    );
  }
  return res.end();
}
