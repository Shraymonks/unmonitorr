import type { Response } from 'express';
import type { components } from './types/radarr.js';

import { Api, hasExclusionTag } from './utils.js';

export const DEFAULT_RADARR_HOST = 'http://127.0.0.1:7878';

const { RADARR_API_KEY, RADARR_HOST = DEFAULT_RADARR_HOST } = process.env;
const api = new Api(`${RADARR_HOST}/api/v3/`, RADARR_API_KEY);

type Movie = components['schemas']['MovieResource'];

export async function unmonitorMovie(
  {
    movieTmdbIds,
    title,
    year,
  }: { movieTmdbIds: string[]; title: string; year: number },
  res: Response,
): Promise<Response> {
  if (!RADARR_API_KEY) {
    return res.end();
  }

  const titleYear = `${title} (${year.toString()})`;

  if (movieTmdbIds.length === 0) {
    console.warn(`No tmdbId for ${titleYear}`);
    return res.end();
  }

  let movies: Movie[] | undefined;

  for (const tmdbId of movieTmdbIds) {
    let moviesResponse: globalThis.Response;
    try {
      moviesResponse = await fetch(api.getUrl('movie', { tmdbId }));
    } catch (error) {
      console.error(
        `Failed to get movie information from radarr for tmdbId: ${tmdbId} ${titleYear}`,
      );
      console.error(error);
      continue;
    }
    if (moviesResponse.ok) {
      movies = (await moviesResponse.json()) as Movie[];
      break;
    }
    console.error(
      `Error getting movie information: ${moviesResponse.status.toString()} ${moviesResponse.statusText}`,
    );
  }
  if (!movies) {
    console.warn(`Failed to find ${titleYear} in radarr library`);
    return res.end();
  }
  const [movie] = movies;
  if (movie?.id == null) {
    console.warn(`${titleYear} not found in radarr library`);
    return res.end();
  }

  if (!movie.monitored) {
    console.warn(`${titleYear} is already unmonitored`);
    return res.end();
  }

  if (await hasExclusionTag(api.getUrl('tag'), movie.tags)) {
    console.warn(`${titleYear} has exclusion tag`);
    return res.end();
  }

  movie.monitored = false;
  let response: globalThis.Response;
  try {
    response = await fetch(api.getUrl(`movie/${movie.id.toString()}`), {
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
    `Error unmonitoring ${titleYear}: ${response.status.toString()} ${response.statusText}`,
  );

  return res.end();
}
