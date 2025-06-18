import type { PlexPayload } from './types/plex.js';
const { EXCLUSION_TAG = 'unmonitorr-exclude' } = process.env;

export class Api {
  #apiKey: string;
  base: string;
  constructor(base: string, apiKey = '') {
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

// Removes year from title. Media with duplicate titles may sometimes have the
// year appended to the end of the title.
export function cleanTitle(title: string): string {
  return title.replace(/ \(\d{4}\)$/, '');
}

// gets the matching ids from Plex Metadata.Guid payload
// note Metadata.Guid can contain multiple ids of the same type.
// getGuid([{id: 'tvdb://1234'}], 'tvdb') => ['1234']
export function getIds(
  guid: PlexPayload['Metadata']['Guid'] = [],
  type: 'imdb' | 'tmdb' | 'tvdb',
): string[] {
  return guid
    .filter(({ id }) => id.startsWith(type))
    .map(({ id }) => id.replace(`${type}://`, ''));
}

// Create an array from a comma separated string.
export function parseList(list: string): string[] {
  return list.split(/\s*,\s*/);
}

interface Tag {
  id: number;
  label: string;
}

export async function hasExclusionTag(
  url: string,
  ids?: number[] | null,
): Promise<boolean> {
  try {
    const response = await fetch(url);
    const tags = (await response.json()) as Tag[];

    const idsSet = new Set(ids);

    return tags.some(
      (tag) => idsSet.has(tag.id) && tag.label === EXCLUSION_TAG,
    );
  } catch (error) {
    console.error(`Failed to get tags information from ${url}`);
    console.error(error);
    // fallback to true to avoid unmonitoring excluded items
    return true;
  }
}
