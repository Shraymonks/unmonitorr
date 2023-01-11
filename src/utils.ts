import type { PlexPayload } from './types/plex';

export class Api {
  #apiKey: string;
  base: string;
  constructor(base: string, apiKey: string = '') {
    this.#apiKey = apiKey;
    this.base = base;
  }
  getUrl(endpoint: string, options?: Record<string, string>): string {
    const url = new URL(endpoint, this.base);
    url.search = new URLSearchParams({
      ...options,
      apikey: this.#apiKey,
    }).toString();
    return url.toString();
  }
}

// gets the matching ids from Plex Metadata.Guid payload
// note Metadata.Guid can contain multiple ids of the same type.
// getGuid([{id: 'tvdb://1234'}], 'tvdb') => ['1234']
export function getIds(
  guid: PlexPayload['Metadata']['Guid'] = [],
  type: 'imdb' | 'tmdb' | 'tvdb'
): string[] {
  return guid
    .filter(({ id }) => id.startsWith(type))
    .map(({ id }) => id.replace(`${type}://`, ''));
}
