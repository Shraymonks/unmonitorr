import express from 'express';
import multer from 'multer';

import { DEFAULT_SONARR_HOST, unmonitorEpisode } from './sonarr.js';
import { DEFAULT_RADARR_HOST, unmonitorMovie } from './radarr.js';

import type { PlexPayload } from './types/plex';

const {
  PLEX_EVENTS = 'media.play',
  PORT = '9797',
  RADARR_API_KEY,
  RADARR_HOST = DEFAULT_RADARR_HOST,
  SONARR_API_KEY,
  SONARR_HOST = DEFAULT_SONARR_HOST,
} = process.env;

// Suppress fetch experimental warning
process.removeAllListeners('warning');

if (PLEX_EVENTS == null) {
  console.error('Set PLEX_EVENTS to trigger unmonitoring');
  process.exitCode = 1;
} else if (RADARR_API_KEY == null && SONARR_API_KEY == null) {
  console.error('Set RADARR_API_KEY and/or SONARR_API_KEY to unmonitor');
  process.exitCode = 1;
} else {
  const triggerEvents = new Set(PLEX_EVENTS.split(/\s*,\s*/));
  console.log(`unmonitoring for ${[...triggerEvents]} on port: ${PORT}`);
  if (RADARR_API_KEY) {
    console.log(`Radarr: ${RADARR_HOST}`);
  }
  if (SONARR_API_KEY) {
    console.log(`Sonarr: ${SONARR_HOST}`);
  }

  const upload = multer({ dest: '/tmp/' });
  const app = express();

  app.post('/', upload.single('thumb'), (req, res) => {
    const { Metadata, event }: PlexPayload = JSON.parse(req.body.payload);

    if (!triggerEvents.has(event)) {
      return res.end();
    }

    switch (Metadata.type) {
      case 'episode':
        return unmonitorEpisode(Metadata, res);
      case 'movie':
        return unmonitorMovie(Metadata, res);
    }
    return res.end();
  });

  app.listen(parseInt(PORT, 10));
}
