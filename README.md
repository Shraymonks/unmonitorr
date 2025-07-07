# unmonitorr

Unmonitor media in Radarr and Sonarr from Plex webhook events.

## Sample uses

- Use the `media.play` event to unmonitor whenever media is played in Plex. Useful for upgrading until media is played for the first time.
- Use the `library.new` event to unmonitor whenever media is added to Plex. Useful for preventing upgrades if you have preferred words set as they always upgrade a release in V3 even if cutoffs have been met and upgrades are disabled. See [Preferred Words FAQs](https://wiki.servarr.com/en/sonarr/faq#preferred-words-faqs) for more information.

## Exclude Media from Being Unmonitored

You can prevent specific movies or series from being unmonitored by assigning them a special tag in Radarr or Sonarr.

- In **Radarr**, apply the tag to the movie you want to exclude.
- In **Sonarr**, apply the tag to the series you want to exclude.
- The default tag to exclude media is: `unmonitorr-exclude`.

This value can be customized using the `EXCLUSION_TAG` environment variable. When set, unmonitorr will use the value of this variable instead of the default.

When this tag is present on a movie or series, unmonitorr will skip unmonitoring that media, even if it matches the configured events or conditions.

## Installation

### Docker

Set up using [shraymonks/unmonitorr](https://hub.docker.com/r/shraymonks/unmonitorr):

```yaml
services:
  unmonitorr:
    image: shraymonks/unmonitorr:latest
    environment:
      SERVICES: plex
      PLEX_EVENTS: media.play
      RADARR_HOST: http://127.0.0.1:7878
      RADARR_API_KEY: $RADARR_API_KEY
      SONARR_HOST: http://127.0.0.1:8989
      SONARR_API_KEY: $SONARR_API_KEY
      EXCLUSION_TAG: unmonitorr-exclude
    ports:
      - 9797:9797
    restart: unless-stopped
```

### Add webhook to Plex

Add a new webhook url to Plex under `Settings -> Webhooks`. Enter the url for your docker container including the exposed port with path `/plex`. (e.g. `unmonitorr_base_url:9797/plex`)

(note Plex Pass is required to use webhooks)

## Jellyfin Support

Unmonitorr also supports Jellyfin alongside Plex. Here's how to set it up:

### Setting up Jellyfin support

1. You need to specify either `jellyfin` in `SERVICES` (you can use both plex and jellyfin with `plex,jellyfin`) in your docker compose environment variables to enable support for Jellyfin and/or Plex.

2. Install the Jellyfin Webhooks plugin:
   - The Jellyfin Webhooks plugin can be found at: [https://github.com/shemanaev/jellyfin-plugin-webhooks](https://github.com/shemanaev/jellyfin-plugin-webhooks)
   - Follow the installation instructions on the GitHub page to add the plugin to your Jellyfin server
   - Unmonitorr supports the "Default - native Jellyfin payload" type of webhook
   - the events and accounts for jellyfin are managed directly in the webhook plugin

3. Configure the webhook in Jellyfin to point to your unmonitorr instance on path `/jellyfin` (e.g. `unmonitorr_base_url:9797/jellyfin`)

### Jellyfin-specific behavior

- In Jellyfin, media is unmonitored only if it is fully played
- Jellyfin accounts and events are managed through the jellyfin webhook plugin

### Environment variables

| variable | description | default |
| --- | --- | --- |
| `SERVICES` | Comma separated list of the service for which unmonitorr needs to be enabled. Supports both jellyfin and plex separated by comma | `plex` |
| `PLEX_ACCOUNTS` | Comma separated list of Plex account IDs or usernames for events in `PLEX_EVENTS` to unmonitor for. Will unmonitor for `PLEX_EVENTS` triggered by any account if not set. | `undefined` |
| `PLEX_EVENTS` | Comma separated list of Plex webhook events to unmonitor on: <ul><li>`library.on.deck`</li><li>`library.new`</li><li>`media.pause`</li><li>`media.play`</li><li>`media.rate`</li><li>`media.resume`</li><li>`media.scrobble`</li><li>`media.stop`</li><li>`playback.started`</li></ul> Must only use events that provide movie or episode metadata. See [Plex Webhooks](https://support.plex.tv/articles/115002267687-webhooks/#toc-1) for more info. | `media.play` |
| `PORT` | Internal port to listen for webhooks | `9797` |
| `RADARR_API_KEY` | API key for Radarr | `undefined` |
| `RADARR_HOST` | Host for Radarr | `http://127.0.0.1:7878` |
| `SONARR_API_KEY` | API key for Sonarr | `undefined` |
| `SONARR_HOST` | Host for Sonarr | `http://127.0.0.1:8989` |
| `EXCLUSION_TAG` | Tag name used to exclude media from being unmonitored. If present on a movie or series, unmonitorr will skip unmonitoring it. | `unmonitorr-exclude` |
