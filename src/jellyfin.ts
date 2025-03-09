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
