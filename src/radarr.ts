import { radarrApi } from './fetch.js';
import { hasExclusionTag } from './utils.js';

export async function unmonitorMovie({
  movieTmdbIds,
  title,
  year,
}: {
  movieTmdbIds: string[];
  title: string;
  year: number;
}): Promise<void> {
  if (!radarrApi) {
    return;
  }

  const titleYear = `${title} (${year.toString()})`;

  if (movieTmdbIds.length === 0) {
    console.warn(`No tmdbId for ${titleYear}`);
    return;
  }

  let movies = null;

  for (const tmdbId of movieTmdbIds) {
    const { data, error } = await radarrApi.GET('/api/v3/movie', {
      params: {
        query: {
          tmdbId: Number(tmdbId),
        },
      },
    });

    if (error) {
      console.error(
        `Failed to get movie information from radarr for tmdbId: ${tmdbId} ${titleYear}`,
      );
      console.error(error);
      continue;
    }

    if (data) {
      movies = data;
      break;
    }
  }

  if (!movies) {
    console.warn(`Failed to find ${titleYear} in radarr library`);
    return;
  }

  const [movie] = movies;
  if (movie?.id == null) {
    console.warn(`${titleYear} not found in radarr library`);
    return;
  }

  if (!movie.monitored) {
    console.warn(`${titleYear} is already unmonitored`);
    return;
  }

  const { data: tags, error: tagsError } = await radarrApi.GET('/api/v3/tag');

  if (tagsError) {
    console.error(`Failed to get tags information from radarr`);
    console.error(tagsError);
    return;
  }

  if (hasExclusionTag(tags, movie.tags)) {
    console.warn(`${titleYear} has exclusion tag`);
    return;
  }

  const { error } = await radarrApi.PUT('/api/v3/movie/{id}', {
    params: {
      path: {
        id: movie.id.toString(),
      },
    },
    body: { ...movie, monitored: false },
  });

  if (error) {
    console.error(`Failed to unmonitor ${titleYear}`);
    console.error(error);
    return;
  }

  console.log(`${titleYear} unmonitored!`);
}
