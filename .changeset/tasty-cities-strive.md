---
'unmonitorr': major
---

Use single port for Plex and Jellyfin

BREAKING CHANGES

- Plex and Jellyfin now listen from a single port configured via the `PORT` env variable.
- The Plex webhook endpoint is now served from `/plex` instead of `/`.
