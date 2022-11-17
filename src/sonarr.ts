import type { Response } from 'express';
import type { PlexPayload } from './types/plex';
import type { components } from './types/sonarr';

import { getId } from './utils.js';

export const DEFAULT_SONARR_HOST = 'http://127.0.0.1:8989';

const { SONARR_API_KEY, SONARR_HOST = DEFAULT_SONARR_HOST } = process.env;

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

  let titleYear = `${plexSeriesTitle} (${plexYear})`;
  // tvdbId is of the episode not the series.
  const episodeTvdbId = getId(Guid, 'tvdb');
  if (!episodeTvdbId) {
    console.log(`No tvdbId for ${titleYear}`);
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
    const seriesResponse = await fetch(
      `${SONARR_HOST}/api/v3/series?apikey=${SONARR_API_KEY}`
    );
    seriesList =
      (await seriesResponse.json()) as components['schemas']['SeriesResource'][];
  } catch (error) {
    console.log('Failed to get series list from sonarr:');
    console.log(error);
    return res.end();
  }

  const series = seriesList.find(
    ({ title, year }) =>
      title === plexSeriesTitle && (!plexYear || plexYear === year)
  );
  if (!series) {
    console.log(`Could not find ${titleYear} in sonarr library`);
    return res.end();
  }

  // Use sonarr data for log; Plex sometimes doesn't include the year.
  titleYear = `${series.title} (${series.year})`;

  try {
    const episodeListResponse = await fetch(
      `${SONARR_HOST}/api/v3/episode?seriesId=${series.id}&apikey=${SONARR_API_KEY}`
    );
    episodeList =
      (await episodeListResponse.json()) as components['schemas']['EpisodeResource'][];
  } catch (error) {
    console.log(`Failed to get episode list for ${titleYear}:`);
    console.log(error);
    return res.end();
  }

  const episode = episodeList.find(
    ({ tvdbId }) => tvdbId === Number(episodeTvdbId)
  );
  if (!episode) {
    console.log(
      `Could not find episode tvdbId: ${episodeTvdbId} for ${titleYear}`
    );
    return res.end();
  }

  const episodeString = `${titleYear} - S${episode.seasonNumber}E${episode.episodeNumber}`;

  if (episode.monitored) {
    try {
      fetch(`${SONARR_HOST}/api/v3/episode/monitor?apikey=${SONARR_API_KEY}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeIds: [episode.id],
          monitored: false,
        }),
      });
    } catch (error) {
      console.log(`Failed to unmonitor ${episodeString}:`);
      console.log(error);
      return res.end();
    }

    console.log(`${episodeString} unmonitored!`);
    return res.end();
  }
  return res.end();
}
