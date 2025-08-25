export const fetchUserProfile = async (token) => {
  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const profile = await response.json();
    return profile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

export const fetchUserPlaylists = async (token, userId) => {
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
    return data.items || [];
  } catch (error) {
    console.error("Error fetching playlists:", error);
    throw error;
  }
};

export const getPlaylistTracks = async (accessToken, playlistId) => {
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

export const createPlaylist = async (accessToken, userId, name, description = "") => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
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

export const addTracksToPlaylist = async (accessToken, playlistId, trackUris) => {
  const batchSize = 100;
  try {
    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: batch,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to add batch ${i / batchSize + 1}`);
      }
    }
    return true;
  } catch (error) {
    console.error("Error adding tracks to playlist:", error);
    return false;
  }
};

export const removeTracksFromPlaylist = async (accessToken, playlistId, trackUris) => {
  const batchSize = 100;
  try {
    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);
      const tracks = batch.map(uri => ({ uri }));
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tracks: tracks,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to remove batch ${i / batchSize + 1}`);
      }
    }
    return true;
  } catch (error) {
    console.error("Error removing tracks from playlist:", error);
    return false;
  }
};

export const createOrUpdateMegaPlaylist = async (
  accessToken, 
  userProfile, 
  playlists, 
  selectedPlaylistId, 
  syncMode
) => {
  const isUpdatingExisting = selectedPlaylistId;
  const targetPlaylistId = selectedPlaylistId;

  console.log(
    isUpdatingExisting
      ? `Updating existing playlist...`
      : `Creating new playlist from ${playlists.length} playlists...`
  );

  const sourcePlaylistsToProcess = playlists.filter(
    playlist => playlist.id !== targetPlaylistId
  );

  const allSourceTracks = [];
  const sourceTrackUris = new Set();

  for (const playlist of sourcePlaylistsToProcess) {
    const tracks = await getPlaylistTracks(accessToken, playlist.id);

    for (const item of tracks) {
      if (item.track && item.track.uri && !sourceTrackUris.has(item.track.uri)) {
        sourceTrackUris.add(item.track.uri);
        allSourceTracks.push(item.track);
      }
    }
  }

  let targetPlaylist;
  let currentTargetTracks = [];
  let currentTargetUris = new Set();

  if (isUpdatingExisting) {
    targetPlaylist = playlists.find(p => p.id === targetPlaylistId);
    if (!targetPlaylist) {
      throw new Error("Selected playlist not found!");
    }

    const currentTracks = await getPlaylistTracks(accessToken, targetPlaylistId);

    for (const item of currentTracks) {
      if (item.track && item.track.uri) {
        currentTargetUris.add(item.track.uri);
        currentTargetTracks.push(item.track);
      }
    }
  } else {
    targetPlaylist = await createPlaylist(
      accessToken,
      userProfile.id,
      "Sphuffle",
      `Combined from ${sourcePlaylistsToProcess.length} playlists - Created with Sphuffle`,
    );

    if (!targetPlaylist) {
      throw new Error("Failed to create playlist!");
    }
  }

  const tracksToAdd = Array.from(sourceTrackUris).filter(
    uri => !currentTargetUris.has(uri)
  );

  let tracksToRemove = [];
  if (syncMode && isUpdatingExisting) {
    tracksToRemove = Array.from(currentTargetUris).filter(
      uri => !sourceTrackUris.has(uri)
    );
  }

  if (tracksToRemove.length > 0) {
    const removeSuccess = await removeTracksFromPlaylist(accessToken, targetPlaylist.id, tracksToRemove);
    if (!removeSuccess) {
      console.warn("Some tracks may not have been removed");
    }
  }

  if (tracksToAdd.length > 0) {
    const addSuccess = await addTracksToPlaylist(accessToken, targetPlaylist.id, tracksToAdd);
    if (!addSuccess) {
      console.warn("Some tracks may not have been added");
    }
  }

  const totalFinalTracks = currentTargetTracks.length - tracksToRemove.length + tracksToAdd.length;

  return {
    targetPlaylist,
    tracksToAdd: tracksToAdd.length,
    tracksToRemove: tracksToRemove.length,
    totalFinalTracks,
    isUpdatingExisting,
    sourcePlaylistsCount: sourcePlaylistsToProcess.length
  };
};