import {
  RADARR_API_KEY,
  RADARR_HOST,
  SERVICES,
  SONARR_API_KEY,
  SONARR_HOST,
} from './constants.js';
import { startJellyfinUnmonitor } from './jellyfin.js';
import { startPlexUnmonitor } from './plex.js';
import { parseList } from './utils.js';

if (RADARR_API_KEY == null && SONARR_API_KEY == null) {
  console.error('Set RADARR_API_KEY and/or SONARR_API_KEY to unmonitor');
  process.exitCode = 1;
} else {
  if (RADARR_API_KEY) {
    console.log(`Radarr: ${RADARR_HOST}`);
  }
  if (SONARR_API_KEY) {
    console.log(`Sonarr: ${SONARR_HOST}`);
  }

  const services = new Set(parseList(SERVICES));

  if (services.has('plex')) {
    startPlexUnmonitor();
  }

  if (services.has('jellyfin')) {
    startJellyfinUnmonitor();
  }
}
