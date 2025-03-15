import express from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

import type { Request, Response } from 'express';
import { unmonitorMovie } from './radarr.js';
import { unmonitorEpisode } from './sonarr.js';

const { JELLYFIN_PORT = '9898' } = process.env;

export function startJellyfinUnmonitor() {
  console.log(
    `Unmonitoring for jellyfin on /jellyfin with port: ${JELLYFIN_PORT}`,
  );

  const app = express();

  app.post(
    '/jellyfin',
    express.json(),
    (
      req: Request<ParamsDictionary, unknown, JellyfinApiResponse>,
      res: Response,
    ) => {
      const { Item, Series } = req.body;

      if (!Item.UserData.Played) {
        res.end();
        return;
      }

      switch (Item.Type) {
        case 'Episode': {
          const episodeTvdbIds = [Item.ProviderIds.Tvdb];
          const seriesTitle = Series.OriginalTitle;

          void unmonitorEpisode({ episodeTvdbIds, seriesTitle }, res);
          return;
        }
        case 'Movie': {
          const title = Item.OriginalTitle;
          const year = Item.ProductionYear;
          const movieTmdbIds = [Item.ProviderIds.Tmdb];

          void unmonitorMovie({ movieTmdbIds, title, year }, res);
          return;
        }
      }
      res.end();
    },
  );

  app.listen(parseInt(JELLYFIN_PORT, 10));
}
