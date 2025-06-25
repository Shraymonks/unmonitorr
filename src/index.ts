import { startJellyfinUnmonitor } from './jellyfin.js';
import { startPlexUnmonitor } from './plex.js';
import { DEFAULT_RADARR_HOST } from './radarr.js';
import { DEFAULT_SONARR_HOST } from './sonarr.js';
import { parseList } from './utils.js';

const {
  SERVICES = 'plex',
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

const services = new Set(parseList(SERVICES));

if (services.has('plex')) {
  startPlexUnmonitor();
}

if (services.has('jellyfin')) {
  startJellyfinUnmonitor();
}
