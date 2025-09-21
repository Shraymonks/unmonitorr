import { sonarrApi } from './fetch.ts';
import type { components } from './types/sonarr.ts';
import { cleanTitle, hasExclusionTag } from './utils.ts';

// === TYPES ===
type Series = components['schemas']['SeriesResource'];
type Season = components['schemas']['SeasonResource'];
type Episode = components['schemas']['EpisodeResource'];

const UNMONITOR_STATUS = {
  UNMONITORED: 'unmonitored',
  ALREADY: 'already',
  SKIPPED: 'skipped',
} as const;

const UNMONITOR_REASON = {
  NOT_ENDED: 'not-ended',
  SEASONS_REMAINING: 'seasons-remaining',
  EPISODES_REMAINING: 'episodes-remaining',
} as const;

type UnmonitorReason =
  | typeof UNMONITOR_REASON.NOT_ENDED
  | typeof UNMONITOR_REASON.SEASONS_REMAINING
  | typeof UNMONITOR_REASON.EPISODES_REMAINING
  | undefined;

type UnmonitorStatus = (typeof UNMONITOR_STATUS)[keyof typeof UNMONITOR_STATUS];

type UnmonitorResult = {
  series: UnmonitorStatus;
  season: UnmonitorStatus;
  episode: UnmonitorStatus;
  seriesReason?: UnmonitorReason;
  seasonReason?: UnmonitorReason;
  episodeReason?: UnmonitorReason;
};

// === ERROR HANDLING ===
class SonarrError extends Error {
  level: 'error' | 'warn';

  constructor(message: string, level: 'error' | 'warn' = 'error') {
    super(message);
    this.level = level;
    this.name = 'SonarrError';
  }
}

// === VALIDATION HELPERS ===
function assertSeriesId(series: Series, context: string): number {
  if (series.id === undefined || series.id === null) {
    throw new SonarrError(
      `Series ID is undefined for ${series.title ?? 'Unknown Series'} in ${context}.`,
      'warn',
    );
  }
  return series.id;
}

function getSeasonNumber(season: Season, seriesTitle: string): number {
  const seasonNumber = season.seasonNumber;
  if (seasonNumber === undefined || seasonNumber === null) {
    throw new SonarrError(
      `Season number is undefined for ${seriesTitle}.`,
      'warn',
    );
  }
  return seasonNumber;
}

// === API CONNECTION ===
async function checkSonarrConnection(): Promise<void> {
  const response = await sonarrApi.GET('/api/v3/health');
  if (!response.response.ok) {
    throw new SonarrError(
      `Failed to connect to Sonarr. Check your Sonarr configuration and verify that it is running.
Status code: ${response.response.status} ${response.response.statusText}`,
      'error',
    );
  }
}

// === SERIES API FUNCTIONS ===
async function getSeriesList(): Promise<Series[]> {
  const { data: seriesList, error: seriesError } =
    await sonarrApi.GET('/api/v3/series');

  if (seriesError || !seriesList) {
    throw new SonarrError(
      `Failed to get series lists from Sonarr.\n${seriesError}`,
      'error',
    );
  }

  return seriesList;
}

async function getSeriesById(seriesId: number): Promise<Series> {
  const { data: series, error: seriesError } = await sonarrApi.GET(
    '/api/v3/series/{id}',
    {
      params: {
        path: {
          id: seriesId,
        },
      },
    },
  );

  if (seriesError || !series) {
    throw new SonarrError(
      `Failed to retrieve series by ID ${seriesId} from Sonarr.\n${seriesError}`,
      'error',
    );
  }

  return series;
}

async function findSeriesByTvdbId(
  seriesTvdbId?: string,
): Promise<Series | undefined> {
  if (!seriesTvdbId) {
    return undefined;
  }

  const tvdbId = Number(seriesTvdbId);

  if (Number.isNaN(tvdbId)) {
    return undefined;
  }

  const { data: series, error: seriesError } = await sonarrApi.GET(
    '/api/v3/series',
    {
      params: {
        query: {
          tvdbId: tvdbId,
        },
      },
    },
  );

  if (seriesError || !series) {
    return undefined;
  }

  return series[0];
}

async function findSeriesByTitle(title: string): Promise<Series | undefined> {
  const seriesList = await getSeriesList();

  // Match potential series on title. Year metadata from Plex is for the episode
  // so cannot be used for series filtering.
  const cleanedTitle = cleanTitle(title);
  for (const series of seriesList) {
    if (cleanTitle(series.title ?? '') === cleanedTitle) {
      return series;
    }
  }
  return undefined;
}

// === EPISODE API FUNCTIONS ===
async function getEpisodeList(series: Series): Promise<Episode[]> {
  const seriesId = assertSeriesId(series, 'get episode list');

  const { data: episodeList, error: episodeError } = await sonarrApi.GET(
    '/api/v3/episode',
    {
      params: {
        query: {
          seriesId: seriesId,
        },
      },
    },
  );

  if (episodeError || !episodeList) {
    const seriesTitle = series.title ?? 'Unknown Series';
    throw new SonarrError(
      `Failed to get episode list for ${seriesTitle}\n${episodeError}.`,
      'error',
    );
  }

  return episodeList;
}

async function findEpisodeInSeries(
  series: Series,
  episodeTvdbIds: string[],
): Promise<Episode> {
  const seriesTitle = series.title ?? 'Unknown Series';

  if (episodeTvdbIds.length === 0) {
    throw new SonarrError(`No episode TvdbIds for ${seriesTitle}.`, 'warn');
  }

  const episodeList = await getEpisodeList(series);

  for (const ep of episodeList) {
    if (ep.tvdbId && episodeTvdbIds.includes(String(ep.tvdbId))) {
      return ep;
    }
  }

  throw new SonarrError(
    `Could not find episode (tvdbId: ${episodeTvdbIds.join(', ')}) for ${seriesTitle}.`,
    'warn',
  );
}

// === SEASON HELPER FUNCTIONS ===
function findSeason(series: Series, episode: Episode): Season {
  if (!series.seasons) {
    throw new SonarrError(
      `Seasons are undefined for ${series.title ?? 'Unknown Series'}.`,
      'warn',
    );
  }

  if (!episode.seasonNumber) {
    throw new SonarrError(
      `Season number is undefined for ${series.title ?? 'Unknown Series'}.`,
      'warn',
    );
  }

  const season = series.seasons.find(
    (season) => season.seasonNumber === episode.seasonNumber,
  );

  if (!season) {
    const seriesTitle = series.title ?? 'Unknown Series';
    const seasonString = `${seriesTitle} - Season ${episode.seasonNumber}`;
    throw new SonarrError(`Could not find ${seasonString}`, 'warn');
  }

  return season;
}

// === VALIDATION FUNCTIONS ===
async function checkExclusionTag(series: Series): Promise<void> {
  const { data: tags, error: tagsError } = await sonarrApi.GET('/api/v3/tag');
  if (tagsError || !tags) {
    throw new SonarrError(
      `Failed to get tags from Sonarr.\n${tagsError}`,
      'error',
    );
  }

  if (hasExclusionTag(tags, series.tags)) {
    const seriesTitle = series.title ?? 'Unknown Series';
    throw new SonarrError(
      `${seriesTitle} has an exclusion tag, skipping.`,
      'warn',
    );
  }
}

function checkAllSeasonsUnmonitored(series: Series): boolean {
  return !(series.seasons?.some((season) => season.monitored) ?? false);
}

async function checkAllEpisodesUnmonitored(
  series: Series,
  seasonNumber: number,
): Promise<boolean> {
  const seriesId = assertSeriesId(series, 'check episodes unmonitored');

  const { data: episodes, error: episodesError } = await sonarrApi.GET(
    '/api/v3/episode',
    {
      params: {
        query: {
          seriesId: seriesId,
          seasonNumber: seasonNumber,
        },
      },
    },
  );

  if (episodesError || !episodes) {
    throw new SonarrError(
      `Failed to get episodes from Sonarr.\n${episodesError}`,
      'error',
    );
  }

  return !episodes.some((ep) => ep.monitored);
}

// === UNMONITOR FUNCTIONS ===
async function setSeriesUnmonitored(series: Series): Promise<UnmonitorStatus> {
  const seriesId = assertSeriesId(series, 'set series unmonitored');

  if (!series.monitored) {
    return UNMONITOR_STATUS.ALREADY;
  }

  const { error: unmonitorError } = await sonarrApi.PUT('/api/v3/series/{id}', {
    params: {
      path: {
        id: seriesId.toString(),
      },
    },
    body: {
      ...series,
      monitored: false,
    },
  });

  const seriesTitle = series.title ?? 'Unknown Series';
  if (unmonitorError) {
    throw new SonarrError(
      `Failed to unmonitor ${seriesTitle}\n${unmonitorError}.`,
      'error',
    );
  }

  return UNMONITOR_STATUS.UNMONITORED;
}

async function unmonitorSeries(
  series: Series,
): Promise<{ status: UnmonitorStatus; reason?: UnmonitorReason }> {
  if (!series.ended) {
    return {
      status: UNMONITOR_STATUS.SKIPPED,
      reason: UNMONITOR_REASON.NOT_ENDED,
    };
  }

  const seriesId = assertSeriesId(series, 'unmonitor series');
  series = await getSeriesById(seriesId);

  if (!checkAllSeasonsUnmonitored(series)) {
    return {
      status: UNMONITOR_STATUS.SKIPPED,
      reason: UNMONITOR_REASON.SEASONS_REMAINING,
    };
  }

  const status = await setSeriesUnmonitored(series);
  return { status };
}

async function setSeasonUnmonitored(
  series: Series,
  season: Season,
): Promise<UnmonitorStatus> {
  const seriesId = assertSeriesId(series, 'set season unmonitored');

  if (!series.seasons) {
    const seriesTitle = series.title ?? 'Unknown Series';
    throw new SonarrError(
      `Seasons are not defined for ${seriesTitle}.`,
      'warn',
    );
  }

  if (!season.monitored) {
    return UNMONITOR_STATUS.ALREADY;
  }

  const updatedSeasons = series.seasons.map((updatedSeason) => {
    if (updatedSeason.seasonNumber === season.seasonNumber) {
      return { ...updatedSeason, monitored: false };
    }
    return updatedSeason;
  });

  const { error: unmonitorError } = await sonarrApi.PUT('/api/v3/series/{id}', {
    params: {
      path: {
        id: seriesId.toString(),
      },
    },
    body: {
      ...series,
      seasons: updatedSeasons,
    },
  });

  const seriesTitle = series.title ?? 'Unknown Series';
  const seasonString = `${seriesTitle} - Season ${season.seasonNumber}`;
  if (unmonitorError) {
    throw new SonarrError(
      `Failed to unmonitor ${seasonString}.\n${unmonitorError}`,
      'error',
    );
  }

  return UNMONITOR_STATUS.UNMONITORED;
}

async function unmonitorSeason(
  series: Series,
  episode: Episode,
): Promise<{ status: UnmonitorStatus; reason?: UnmonitorReason }> {
  const season = findSeason(series, episode);
  const seriesTitle = series.title ?? 'Unknown Series';
  const seasonNumber = getSeasonNumber(season, seriesTitle);

  if (!(await checkAllEpisodesUnmonitored(series, seasonNumber))) {
    return {
      status: UNMONITOR_STATUS.SKIPPED,
      reason: UNMONITOR_REASON.EPISODES_REMAINING,
    };
  }

  const status = await setSeasonUnmonitored(series, season);
  return { status };
}

async function setEpisodeUnmonitored(
  series: Series,
  episode: Episode,
): Promise<UnmonitorStatus> {
  if (episode.id == null) {
    const seriesTitle = series.title ?? 'Unknown Series';
    const episodeString = `${seriesTitle} - S${episode.seasonNumber}E${episode.episodeNumber}`;
    throw new SonarrError(`${episodeString} has no id.`, 'warn');
  }

  if (!episode.monitored) {
    return UNMONITOR_STATUS.ALREADY;
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

  const seriesTitle = series.title ?? 'Unknown Series';
  const episodeString = `${seriesTitle} - S${episode.seasonNumber}E${episode.episodeNumber}`;
  if (unmonitorError) {
    throw new SonarrError(
      `Failed to unmonitor ${episodeString} \n${unmonitorError}.`,
      'error',
    );
  }

  return UNMONITOR_STATUS.UNMONITORED;
}

export async function unmonitorEpisode(
  series: Series,
  episode: Episode,
): Promise<UnmonitorStatus> {
  return await setEpisodeUnmonitored(series, episode);
}

// === MESSAGE FORMATTING ===
function formatUnmonitorMessage(
  series: Series | undefined,
  episode: Episode | undefined,
  result: UnmonitorResult,
): string {
  const title = series?.title ?? 'Series';
  const seasonNum = episode?.seasonNumber;
  const episodeNum = episode?.episodeNumber;

  // 1. Nothing touched
  if (
    result.series === UNMONITOR_STATUS.SKIPPED &&
    result.season === UNMONITOR_STATUS.SKIPPED &&
    result.episode === UNMONITOR_STATUS.SKIPPED
  ) {
    return 'Nothing was unmonitored.';
  }

  // 2. SERIES result dominates if unmonitored or already
  if (result.series === UNMONITOR_STATUS.UNMONITORED) {
    return `${title} SERIES unmonitored.`;
  }
  if (result.series === UNMONITOR_STATUS.ALREADY) {
    return `${title} SERIES is already unmonitored.`;
  }

  // 3. SERIES skipped -> mention season or episode + reason
  if (result.series === UNMONITOR_STATUS.SKIPPED) {
    // If a season was skipped because episodes remain, show episode status too
    if (
      result.season === UNMONITOR_STATUS.SKIPPED &&
      result.seasonReason === UNMONITOR_REASON.EPISODES_REMAINING
    ) {
      if (result.episode === UNMONITOR_STATUS.UNMONITORED) {
        return `${title} - S${seasonNum}E${episodeNum} unmonitored. ${title} - Season ${seasonNum} skipped: monitored episodes remain.`;
      }
      if (result.episode === UNMONITOR_STATUS.ALREADY) {
        return `${title} - S${seasonNum}E${episodeNum} is already unmonitored. ${title} - Season ${seasonNum} skipped: monitored episodes remain.`;
      }
      return `${title} - Season ${seasonNum} skipped: monitored episodes remain.`;
    }

    // Otherwise, fall back to reasons for series-level skip
    let reasonMsg = 'Series unmonitor skipped.';
    if (result.seriesReason === UNMONITOR_REASON.NOT_ENDED) {
      reasonMsg = 'Series unmonitor skipped: not ended.';
    } else if (result.seriesReason === UNMONITOR_REASON.SEASONS_REMAINING) {
      reasonMsg = 'Series unmonitor skipped: monitored seasons remain.';
    }

    // Important: if a season was actually unmonitored/already, report that too
    if (result.season === UNMONITOR_STATUS.UNMONITORED) {
      return `${title} - Season ${seasonNum} unmonitored. ${reasonMsg}`;
    }
    if (result.season === UNMONITOR_STATUS.ALREADY) {
      return `${title} - Season ${seasonNum} is already unmonitored. ${reasonMsg}`;
    }

    // Or if only episode had any result
    if (result.episode === UNMONITOR_STATUS.UNMONITORED) {
      return `${title} - S${seasonNum}E${episodeNum} unmonitored. ${reasonMsg}`;
    }
    if (result.episode === UNMONITOR_STATUS.ALREADY) {
      return `${title} - S${seasonNum}E${episodeNum} is already unmonitored. ${reasonMsg}`;
    }

    return reasonMsg;
  }

  // 4. SEASON result (when series not unmonitored/already)
  if (result.season === UNMONITOR_STATUS.UNMONITORED) {
    return `${title} - Season ${seasonNum} unmonitored.`;
  }
  if (result.season === UNMONITOR_STATUS.ALREADY) {
    return `${title} - Season ${seasonNum} is already unmonitored.`;
  }
  if (result.season === UNMONITOR_STATUS.SKIPPED) {
    let reasonMsg = `${title} - Season ${seasonNum} skipped.`;
    if (result.seasonReason === UNMONITOR_REASON.EPISODES_REMAINING) {
      reasonMsg = `${title} - Season ${seasonNum} skipped: monitored episodes remain.`;
    }

    if (result.episode === UNMONITOR_STATUS.UNMONITORED) {
      return `${title} - S${seasonNum}E${episodeNum} unmonitored. ${reasonMsg}`;
    }
    if (result.episode === UNMONITOR_STATUS.ALREADY) {
      return `${title} - S${seasonNum}E${episodeNum} is already unmonitored. ${reasonMsg}`;
    }

    return reasonMsg;
  }

  // 5. EPISODE-level results (last fallback)
  if (result.episode === UNMONITOR_STATUS.UNMONITORED) {
    return `${title} - S${seasonNum}E${episodeNum} unmonitored.`;
  }
  if (result.episode === UNMONITOR_STATUS.ALREADY) {
    return `${title} - S${seasonNum}E${episodeNum} is already unmonitored.`;
  }
  if (result.episode === UNMONITOR_STATUS.SKIPPED) {
    return `${title} - S${seasonNum}E${episodeNum} skipped.`;
  }

  // 6. Fallback
  return 'No unmonitoring action performed.';
}

// === MAIN EXPORTED FUNCTION ===
// Sonarr has no api for getting an episode by episode tvdbId
// Go through the following steps to get the matching episode:
// 1. Match potential series on id
// 2. If series id match failed, get series list and match series on title
// 3. Get episode lists
// 4. Match episode on tvdbId
// 5. If all episodes in a season are unmonitored, unmonitor the season
// 6. If all seasons in an ended series are unmonitored, unmonitor the series
export async function unmonitorShow({
  episodeTvdbIds,
  seriesTitle,
  seriesTvdbId,
}: {
  episodeTvdbIds: string[];
  seriesTitle: string;
  seriesTvdbId?: string | undefined;
}): Promise<void> {
  const result: UnmonitorResult = {
    series: UNMONITOR_STATUS.SKIPPED,
    season: UNMONITOR_STATUS.SKIPPED,
    episode: UNMONITOR_STATUS.SKIPPED,
  };

  let series: Series | undefined;
  let episode: Episode | undefined;

  try {
    await checkSonarrConnection();

    series =
      (await findSeriesByTvdbId(seriesTvdbId)) ??
      (await findSeriesByTitle(seriesTitle));
    if (!series) {
      console.warn(`Could not find '${seriesTitle}' in Sonarr library.`);
      return;
    }

    await checkExclusionTag(series);

    episode = await findEpisodeInSeries(series, episodeTvdbIds);

    result.episode = await unmonitorEpisode(series, episode);

    const seasonOutcome = await unmonitorSeason(series, episode);
    result.season = seasonOutcome.status;
    result.seasonReason = seasonOutcome.reason;

    const seriesOutcome = await unmonitorSeries(series);
    result.series = seriesOutcome.status;
    result.seriesReason = seriesOutcome.reason;
  } catch (e) {
    if (e instanceof SonarrError) {
      switch (e.level) {
        case 'warn':
          console.warn(e.message);
          break;
        case 'error':
          console.error(e.message);
          break;
      }
    } else {
      console.error(
        'An unexpected error occurred while unmonitoring. Check Sonarr configuration and verify that it is running.',
        e,
      );
    }
  }

  const message = formatUnmonitorMessage(series, episode, result);
  console.log(message);
}
