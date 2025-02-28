import { DEFAULT_RADARR_HOST } from './radarr.js';
import { DEFAULT_SONARR_HOST } from './sonarr.js';

import { startPlexUnmonitor } from './plex.js';
import { startJellyfinUnmonitor } from './jellyfin.js';

const {
  PLEX_EVENTS,
  JELLYFIN_EVENTS,
  RADARR_API_KEY,
  RADARR_HOST = DEFAULT_RADARR_HOST,
  SONARR_API_KEY,
  SONARR_HOST = DEFAULT_SONARR_HOST,
} = process.env;

if (RADARR_API_KEY == null && SONARR_API_KEY == null) {
  console.error('Set RADARR_API_KEY and/or SONARR_API_KEY to unmonitor');
  process.exitCode = 1;
}
console.log(`Radarr: ${RADARR_HOST}`);
console.log(`Sonarr: ${SONARR_HOST}`);

if (PLEX_EVENTS == null && JELLYFIN_EVENTS == null) {
  console.error('Set PLEX_EVENTS and/or JELLYFIN_EVENTS to unmonitor');
  process.exitCode = 1;
}

if (PLEX_EVENTS) {
  startPlexUnmonitor();
}

if (JELLYFIN_EVENTS) {
  startJellyfinUnmonitor();
}
