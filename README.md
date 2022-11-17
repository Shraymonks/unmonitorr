# unmonitorr

Unmonitor media in Radarr and Sonarr from Plex webhook events.

## Sample uses

- Use the `media.play` event to unmonitor whenever media is played in Plex. Useful for upgrading until media is played for the first time.
- Use the `library.new` event to unmonitor whenever media is added to Plex. Useful for preventing upgrades if you have preferred words set as they always upgrade a release in V3 even if cutoffs have been met and upgrades are disabled. See [Preferred Words FAQs](https://wiki.servarr.com/en/sonarr/faq#preferred-words-faqs) for more information.

## Installation

### Docker

Set up using [shraymonks/unmonitorr](https://hub.docker.com/r/shraymonks/unmonitorr):

```
unmonitorr:
  image: shraymonks/unmonitorr:latest
  container_name: unmonitorr
  environment:
    - PLEX_EVENTS: media.play
    - RADARR_HOST: http://127.0.0.1:7878
    - RADARR_API_KEY: <RADARR_API_KEY>
    - SONARR_HOST: http://127.0.0.1:8989
    - SONARR_API_KEY: <SONARR_API_KEY>
  ports:
    - 9797:9797
  restart: unless-stopped
```

#### Environment variables

| variable | description | default |
| --- | --- | --- |
| `PLEX_EVENTS` | Comma separated list of plex webhook events: <ul><li>`library.on.deck`</li><li>`library.new`</li><li>`media.pause`</li><li>`media.play`</li><li>`media.rate`</li><li>`media.resume`</li><li>`media.scrobble`</li><li>`media.stop`</li><li>`playback.started`</li></ul> Must only use events that provide movie or episode metadata. See [Plex Webhooks](https://support.plex.tv/articles/115002267687-webhooks/#toc-1) for more info. | `media.play` |
| `PORT` | Internal port to listen on | `9797` |
| `RADARR_API_KEY` | API key for Radarr | `undefined` |
| `RADARR_HOST` | Host for Radarr | `http://127.0.0.1:7878` |
| `SONARR_API_KEY` | API key for Sonarr | `undefined` |
| `SONARR_HOST` | Host for Sonarr | `http://127.0.0.1:8989` |

`PLEX_EVENTS` and at least one of `RADARR_API_KEY` and `SONARR_API_KEY` are required.

### Add webhook to Plex

Add a new webhook url to Plex under `Settings -> Webhooks`. Enter the url for your docker container including the exposed port.

(note Plex Pass is required to use webhooks)
