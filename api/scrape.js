import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// load from .env
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

async function getToken() {
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await res.json();

  if (data.error) {
    console.log("TOKEN ERROR:", data);
  }

  return data.access_token;
}

async function getPlaylistTracks(playlistId) {
  const token = await getToken();

  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`,
    {
      headers: { "Authorization": `Bearer ${token}` }
    }
  );

  const data = await res.json();

  if (data.error) {
    console.log("SPOTIFY ERROR:", data);
    return [];
  }

  return data.items.map(item => {
    const t = item.track;
    return {
      title: t.name,
      artists: t.artists.map(a => a.name).join(", "),
      album: t.album.name,
      image: t.album.images[0]?.url,
      preview: t.preview_url
    };
  });
}

// ---------------------------
// RUN
// ---------------------------

const playlistUrl = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M";
// extract only the playlist ID
const playlistId = playlistUrl.split("playlist/")[1].split("?")[0];

getPlaylistTracks(playlistId).then(tracks => {
  console.log(`\nTotal Tracks: ${tracks.length}\n`);
  console.log(tracks);
});
