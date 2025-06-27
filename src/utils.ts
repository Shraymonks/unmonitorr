import { EXCLUSION_TAG } from './constants.js';
import type { PlexPayload } from './types/plex.js';
import type { components } from './types/radarr.js';

type Tag = components['schemas']['TagResource'];

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

export function hasExclusionTag(
  tags: Tag[],
  mediaTagIds?: number[] | null,
): boolean {
  if (!mediaTagIds || mediaTagIds.length === 0) {
    return false;
  }
  const exclusionTagId = tags.find((tag) => tag.label === EXCLUSION_TAG)?.id;
  return exclusionTagId != null && mediaTagIds.includes(exclusionTagId);
}
