import express from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

import type { Request, Response } from 'express';
import { unmonitorMovie } from './radarr.js';
import { unmonitorEpisode } from './sonarr.js';
import { parseList } from './utils.js';

const {
  JELLYFIN_ACCOUNTS,
  JELLYFIN_EVENTS,
  JELLYFIN_PORT = '9898',
} = process.env;

export function startJellyfinUnmonitor() {
  const triggerEvents = new Set(parseList(JELLYFIN_EVENTS ?? ''));
  const jellyfinAccounts = new Set(
    JELLYFIN_ACCOUNTS ? parseList(JELLYFIN_ACCOUNTS) : [],
  );
  console.log(
    `unmonitoring for ${[...triggerEvents].toString()}${
      jellyfinAccounts.size > 0
        ? ` by account${jellyfinAccounts.size > 1 ? 's' : ''}(${[
            ...jellyfinAccounts,
          ].toString()})`
        : ' for Jellyfin'
    } on port: ${JELLYFIN_PORT}`,
  );

  const app = express();

  app.post(
    '/jellyfin',
    express.json(),
    (
      req: Request<ParamsDictionary, unknown, JellyfinApiResponse>,
      res: Response,
    ) => {
      const { Event, Item, User, Series } = req.body;

      if (!triggerEvents.has(Event)) {
        res.end();
        return;
      }

      if (
        jellyfinAccounts.size > 0 &&
        !jellyfinAccounts.has(User.Id) &&
        !jellyfinAccounts.has(User.Name)
      ) {
        res.end();
        return;
      }

      if (Item.Type === 'Episode' && Item.UserData.Played) {
        const episodeTvdbIds = [Item.ProviderIds.Tvdb];
        const seriesTitle = Series.OriginalTitle;

        // tvdbId is of the episode not the series.
        if (episodeTvdbIds.length === 0) {
          console.warn(`No tvdbId for ${seriesTitle}`);
          res.end();
          return;
        }

        void unmonitorEpisode({ episodeTvdbIds, seriesTitle }, res);
      }

      if (Item.Type === 'Movie' && Item.UserData.Played) {
        const title = Item.OriginalTitle;
        const year = Item.ProductionYear;
        const titleYear = `${title} (${year})`;
        const movieTmdbIds = [Item.ProviderIds.Tmdb];

        if (movieTmdbIds.length === 0) {
          console.warn(`No tmdbId for ${titleYear}`);
          res.end();
          return;
        }

        void unmonitorMovie({ movieTmdbIds, titleYear }, res);
      }
    },
  );

  app.listen(parseInt(JELLYFIN_PORT, 10));
}
