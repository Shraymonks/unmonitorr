import { sonarrApi } from './fetch.ts';
import type { components } from './types/sonarr.ts';
import { cleanTitle, hasExclusionTag } from './utils.ts';

type Series = components['schemas']['SeriesResource'];
type Episode = components['schemas']['EpisodeResource'];

async function getSeriesList(): Promise<Series[]> {
  const { data: seriesList, error: seriesError } =
    await sonarrApi.GET('/api/v3/series');
  if (seriesError || !seriesList) {
    throw {
      message: `Failed to get series lists from Sonarr.\n${seriesError}`,
      level: 'error',
    };
  }

  return seriesList;
}

function findSeries(
  seriesList: Series[],
  title: string,
  seriesTvdbId?: string,
): Series {
  if (seriesTvdbId) {
    const seriesById = seriesList.find(
      (s) => String(s.tvdbId) === seriesTvdbId,
    );
    if (seriesById) return seriesById;
  }

  // Match potential series on title. Year metadata from Plex is for the episode
  // so cannot be used for series filtering.
  const cleanedTitle = cleanTitle(title);
  const foundSeries = seriesList.find(
    (s) => cleanTitle(s.title ?? '') === cleanedTitle,
  );
  if (!foundSeries) {
    throw {
      message: `Could not find '${title}' in Sonarr library`,
      level: 'warn',
    };
  }

  return foundSeries;
}

async function findEpisodeInSeries(
  series: Series,
  episodeTvdbIds: string[],
): Promise<{ series: Series; episode: Episode }> {
  if (episodeTvdbIds.length === 0) {
    throw {
      message: `No episode TvdbId for ${series.title}`,
      level: 'warn',
    };
  }

  if (series.id === undefined) {
    throw {
      message: `Series ID is undefined for ${series.title}`,
      level: 'warn',
    };
  }

  const { data: episodeList, error: episodeError } = await sonarrApi.GET(
    '/api/v3/episode',
    {
      params: { query: { seriesId: series.id } },
    },
  );

  if (episodeError || !episodeList) {
    throw {
      message: `Failed to get episode list for ${series.title}\n${episodeError}`,
      level: 'error',
    };
  }

  const foundEpisode = episodeList.find(
    (ep) => ep.tvdbId && episodeTvdbIds.includes(String(ep.tvdbId)),
  );

  if (!foundEpisode) {
    throw {
      message: `Could not find episode (tvdbId: ${episodeTvdbIds.join(', ')}) for ${series.title}`,
      level: 'warn',
    };
  }

  return { series, episode: foundEpisode };
}

async function checkExclusionTag(
  series: Series,
  episodeString: string,
): Promise<void> {
  const { data: tags, error: tagsError } = await sonarrApi.GET('/api/v3/tag');
  if (tagsError || !tags) {
    throw {
      message: `Failed to get tags from Sonarr\n${tagsError}`,
      level: 'error',
    };
  }

  if (hasExclusionTag(tags, series.tags)) {
    throw {
      message: `${episodeString} has an exclusion tag, skipping`,
      level: 'warn',
    };
  }
}

async function setEpisodeUnmonitored(
  episode: Episode,
  episodeString: string,
): Promise<void> {
  if (episode.id == null) {
    throw {
      message: `${episodeString} has no id`,
      level: 'warn',
    };
  }

  if (!episode.monitored) {
    throw {
      message: `${episodeString} is already unmonitored.`,
      level: 'warn',
    };
  }

  const { error: unmonitorError } = await sonarrApi.PUT(
    '/api/v3/episode/monitor',
    {
      body: {
        episodeIds: [episode.id],
        monitored: false,
      },
    },
  );

  if (unmonitorError) {
    throw {
      message: `Failed to unmonitor ${episodeString}\n${unmonitorError}`,
      level: 'error',
    };
  }

  console.log(`${episodeString} unmonitored!`);
}

// Sonarr has no api for getting an episode by episode tvdbId
// Go through the following steps to get the matching episode:
// 1. Get series list
// 2. Match potential series on id
// 3. If series id match failed, match potential series on title
// 4. Get episode lists
// 5. Match episode on tvdbId
export async function unmonitorEpisode({
  episodeTvdbIds,
  seriesTitle,
  seriesTvdbId,
}: {
  episodeTvdbIds: string[];
  seriesTitle: string;
  seriesTvdbId?: string | undefined;
}): Promise<void> {
  if (!sonarrApi) {
    return;
  }

  try {
    const seriesList = await getSeriesList();

    const foundSeries = findSeries(seriesList, seriesTitle, seriesTvdbId);

    const { series, episode } = await findEpisodeInSeries(
      foundSeries,
      episodeTvdbIds,
    );

    const episodeString = `${series.title} - S${episode.seasonNumber}E${episode.episodeNumber}`;

    await checkExclusionTag(series, episodeString);

    await setEpisodeUnmonitored(episode, episodeString);
  } catch (e) {
    const error = e as { message: string; level: string };

    switch (error.level) {
      case 'warn':
        console.warn(error.message);
        break;
      case 'error':
        console.error(error.message);
        break;
      default:
        console.error(
          'An unexpected error occurred while unmonitoring episode.',
        );
        break;
    }
  }
}
