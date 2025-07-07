import express from 'express';
import {
  PORT,
  RADARR_API_KEY,
  RADARR_HOST,
  SERVICES,
  SONARR_API_KEY,
  SONARR_HOST,
} from './constants.js';
import { startJellyfinUnmonitor } from './jellyfin.js';
import { startPlexUnmonitor } from './plex.js';
import { parseList } from './utils.js';

const services = new Set(parseList(SERVICES));

if (RADARR_API_KEY == null && SONARR_API_KEY == null) {
  console.error('Set RADARR_API_KEY and/or SONARR_API_KEY to unmonitor');
  process.exitCode = 1;
} else if (!services.has('plex') && !services.has('jellyfin')) {
  console.error('Set SERVICES to include "plex" and/or "jellyfin"');
  process.exitCode = 1;
} else {
  if (RADARR_API_KEY) {
    console.log(`Radarr: ${RADARR_HOST}`);
  }
  if (SONARR_API_KEY) {
    console.log(`Sonarr: ${SONARR_HOST}`);
  }

  const app = express();

  app.get('/healthz', (_req, res) => {
    res.sendStatus(200);
  });

  if (services.has('plex')) {
    startPlexUnmonitor(app);
  }

  if (services.has('jellyfin')) {
    startJellyfinUnmonitor(app);
  }
  app.listen(Number(PORT));
  console.log(`Listening on port: ${PORT}`);
}
