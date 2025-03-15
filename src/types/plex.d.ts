// Plex has no documentation of its types so types here are
// just observations from sample payloads and may be incomplete.
// Plex webhooks documentation: https://support.plex.tv/articles/115002267687-webhooks/

interface Country {
  count: number;
  filter: string;
  id: number;
  tag: string;
}

interface Director {
  filter: string;
  id: number;
  tag: string;
  tagKey: string;
  thumb: string;
}

interface Genre {
  count: number;
  filter: string;
  id: number;
  tag: string;
}

interface Guid {
  id: string;
}

interface Image {
  alt: string;
  type: string;
  url: string;
}

interface Producer {
  filter: string;
  id: number;
  tag: string;
  tagKey: string;
  thumb: string;
}

interface Rating {
  count: number;
  image: string;
  type: 'audience' | 'critic';
  value: number;
}

interface Role {
  filter: string;
  id: number;
  role: string;
  tag: string;
  tagKey: string;
  thumb: string;
}

interface Writer {
  count: number;
  filter: string;
  id: number;
  tag: string;
  tagKey: string;
  thumb: string;
}

interface Metadata {
  Guid?: Guid[];
  Image: Image[];
  Role: Role[];
  addedAt: number;
  art: string;
  chapterSource: string;
  contentRating: string;
  guid: string;
  key: string;
  librarySectionID: number;
  librarySectionKey: string;
  librarySectionTitle: string;
  originallyAvailableAt: string;
  ratingKey: string;
  summary: string;
  thumb: string;
  title: string;
  updatedAt: number;
  year: number;
}

interface EpisodeMetadata extends Metadata {
  grandparentArt: string;
  grandparentGuid: string;
  grandparentKey: string;
  grandparentRatingKey: string;
  grandparentSlug: string;
  grandparentTheme: string;
  grandparentThumb: string;
  grandparentTitle: string;
  index: number;
  librarySectionType: 'show';
  originalTitle: string;
  parentGuid: string;
  parentIndex: number;
  parentKey: string;
  parentRatingKey: string;
  parentTitle: string;
  type: 'episode';
}

interface MovieMetadata extends Metadata {
  Country: Country[];
  Director: Director[];
  Genre: Genre[];
  Producer: Producer[];
  Rating: Rating[];
  UltraBlurColors: {
    bottomLeft: string;
    bottomRight: string;
    topLeft: string;
    topRight: string;
  };
  Writer: Writer[];
  audienceRating: number;
  audienceRatingImage: string;
  duration: number;
  librarySectionType: 'movie';
  rating: number;
  ratingImage: string;
  slug: string;
  studio: string;
  tagline: string;
  type: 'movie';
}

export interface PlexPayload {
  Account: {
    id: number;
    thumb: string;
    title: string;
  };
  Metadata: EpisodeMetadata | MovieMetadata;
  Player: {
    local: boolean;
    publicAddress: string;
    title: string;
    uuid: string;
  };
  Server: {
    title: string;
    uuid: string;
  };
  event:
    | 'admin.database.backup'
    | 'admin.database.corrupted'
    | 'device.new'
    | 'library.new'
    | 'library.on.deck'
    | 'media.pause'
    | 'media.play'
    | 'media.rate'
    | 'media.resume'
    | 'media.scrobble'
    | 'media.stop'
    | 'playback.started';
  owner: boolean;
  user: boolean;
}

export interface PlexBody {
  payload: string;
}
