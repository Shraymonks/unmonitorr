import type { Express, Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import multer from 'multer';
import { PLEX_ACCOUNTS, PLEX_EVENTS } from './constants.ts';
import { sonarrApi } from './fetch.ts';
import { unmonitorMovie } from './radarr.ts';
import { unmonitorEpisode } from './sonarr.ts';
import type { PlexBody, PlexPayload } from './types/plex.ts';
import { getIds, parseList } from './utils.ts';

export function startPlexUnmonitor(app: Express) {
  const triggerEvents = new Set(parseList(PLEX_EVENTS));
  const plexAccounts = new Set(PLEX_ACCOUNTS ? parseList(PLEX_ACCOUNTS) : []);
  console.log(
    `unmonitoring for ${[...triggerEvents].toString()}${
      plexAccounts.size > 0
        ? ` by account${plexAccounts.size > 1 ? 's' : ''}(${[
            ...plexAccounts,
          ].toString()})`
        : ''
    } on /plex`,
  );

  const upload = multer({ dest: '/tmp/' });

  app.post(
    '/plex',
    upload.single('thumb'),
    async (
      req: Request<ParamsDictionary, unknown, PlexBody>,
      res: Response,
    ) => {
      const { Account, Metadata, event } = JSON.parse(
        req.body.payload,
      ) as PlexPayload;

      if (!triggerEvents.has(event)) {
        res.sendStatus(204);
        return;
      }

      if (
        plexAccounts.size > 0 &&
        !plexAccounts.has(Account.id.toString()) &&
        !plexAccounts.has(Account.title)
      ) {
        res.sendStatus(204);
        return;
      }

      switch (Metadata.type) {
        case 'episode': {
          if (!sonarrApi) {
            return;
          }

          const { Guid, grandparentTitle: seriesTitle } = Metadata;
          const episodeTvdbIds = getIds(Guid, 'tvdb');

          await unmonitorEpisode({ episodeTvdbIds, seriesTitle });
          break;
        }
        case 'movie': {
          const { Guid, title, year } = Metadata;
          const movieTmdbIds = getIds(Guid, 'tmdb');

          await unmonitorMovie({ movieTmdbIds, title, year });
          break;
        }
      }
      res.sendStatus(204);
    },
  );
}
