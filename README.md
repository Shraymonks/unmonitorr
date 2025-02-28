# unmonitorr

Unmonitor media in Radarr and Sonarr from Plex webhook events.

## Sample uses

- Use the `media.play` event to unmonitor whenever media is played in Plex. Useful for upgrading until media is played for the first time.
- Use the `library.new` event to unmonitor whenever media is added to Plex. Useful for preventing upgrades if you have preferred words set as they always upgrade a release in V3 even if cutoffs have been met and upgrades are disabled. See [Preferred Words FAQs](https://wiki.servarr.com/en/sonarr/faq#preferred-words-faqs) for more information.

## Installation

### Docker

Set up using [shraymonks/unmonitorr](https://hub.docker.com/r/shraymonks/unmonitorr):

```yaml
services:
  unmonitorr:
    image: shraymonks/unmonitorr:latest
    environment:
      PLEX_EVENTS: media.play
      RADARR_HOST: http://127.0.0.1:7878
      RADARR_API_KEY: $RADARR_API_KEY
      SONARR_HOST: http://127.0.0.1:8989
      SONARR_API_KEY: $SONARR_API_KEY
    ports:
      - 9797:9797
    restart: unless-stopped
```

### Add webhook to Plex

Add a new webhook url to Plex under `Settings -> Webhooks`. Enter the url for your docker container including the exposed port.

(note Plex Pass is required to use webhooks)

## Jellyfin Support

Unmonitorr also supports Jellyfin alongside Plex. Here's how to set it up:

### Setting up Jellyfin support

1. You need to specify either `JELLYFIN_EVENTS` or `PLEX_EVENTS` (or both) in your docker compose environment variables to enable support for Jellyfin and/or Plex.

2. Install the Jellyfin Webhooks plugin:

   - The Jellyfin Webhooks plugin can be found at: [https://github.com/shemanaev/jellyfin-plugin-webhooks](https://github.com/shemanaev/jellyfin-plugin-webhooks)
   - Follow the installation instructions on the GitHub page to add the plugin to your Jellyfin server
   - Unmonitorr supports the "Default - native Jellyfin payload" type of webhook

3. Configure the webhook in Jellyfin to point to your unmonitorr instance (default port 9898 for Jellyfin webhooks)

### Jellyfin-specific behavior

- In Jellyfin, media is unmonitored only if it is fully played
- The default port for Jellyfin webhooks is 9898 (configurable via `JELLYFIN_PORT`)
- `JELLYFIN_ACCOUNTS` works similarly to `PLEX_ACCOUNTS`, allowing you to specify which users' events should trigger unmonitoring

### Supported Jellyfin Events

Jellyfin supports the following webhook events:

```
Play, Pause, Resume, Stop, Scrobble, Progress, MarkPlayed, MarkUnplayed, Rate,
ItemAdded, ItemRemoved, ItemUpdated, AuthenticationSucceeded, AuthenticationFailed,
SessionStarted, SessionEnded, SubtitleDownloadFailure, HasPendingRestartChanged
```

### Environment variables

| variable | description | default |
| --- | --- | --- |
| `PLEX_ACCOUNTS` | Comma separated list of Plex account IDs or usernames for events in `PLEX_EVENTS` to unmonitor for. Will unmonitor for `PLEX_EVENTS` triggered by any account if not set. | `undefined` |
| `PLEX_EVENTS` | Comma separated list of Plex webhook events to unmonitor on: <ul><li>`library.on.deck`</li><li>`library.new`</li><li>`media.pause`</li><li>`media.play`</li><li>`media.rate`</li><li>`media.resume`</li><li>`media.scrobble`</li><li>`media.stop`</li><li>`playback.started`</li></ul> Must only use events that provide movie or episode metadata. See [Plex Webhooks](https://support.plex.tv/articles/115002267687-webhooks/#toc-1) for more info. | `undefined` |
| `PLEX_PORT` | Internal port to listen for Plex webhooks | `9797` |
| `JELLYFIN_ACCOUNTS` | Comma separated list of Jellyfin account IDs or usernames for events in `JELLYFIN_EVENTS` to unmonitor for. Will unmonitor for `JELLYFIN_EVENTS` triggered by any account if not set. | `undefined` |
| `JELLYFIN_EVENTS` | Comma separated list of Jellyfin webhook events to unmonitor on. | `undefined` |
| `JELLYFIN_PORT` | Internal port to listen for Jellyfin webhooks | `9898` |
| `RADARR_API_KEY` | API key for Radarr | `undefined` |
| `RADARR_HOST` | Host for Radarr | `http://127.0.0.1:7878` |
| `SONARR_API_KEY` | API key for Sonarr | `undefined` |
| `SONARR_HOST` | Host for Sonarr | `http://127.0.0.1:8989` |
