import type { Response } from 'express';
import type { PlexPayload } from './types/plex';
import type { components } from './types/sonarr';

import { Api, getIds } from './utils.js';

export const DEFAULT_SONARR_HOST = 'http://127.0.0.1:8989';

const { SONARR_API_KEY, SONARR_HOST = DEFAULT_SONARR_HOST } = process.env;
const api = new Api(`${SONARR_HOST}/api/v3/`, SONARR_API_KEY);

export async function unmonitorEpisode(
  {
    Guid,
    grandparentTitle: plexSeriesTitle,
    year: plexYear,
  }: PlexPayload['Metadata'],
  res: Response
): Promise<Response> {
  if (!SONARR_API_KEY) {
    return res.end();
  }

  let titleYear = plexSeriesTitle + (plexYear ? ` (${plexYear})` : '');
  // tvdbId is of the episode not the series.
  const episodeTvdbIds = getIds(Guid, 'tvdb');
  if (episodeTvdbIds.length === 0) {
    console.warn(`No tvdbId for ${titleYear}`);
    return res.end();
  }

  let seriesList;
  let episodeList;

  // Sonarr has no api for getting an episode by episode tvdbId
  // Go through the following steps to get the matching episode:
  // 1. Get series list
  // 2. Match series on title and year if available
  // 3. Get episode list
  // 4. Match episode on tvdbId
  try {
    const seriesResponse = await fetch(api.getUrl('series'));
    seriesList =
      (await seriesResponse.json()) as components['schemas']['SeriesResource'][];
  } catch (error) {
    console.error('Failed to get series list from sonarr:');
    console.error(error);
    return res.end();
  }

  const series = seriesList.find(({ title, year }) => {
    // tvdb appends the year to some titles; remove it for matching
    const cleanTitle = title?.match(/^(.+?)(?: \(\d+\))?$/)?.[1];
    return cleanTitle === plexSeriesTitle && (!plexYear || plexYear === year);
  });
  if (!series || !series.id) {
    console.warn(`Could not find ${titleYear} in sonarr library`);
    return res.end();
  }

  // Use sonarr data for log; Plex sometimes doesn't include the year.
  titleYear = `${series.title} (${series.year})`;

  try {
    const episodeListResponse = await fetch(
      api.getUrl('episode', {
        seriesId: series.id.toString(),
      })
    );
    episodeList =
      (await episodeListResponse.json()) as components['schemas']['EpisodeResource'][];
  } catch (error) {
    console.error(`Failed to get episode list for ${titleYear}:`);
    console.error(error);
    return res.end();
  }

  const episode = episodeList.find(
    ({ tvdbId }) => tvdbId && episodeTvdbIds.includes(tvdbId.toString())
  );
  if (!episode) {
    console.warn(
      `Could not find episode tvdbIds: ${episodeTvdbIds} for ${titleYear}`
    );
    return res.end();
  }

  const episodeString = `${titleYear} - S${episode.seasonNumber}E${episode.episodeNumber}`;

  if (episode.monitored) {
    try {
      fetch(api.getUrl('episode/monitor'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeIds: [episode.id],
          monitored: false,
        }),
      });
    } catch (error) {
      console.error(`Failed to unmonitor ${episodeString}:`);
      console.error(error);
      return res.end();
    }

    console.log(`${episodeString} unmonitored!`);
    return res.end();
  }
  return res.end();
}
