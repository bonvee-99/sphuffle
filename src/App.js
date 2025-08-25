import React, { useState, useEffect } from "react";
import "./App.css";
import { authenticateSpotify, handleAuthCallback } from "./utils/auth";

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      const result = await handleAuthCallback();
      if (result.accessToken) {
        setAccessToken(result.accessToken);
        fetchUserProfile(result.accessToken);
      }
    };

    handleAuth();
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const profile = await response.json();
      setUserProfile(profile);
      fetchUserPlaylists(token, profile.id);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchUserPlaylists = async (token, userId) => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      setPlaylists(data.items || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  };

  const getPlaylistTracks = async (playlistId) => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
      return [];
    }
  };

  const createPlaylist = async (name, description = "") => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/users/${userProfile.id}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description,
            public: false,
          }),
        },
      );
      const playlist = await response.json();
      return playlist;
    } catch (error) {
      console.error("Error creating playlist:", error);
      return null;
    }
  };

  const addTrackToPlaylist = async (playlistId, trackUri) => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [trackUri],
          }),
        },
      );
      return await response.json();
    } catch (error) {
      console.error("Error adding track to playlist:", error);
      return null;
    }
  };

  const createPlaylistWithFirstSong = async () => {
    if (!playlists.length) {
      alert("No playlists found!");
      return;
    }

    setIsCreating(true);
    try {
      // Get first playlist
      const sourcePlaylist = playlists[0];
      console.log(`Using source playlist: ${sourcePlaylist.name}`);

      // Get tracks from first playlist
      const tracks = await getPlaylistTracks(sourcePlaylist.id);
      if (!tracks.length) {
        alert("No tracks found in the first playlist!");
        return;
      }

      const firstTrack = tracks[0].track;
      console.log(
        `First track: ${firstTrack.name} by ${firstTrack.artists[0].name}`,
      );

      // Create new playlist
      const newPlaylist = await createPlaylist(
        "My New Sphuffle Playlist",
        "Created with Sphuffle app",
      );
      if (!newPlaylist) {
        alert("Failed to create playlist!");
        return;
      }

      // Add first track to new playlist
      await addTrackToPlaylist(newPlaylist.id, firstTrack.uri);

      alert(
        `Successfully created playlist "${newPlaylist.name}" with "${firstTrack.name}"!`,
      );

      // Refresh playlists
      fetchUserPlaylists(accessToken, userProfile.id);
    } catch (error) {
      console.error("Error in playlist creation process:", error);
      alert("Error creating playlist. Check console for details.");
    } finally {
      setIsCreating(false);
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUserProfile(null);
    setPlaylists([]);
  };

  if (!accessToken) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>🎵 Sphuffle</h1>
          <p>Create playlists from your existing Spotify music!</p>
          <button onClick={authenticateSpotify} className="auth-button">
            Connect with Spotify
          </button>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Sphuffle</h1>
        {userProfile && (
          <div className="user-info">
            <p>Welcome, {userProfile.display_name}!</p>
            <p>Found {playlists.length} playlists</p>
          </div>
        )}

        <div className="actions">
          <button
            onClick={createPlaylistWithFirstSong}
            disabled={isCreating}
            className="create-button"
          >
            {isCreating ? "Creating..." : "Create Playlist from First Song"}
          </button>

          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>

        {playlists.length > 0 && (
          <div className="playlist-info">
            <p>
              Will use first song from: <strong>{playlists[0].name}</strong>
            </p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
