import { ParamsDictionary } from 'express-serve-static-core';
import multer from 'multer';
import { PlexBody } from './types/plex.js';
import { getIds, parseList } from './utils.js';

import express from 'express';

import { unmonitorMovie } from './radarr.js';
import { unmonitorEpisode } from './sonarr.js';

import type { Request, Response } from 'express';
import type { PlexPayload } from './types/plex.js';

const {
  PLEX_ACCOUNTS,
  PLEX_EVENTS = 'media.play',
  PLEX_PORT = '9797',
} = process.env;

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

  app.post(
    '/',
    upload.single('thumb'),
    (req: Request<ParamsDictionary, unknown, PlexBody>, res: Response) => {
      const { Account, Metadata, event } = JSON.parse(
        req.body.payload,
      ) as PlexPayload;

      if (!triggerEvents.has(event)) {
        res.end();
        return;
      }

      if (
        plexAccounts.size > 0 &&
        !plexAccounts.has(Account.id.toString()) &&
        !plexAccounts.has(Account.title)
      ) {
        res.end();
        return;
      }

      switch (Metadata.type) {
        case 'episode': {
          const { Guid, grandparentTitle: seriesTitle } = Metadata;
          const episodeTvdbIds = getIds(Guid, 'tvdb');

          void unmonitorEpisode({ episodeTvdbIds, seriesTitle }, res);
          return;
        }
        case 'movie': {
          const { Guid, title, year } = Metadata;
          const movieTmdbIds = getIds(Guid, 'tmdb');

          void unmonitorMovie({ movieTmdbIds, title, year }, res);
          return;
        }
      }
    },
  );

  app.listen(parseInt(PLEX_PORT, 10));
}
