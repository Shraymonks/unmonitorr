import type { Express, Request, Response } from 'express';
import express from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { sonarrApi } from './fetch.ts';
import { unmonitorMovie } from './radarr.ts';
import { unmonitorEpisode } from './sonarr.ts';

export function startJellyfinUnmonitor(app: Express) {
  console.log(`Unmonitoring for jellyfin on /jellyfin`);

  app.post(
    '/jellyfin',
    express.json({ limit: '10mb' }),
    async (
      req: Request<ParamsDictionary, unknown, JellyfinApiResponse>,
      res: Response,
    ) => {
      const { Item, Series } = req.body;

      if (!Item.UserData.Played) {
        res.sendStatus(204);
        return;
      }

      switch (Item.Type) {
        case 'Episode': {
          if (!sonarrApi) {
            return;
          }

          const episodeTvdbIds = [Item.ProviderIds.Tvdb];
          const seriesTitle = Series.OriginalTitle;
          const seriesTvdbId = Series.ProviderIds['Tvdb'];

          await unmonitorEpisode({
            episodeTvdbIds,
            seriesTitle,
            seriesTvdbId,
          });
          break;
        }
        case 'Movie': {
          const title = Item.OriginalTitle;
          const year = Item.ProductionYear;
          const movieTmdbIds = [Item.ProviderIds.Tmdb];

          await unmonitorMovie({ movieTmdbIds, title, year });
          break;
        }
      }
      res.sendStatus(204);
    },
  );
}
