import type { Request, Response } from 'express';
import express from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import multer from 'multer';
import { PLEX_ACCOUNTS, PLEX_EVENTS, PLEX_PORT } from './constants.js';
import { unmonitorMovie } from './radarr.js';
import { unmonitorEpisode } from './sonarr.js';
import type { PlexBody, PlexPayload } from './types/plex.js';
import { getIds, parseList } from './utils.js';

export function startPlexUnmonitor() {
  const triggerEvents = new Set(parseList(PLEX_EVENTS));
  const plexAccounts = new Set(PLEX_ACCOUNTS ? parseList(PLEX_ACCOUNTS) : []);
  console.log(
    `unmonitoring for ${[...triggerEvents].toString()}${
      plexAccounts.size > 0
        ? ` by account${plexAccounts.size > 1 ? 's' : ''}(${[
            ...plexAccounts,
          ].toString()})`
        : ''
    } on port: ${PLEX_PORT}`,
  );

  const upload = multer({ dest: '/tmp/' });
  const app = express();

  app.get('/healthz', (_req, res) => {
    res.sendStatus(200);
  });

  app.post(
    '/',
    upload.single('thumb'),
    (req: Request<ParamsDictionary, unknown, PlexBody>, res: Response) => {
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
          const { Guid, grandparentTitle: seriesTitle } = Metadata;
          const episodeTvdbIds = getIds(Guid, 'tvdb');

          unmonitorEpisode({ episodeTvdbIds, seriesTitle }, res);
          return;
        }
        case 'movie': {
          const { Guid, title, year } = Metadata;
          const movieTmdbIds = getIds(Guid, 'tmdb');

          unmonitorMovie({ movieTmdbIds, title, year }, res);
          return;
        }
      }
    },
  );

  app.listen(Number(PLEX_PORT));
}
