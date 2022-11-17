import type { Response } from 'express';
import type { PlexPayload } from './types/plex';
import type { components } from './types/radarr';

import { getId } from './utils.js';

export const DEFAULT_RADARR_HOST = 'http://127.0.0.1:7878';

const { RADARR_API_KEY, RADARR_HOST = DEFAULT_RADARR_HOST } = process.env;

export async function unmonitorMovie(
  { Guid, title, year }: PlexPayload['Metadata'],
  res: Response
): Promise<Response> {
  if (!RADARR_API_KEY) {
    return res.end();
  }

  const titleYear = `${title} (${year})`;
  const tmdbId = getId(Guid, 'tmdb');
  if (!tmdbId) {
    console.log(`No tmdbId for ${titleYear}`);
    return res.end();
  }

  let movies;
  try {
    const moviesResponse = await fetch(
      `${RADARR_HOST}/api/v3/movie?tmdbId=${tmdbId}&apikey=${RADARR_API_KEY}`
    );
    movies =
      (await moviesResponse.json()) as components['schemas']['MovieResource'][];
  } catch (error) {
    console.log(`Failed to get movie information from radarr for ${titleYear}`);
    console.log(error);
    return res.end();
  }

  const [movie] = movies;
  if (movie == null) {
    console.log(`${titleYear} not found in radarr library`);
    return res.end();
  }
  if (movie.monitored) {
    movie.monitored = false;
    try {
      fetch(
        `${RADARR_HOST}/api/v3/movie/${movie.id}?apikey=${RADARR_API_KEY}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movie),
        }
      );
    } catch (error) {
      console.log(`Failed to unmonitor ${titleYear}`);
      console.log(error);
      return res.end();
    }

    console.log(`${titleYear} unmonitored!`);
    return res.end();
  }
  return res.end();
}
