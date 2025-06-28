import type { Response } from 'express';
import { sonarrApi } from './fetch.js';
import { cleanTitle, hasExclusionTag } from './utils.js';

export async function unmonitorEpisode(
  {
    episodeTvdbIds,
    seriesTitle,
  }: { episodeTvdbIds: string[]; seriesTitle: string },
  res: Response,
): Promise<Response> {
  if (!sonarrApi) {
    return res.sendStatus(204);
  }

  // tvdbId is of the episode not the series.
  if (episodeTvdbIds.length === 0) {
    console.warn(`No tvdbId for ${seriesTitle}`);
    return res.sendStatus(204);
  }

  // Sonarr has no api for getting an episode by episode tvdbId
  // Go through the following steps to get the matching episode:
  // 1. Get series list
  // 2. Match potential series on title
  // 3. Get episode lists
  // 4. Match episode on tvdbId
  const { data: seriesList, error: seriesError } =
    await sonarrApi.GET('/api/v3/series');

  if (seriesError) {
    console.error('Failed to get series lists from sonarr:');
    console.error(seriesError);
    return res.sendStatus(204);
  }

  if (!seriesList) {
    return res.sendStatus(204);
  }

  const cleanedTitle = cleanTitle(seriesTitle);
  // Match potential series on title. Year metadata from Plex is for the episode
  // so cannot be used for series filtering.
  const seriesMatches = seriesList.filter(
    ({ title }) =>
      typeof title === 'string' && cleanTitle(title) === cleanedTitle,
  );
  if (seriesMatches.length === 0) {
    console.warn(`Could not find ${seriesTitle} in sonarr library`);
    return res.sendStatus(204);
  }

  let episode = null;
  let series = null;

  for (const seriesMatch of seriesMatches) {
    if (!seriesMatch.id) {
      continue;
    }
    const { data: episodeList, error: episodeError } = await sonarrApi.GET(
      '/api/v3/episode',
      {
        params: {
          query: {
            seriesId: seriesMatch.id,
          },
        },
      },
    );

    if (episodeError) {
      console.error(`Failed to get episode list for ${seriesTitle}:`);
      console.error(episodeError);
      continue;
    }

    if (!episodeList) {
      continue;
    }

    episode = episodeList.find(
      ({ tvdbId }) => tvdbId && episodeTvdbIds.includes(tvdbId.toString()),
    );
    if (episode) {
      series = seriesMatch;
      break;
    }
  }
  if (
    !series ||
    episode?.seasonNumber == null ||
    episode.episodeNumber == null
  ) {
    console.warn(
      `Could not find episode tvdbIds: ${episodeTvdbIds.toString()} for ${seriesTitle}`,
    );
    return res.sendStatus(204);
  }

  const episodeString = `${seriesTitle} - S${episode.seasonNumber.toString()}E${episode.episodeNumber.toString()}`;

  if (!episode.monitored) {
    console.warn(`${episodeString} is already unmonitored`);
    return res.sendStatus(204);
  }

  if (episode.id == null) {
    console.warn(`${episodeString} has no id`);
    return res.sendStatus(204);
  }

  const { data: tags, error: tagsError } = await sonarrApi.GET('/api/v3/tag');

  if (tagsError) {
    console.error(`Failed to get tags information from sonarr`);
    console.error(tagsError);
    return res.sendStatus(204);
  }

  if (hasExclusionTag(tags, series.tags)) {
    console.warn(`${episodeString} has exclusion tag`);
    return res.sendStatus(204);
  }

  const { error } = await sonarrApi.PUT('/api/v3/episode/monitor', {
    body: {
      episodeIds: [episode.id],
      monitored: false,
    },
  });

  if (error) {
    console.error(`Failed to unmonitor ${episodeString}:`);
    console.error(error);
    return res.sendStatus(204);
  }

  console.log(`${episodeString} unmonitored!`);
  return res.sendStatus(204);
}
