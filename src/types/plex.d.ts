// Plex has no documentation of its types so types here are
// just observations from sample payloads and may be incomplete.
// Plex webhooks documentation: https://support.plex.tv/articles/115002267687-webhooks/
export interface PlexPayload {
  event:
    | 'library.on.deck'
    | 'library.new'
    | 'media.pause'
    | 'media.play'
    | 'media.rate'
    | 'media.resume'
    | 'media.scrobble'
    | 'media.stop'
    | 'admin.database.backup'
    | 'admin.database.corrupted'
    | 'device.new'
    | 'playback.started';

  user: boolean;
  owner: boolean;

  Account: {
    id: number;
    thumb: string;
    title: string;
  };

  Server: {
    title: string;
    uuid: string;
  };

  Player: {
    local: boolean;
    publicAddress: string;
    title: string;
    uuid: string;
  };

  Metadata: {
    librarySectionType: string;
    ratingKey: string;
    key: string;
    parentRatingKey: string;
    grandparentRatingKey: string;
    guid: string;
    librarySectionID: string;
    type: string;
    title: string;
    grandparentKey: string;
    parentKey: string;
    grandparentTitle: string;
    parentTitle: string;
    summary: string;
    index: number;
    ratingCount: number;
    thumb: string;
    art: string;
    parentThumb: string;
    grandparentThumb: string;
    grandparentArt: string;
    addedAt: number;
    updatedAt: number;
    year?: number;
    Guid?: { id: string }[];
  };
}
export interface PlexBody {
  payload: string;
}
