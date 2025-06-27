import createClient from 'openapi-fetch';
import {
  RADARR_API_KEY,
  RADARR_HOST,
  SONARR_API_KEY,
  SONARR_HOST,
} from './constants.js';
import type { paths as radarrPaths } from './types/radarr.js';
import type { paths as sonarrPaths } from './types/sonarr.js';

export const radarrApi = RADARR_API_KEY
  ? createClient<radarrPaths>({
      baseUrl: RADARR_HOST,
      headers: {
        'X-Api-Key': RADARR_API_KEY,
      },
    })
  : undefined;

export const sonarrApi = SONARR_API_KEY
  ? createClient<sonarrPaths>({
      baseUrl: SONARR_HOST,
      headers: {
        'X-Api-Key': SONARR_API_KEY,
      },
    })
  : undefined;
