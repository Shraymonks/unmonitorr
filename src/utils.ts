import type { PlexPayload } from './types/plex';

// gets the matching ids from Plex Metadata.Guid payload
// note Metadata.Guid can contain multiple ids of the same type.
// getGuid([{id: 'tvdb://1234'}], 'tvdb') => ['1234']
export function getIds(
  guid: PlexPayload['Metadata']['Guid'],
  type: 'imdb' | 'tmdb' | 'tvdb'
): string[] {
  return guid
    .filter(({ id }) => id.startsWith(type))
    .map(({ id }) => id.replace(`${type}://`, ''));
}
