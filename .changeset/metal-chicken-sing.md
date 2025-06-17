---
"unmonitorr": minor
---

Support excluding media from unmonitorr. 

You can prevent specific movies or series from being unmonitored by assigning them a special tag in Radarr or Sonarr.

- In **Radarr**, apply the tag to the movie you want to exclude.
- In **Sonarr**, apply the tag to the series you want to exclude.
- The default tag to exclude media is: `unmonitorr-exclude`.

This value can be customized using the `EXCLUSION_TAG` environment variable. When set, unmonitorr will use the value of this variable instead of the default.

When this tag is present on a movie or series, unmonitorr will skip unmonitoring that media, even if it matches the configured events or conditions.
