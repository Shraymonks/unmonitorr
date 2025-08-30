# unmonitorr

## 2.1.0

### Minor Changes

- 8fb5a20: Improve Sonarr series detection in Jellyfin by using the series' TVDB ID

## 2.0.0

### Major Changes

- 474db06: Use single port for Plex and Jellyfin

  BREAKING CHANGES

  - Plex and Jellyfin now listen from a single port configured via the `PORT` env variable.
  - The Plex webhook endpoint is now served from `/plex` instead of `/`.

### Patch Changes

- b45fdb9: Only log Radarr and Sonarr hosts if their respective API key is configured

## 1.2.0

### Minor Changes

- edb939a: Add health check and optimize build

## 1.1.3

### Patch Changes

- 90cb4c0: Fix unmonitorr not exiting if API key is unset

## 1.1.2

### Patch Changes

- 10767b1: Update node

## 1.1.1

### Patch Changes

- 4212dcd: Fix build

## 1.1.0

### Minor Changes

- 418f4c5: Support excluding media from unmonitorr.

  You can prevent specific movies or series from being unmonitored by assigning them a special tag in Radarr or Sonarr.

  - In **Radarr**, apply the tag to the movie you want to exclude.
  - In **Sonarr**, apply the tag to the series you want to exclude.
  - The default tag to exclude media is: `unmonitorr-exclude`.

  This value can be customized using the `EXCLUSION_TAG` environment variable. When set, unmonitorr will use the value of this variable instead of the default.

  When this tag is present on a movie or series, unmonitorr will skip unmonitoring that media, even if it matches the configured events or conditions.

### Patch Changes

- 418f4c5: Fix handling of large jellyfin response payloads.

## 1.0.0

### Major Changes

- 8ec6c7f: Add jellyfin support

## 0.3.2

### Patch Changes

- f469732: Use undici-types instead of undici

## 0.3.1

### Patch Changes

- 121df78: Update node image to 18.17.1

## 0.3.0

### Minor Changes

- 14c3593: Improve error messages for failed requests

### Patch Changes

- 8560b09: Fix series matching of duplicate titles

## 0.2.0

### Minor Changes

- 3d9938d: Support filtering events by Plex account IDs or usernames with PLEX_ACCOUNTS var

## 0.1.4

### Patch Changes

- d2c1f56: Bump word-wrap from 1.2.3 to 1.2.4
