import type { PlexPayload } from './types/plex';

// gets the matching id from Plex Metadata.Guid payload
// getGuid([{id: 'tvdb://1234'}], 'tvdb') => '1234'
export function getId(
  guid: PlexPayload['Metadata']['Guid'],
  type: 'imdb' | 'tmdb' | 'tvdb'
): string | undefined {
  const match = guid.map(({ id }) => id).find((id) => id.startsWith(type));
  return match && match.replace(`${type}://`, '');
}
