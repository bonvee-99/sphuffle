import React, { useState, useEffect } from "react";
import "./App.css";
import { authenticateSpotify, handleAuthCallback } from "./utils/auth";
import {
  fetchUserProfile,
  fetchUserPlaylists,
  createOrUpdateMegaPlaylist,
} from "./utils/spotify";

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSphufflePlaylist, setSelectedSphufflePlaylist] = useState("");
  const [syncMode, setSyncMode] = useState(false);
  const [playlistFilter, setPlaylistFilter] = useState("both");

  useEffect(() => {
    const handleAuth = async () => {
      const result = await handleAuthCallback();
      if (result.accessToken) {
        setAccessToken(result.accessToken);
        handleFetchUserProfile(result.accessToken);
      }
    };

    handleAuth();
  }, []);

  useEffect(() => {
    if (accessToken && userProfile) {
      handleFetchUserPlaylists(accessToken, userProfile.id);
      setSelectedSphufflePlaylist(""); // Reset selection when filter changes
    }
  }, [playlistFilter, accessToken, userProfile]);

  const handleFetchUserProfile = async (token) => {
    try {
      const profile = await fetchUserProfile(token);
      setUserProfile(profile);
      handleFetchUserPlaylists(token, profile.id);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleFetchUserPlaylists = async (token, userId) => {
    try {
      const allPlaylists = await fetchUserPlaylists(token, userId);
      
      let filteredPlaylists;
      if (playlistFilter === "owned") {
        filteredPlaylists = allPlaylists.filter(playlist => playlist.owner.id === userId);
      } else if (playlistFilter === "followed") {
        filteredPlaylists = allPlaylists.filter(playlist => playlist.owner.id !== userId);
      } else {
        filteredPlaylists = allPlaylists; // both
      }
      
      setPlaylists(filteredPlaylists);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  };

  const createMegaPlaylist = async () => {
    if (!playlists.length) {
      alert("No playlists found!");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createOrUpdateMegaPlaylist(
        accessToken,
        userProfile,
        playlists,
        selectedSphufflePlaylist,
        syncMode
      );

      if (result.isUpdatingExisting) {
        alert(
          `Successfully updated "${result.targetPlaylist.name}"!\n` +
          `Added: ${result.tracksToAdd} tracks\n` +
          (syncMode ? `Removed: ${result.tracksToRemove} tracks\n` : '') +
          `Total tracks: ${result.totalFinalTracks}`
        );
      } else {
        alert(
          `Successfully created "${result.targetPlaylist.name}" with ${result.tracksToAdd} tracks from ${result.sourcePlaylistsCount} playlists!`
        );
      }

      handleFetchUserPlaylists(accessToken, userProfile.id);

    } catch (error) {
      console.error("Error with playlist operation:", error);
      alert(`Error with playlist operation: ${error.message}`);
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
          <div className="playlist-options">
            <div className="option-group">
              <label htmlFor="filter-select">Include playlists:</label>
              <select
                id="filter-select"
                value={playlistFilter}
                onChange={(e) => setPlaylistFilter(e.target.value)}
                className="playlist-select"
              >
                <option value="both">Owned and Followed</option>
                <option value="owned">Only Owned by Me</option>
                <option value="followed">Only Followed by Me</option>
              </select>
            </div>

            <div className="option-group">
              <label htmlFor="playlist-select">Use existing playlist:</label>
              <select
                id="playlist-select"
                value={selectedSphufflePlaylist}
                onChange={(e) => setSelectedSphufflePlaylist(e.target.value)}
                className="playlist-select"
              >
                <option value="">Create new Sphuffle playlist</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="option-group">
              <label>
                <input
                  type="checkbox"
                  checked={syncMode}
                  onChange={(e) => setSyncMode(e.target.checked)}
                />
                Sync playlist (remove tracks not in other playlists)
              </label>
            </div>
          </div>

          <button
            onClick={createMegaPlaylist}
            disabled={isCreating}
            className="create-button"
          >
            {isCreating
              ? selectedSphufflePlaylist ? "Updating Playlist..." : "Creating Playlist..."
              : selectedSphufflePlaylist ? "Update Selected Playlist" : "Create New Sphuffle Playlist"
            }
          </button>

          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>

        {playlists.length > 0 && (
          <div className="playlist-info">
            <p>
              Ready to combine <strong>{playlists.length} playlists</strong> into one mega shuffle playlist
            </p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
