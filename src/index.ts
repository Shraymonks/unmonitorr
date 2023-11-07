import express from 'express';
import multer from 'multer';

import { DEFAULT_SONARR_HOST, unmonitorEpisode } from './sonarr.js';
import { DEFAULT_RADARR_HOST, unmonitorMovie } from './radarr.js';
import { parseList } from './utils.js';

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { PlexBody, PlexPayload } from './types/plex.js';

const {
  PLEX_ACCOUNTS,
  PLEX_EVENTS = 'media.play',
  PORT = '9797',
  RADARR_API_KEY,
  RADARR_HOST = DEFAULT_RADARR_HOST,
  SONARR_API_KEY,
  SONARR_HOST = DEFAULT_SONARR_HOST,
} = process.env;

if (RADARR_API_KEY == null && SONARR_API_KEY == null) {
  console.error('Set RADARR_API_KEY and/or SONARR_API_KEY to unmonitor');
  process.exitCode = 1;
} else {
  const triggerEvents = new Set(parseList(PLEX_EVENTS));
  const plexAccounts = new Set(PLEX_ACCOUNTS ? parseList(PLEX_ACCOUNTS) : []);
  console.log(
    `unmonitoring for ${[...triggerEvents].toString()}${
      plexAccounts.size > 0
        ? ` by account${plexAccounts.size > 1 ? 's' : ''}(${[
            ...plexAccounts,
          ].toString()})`
        : ''
    } on port: ${PORT}`,
  );
  if (RADARR_API_KEY) {
    console.log(`Radarr: ${RADARR_HOST}`);
  }
  if (SONARR_API_KEY) {
    console.log(`Sonarr: ${SONARR_HOST}`);
  }

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
        case 'episode':
          void unmonitorEpisode(Metadata, res);
          return;
        case 'movie':
          void unmonitorMovie(Metadata, res);
          return;
      }
      res.end();
    },
  );

  app.listen(parseInt(PORT, 10));
}
