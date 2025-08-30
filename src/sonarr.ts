import { sonarrApi } from './fetch.ts';
import type { components } from './types/sonarr.ts';
import { cleanTitle, hasExclusionTag } from './utils.ts';

type Series = components['schemas']['SeriesResource'];
type Season = components['schemas']['SeasonResource'];
type Episode = components['schemas']['EpisodeResource'];

async function checkSonarrConnection() {
  const response = await sonarrApi.GET('/api/v3/system/status');

  if (response.response.status !== 200) {
    throw {
      message: `Failed to connect to Sonarr. Check your Sonarr configuration and verify that it is running.
Status code: ${response.response.status} ${response.response.statusText}`,
      level: 'error',
    };
  }
}

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

async function getEpisodesList(series: Series): Promise<Episode[]> {
  if (series.id === undefined) {
    throw {
      message: `Series ID is undefined for ${series.title}.`,
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
      message: `Failed to get episode list for ${series.title}\n${episodeError}.`,
      level: 'error',
    };
  }

  return episodeList;
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
      message: `Could not find '${title}' in Sonarr library.`,
      level: 'warn',
    };
  }

  return foundSeries;
}

function findSeason(
  series: Series,
  episode: Episode,
  seasonString: string,
): Season {
  if (!series.seasons) {
    throw {
      message: `Seasons are undefined for ${series.title}.`,
      level: 'warn',
    };
  }

  if (!episode.seasonNumber) {
    throw {
      message: `Season number is undefined for ${series.title}.`,
      level: 'warn',
    };
  }

  const foundSeason = series.seasons.find(
    (season) => season.seasonNumber === episode.seasonNumber,
  );

  if (!foundSeason) {
    throw {
      message: `Could not find ${seasonString}`,
      level: 'warn',
    };
  }

  return foundSeason;
}

async function findEpisodeInSeries(
  series: Series,
  episodeTvdbIds: string[],
): Promise<{ series: Series; episode: Episode }> {
  if (episodeTvdbIds.length === 0) {
    throw {
      message: `No episode TvdbId for ${series.title}.`,
      level: 'warn',
    };
  }

  const episodeList = await getEpisodesList(series);

  const foundEpisode = episodeList.find(
    (ep) => ep.tvdbId && episodeTvdbIds.includes(String(ep.tvdbId)),
  );

  if (!foundEpisode) {
    throw {
      message: `Could not find episode (tvdbId: ${episodeTvdbIds.join(', ')}) for ${series.title}.`,
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
      message: `Failed to get tags from Sonarr.\n${tagsError}`,
      level: 'error',
    };
  }

  if (hasExclusionTag(tags, series.tags)) {
    throw {
      message: `${episodeString} has an exclusion tag, skipping.`,
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
      message: `${episodeString} has no id.`,
      level: 'warn',
    };
  }

  if (!episode.monitored) {
    console.warn(`${episodeString} is already unmonitored.`);
    return;
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
      message: `Failed to unmonitor ${episodeString}\n${unmonitorError}.`,
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
  try {
    await checkSonarrConnection();

    const seriesList = await getSeriesList();

    const foundSeries = findSeries(seriesList, seriesTitle, seriesTvdbId);

    const { series, episode } = await findEpisodeInSeries(
      foundSeries,
      episodeTvdbIds,
    );

    const episodeString = `${series.title} - S${episode.seasonNumber}E${episode.episodeNumber}`;

    await checkExclusionTag(series, episodeString);

    await setEpisodeUnmonitored(episode, episodeString);

    await unmonitorSeason(series, episode);
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
          'An unexpected error occurred while unmonitoring. Check Sonarr configuration and verify that it is running.',
        );
        break;
    }
  }
}

async function checkEpisodesWatched(
  series: Series,
  episode: Episode,
  seasonString: string,
): Promise<Season> {
  const foundSeason = findSeason(series, episode, seasonString);

  const episodeList = await getEpisodesList(series);

  const seasonEpisodes = episodeList.filter(
    (ep) => ep.seasonNumber === foundSeason.seasonNumber,
  );

  if (seasonEpisodes.length === 0) {
    throw {
      message: `No episodes found for ${seasonString}.`,
      level: 'warn',
    };
  }

  const unwatchedEpisodes = seasonEpisodes.filter((ep) => ep.monitored);

  if (unwatchedEpisodes.length !== 0) {
    throw {
      message: `${seasonString} has ${unwatchedEpisodes.length} monitored episode(s) remaining, skipping season unmonitor.`,
      level: 'warn',
    };
  }

  return foundSeason;
}

async function setSeasonUnmonitored(
  series: Series,
  foundSeason: Season,
  seasonString: string,
): Promise<void> {
  if (!series.seasons) {
    throw {
      message: `Seasons are not defined for ${series.title}.`,
      level: 'warn',
    };
  }

  if (!foundSeason.monitored) {
    console.warn(`${seasonString} is already unmonitored.`);
    return;
  }

  const updatedSeasons = series.seasons.map((season) => {
    if (season.seasonNumber === foundSeason.seasonNumber) {
      return { ...season, monitored: false };
    }
    return season;
  });

  const { error: unmonitorError } = await sonarrApi.PUT('/api/v3/series/{id}', {
    params: {
      path: {
        id: `${series.id}`,
      },
    },
    body: {
      ...series,
      seasons: updatedSeasons,
    },
  });

  if (unmonitorError) {
    throw {
      message: `Failed to unmonitor ${seasonString}.\n${unmonitorError}`,
      level: 'error',
    };
  }

  console.log(`${seasonString} unmonitored!`);
}

async function unmonitorSeason(
  series: Series,
  episode: Episode,
): Promise<void> {
  const seasonString = `${series.title} - Season ${episode.seasonNumber}`;

  const foundSeason = await checkEpisodesWatched(series, episode, seasonString);

  await setSeasonUnmonitored(series, foundSeason, seasonString);

  await unmonitorSeries(series);
}

async function checkSeasonsWatched(series: Series): Promise<void> {
  if (!series.seasons) {
    throw {
      message: `Seasons are not defined for ${series.title}.`,
      level: 'warn',
    };
  }

  const unwatchedSeasons = series.seasons.filter((season) => season.monitored);

  if (unwatchedSeasons.length !== 0) {
    throw {
      message: `${series.title} has ${unwatchedSeasons.length} monitored season(s) remaining, skipping series unmonitor.`,
      level: 'warn',
    };
  }
}

async function setSeriesUnmonitored(series: Series): Promise<void> {
  if (!series.id) {
    throw {
      message: `Series ID is not defined for ${series.title}.`,
    };
  }

  if (!series.monitored) {
    throw {
      message: `${series.title} is already unmonitored.`,
      level: 'warn',
    };
  }

  const { error: unmonitorError } = await sonarrApi.PUT('/api/v3/series/{id}', {
    params: {
      path: {
        id: `${series.id}`,
      },
    },
    body: {
      ...series,
      monitored: false,
    },
  });

  if (unmonitorError) {
    throw {
      message: `Failed to unmonitor ${series.title}\n${unmonitorError}.`,
      level: 'error',
    };
  }

  console.log(`${series.title} unmonitored!`);
}

async function unmonitorSeries(series: Series): Promise<void> {
  if (!series.ended) {
    throw {
      message: `${series.title} has not ended, skipping series unmonitor.`,
      level: 'warn',
    };
  }

  await checkSeasonsWatched(series);

  await setSeriesUnmonitored(series);
}
