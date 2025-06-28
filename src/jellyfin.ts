import type { Request, Response } from 'express';
import express from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { JELLYFIN_PORT } from './constants.js';
import { unmonitorMovie } from './radarr.js';
import { unmonitorEpisode } from './sonarr.js';

export function startJellyfinUnmonitor() {
  console.log(
    `Unmonitoring for jellyfin on /jellyfin with port: ${JELLYFIN_PORT}`,
  );

  const app = express();

  app.get('/healthz', (_req, res) => {
    res.sendStatus(200);
  });

  app.post(
    '/jellyfin',
    express.json({ limit: '10mb' }),
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
    },
  );

  app.listen(parseInt(JELLYFIN_PORT, 10));
}
