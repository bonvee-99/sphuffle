# Sphuffle
Spotify doesnt have a good way to shuffle all songs in every playlist you have. Here we go.

### Spotify API
1. login to get access token using client_id and client_secret
  ```bash
    curl -X POST "https://accounts.spotify.com/api/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials&client_id=&client_secret="
  ```
2. get my info
  ```bash
    curl --request GET \
    --url https://api.spotify.com/v1/me \
    --header 'Authorization: Bearer <token>'
  ```

### Logic
- have a mega playlist
- every day or so look through playlists and add missing ones to megaplaylist
- also remove songs that are in megaplaylist but not in a playlist?
