import type { Response } from 'express';
import type { PlexPayload } from './types/plex';
import type { components } from './types/sonarr';

import { Api, getIds } from './utils.js';

export const DEFAULT_SONARR_HOST = 'http://127.0.0.1:8989';

const { SONARR_API_KEY, SONARR_HOST = DEFAULT_SONARR_HOST } = process.env;
const api = new Api(`${SONARR_HOST}/api/v3/`, SONARR_API_KEY);

export async function unmonitorEpisode(
  { Guid, grandparentTitle: seriesTitle }: PlexPayload['Metadata'],
  res: Response
): Promise<Response> {
  if (!SONARR_API_KEY) {
    return res.end();
  }

  // tvdbId is of the episode not the series.
  const episodeTvdbIds = getIds(Guid, 'tvdb');
  if (episodeTvdbIds.length === 0) {
    console.warn(`No tvdbId for ${seriesTitle}`);
    return res.end();
  }

  let seriesList;

  // Sonarr has no api for getting an episode by episode tvdbId
  // Go through the following steps to get the matching episode:
  // 1. Get series list
  // 2. Match potential series on title
  // 3. Get episode lists
  // 4. Match episode on tvdbId
  try {
    const seriesResponse = await fetch(api.getUrl('series'));
    seriesList =
      (await seriesResponse.json()) as components['schemas']['SeriesResource'][];
  } catch (error) {
    console.error('Failed to get series lists from sonarr:');
    console.error(error);
    return res.end();
  }

  // Match potential series on title. Year metadata from Plex is for the episode
  // so cannot be used for series filtering.
  const seriesMatches = seriesList.filter(
    ({ title }) =>
      // tvdb appends the year to some titles; remove it for matching
      title?.match(/^(.+?)(?: \(\d+\))?$/)?.[1] === seriesTitle
  );
  if (seriesMatches.length === 0) {
    console.warn(`Could not find ${seriesTitle} in sonarr library`);
    return res.end();
  }

  let episodeList;
  let episode;
  for (const series of seriesMatches) {
    if (!series.id) {
      continue;
    }
    try {
      const episodeListResponse = await fetch(
        api.getUrl('episode', {
          seriesId: series.id.toString(),
        })
      );
      episodeList =
        (await episodeListResponse.json()) as components['schemas']['EpisodeResource'][];
    } catch (error) {
      console.error(`Failed to get episode list for ${seriesTitle}:`);
      console.error(error);
      continue;
    }

    episode = episodeList.find(
      ({ tvdbId }) => tvdbId && episodeTvdbIds.includes(tvdbId.toString())
    );
    if (episode) {
      break;
    }
  }
  if (!episode) {
    console.warn(
      `Could not find episode tvdbIds: ${episodeTvdbIds} for ${seriesTitle}`
    );
    return res.end();
  }

  const episodeString = `${seriesTitle} - S${episode.seasonNumber}E${episode.episodeNumber}`;

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
