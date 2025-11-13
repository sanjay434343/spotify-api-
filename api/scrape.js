import fetch from "node-fetch";

export default async function handler(req, res) {
  // ---- CORS FIX ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // -------------------

  const playlistId = req.query.playlist;

  if (!playlistId) {
    return res.status(400).json({ error: "Playlist ID is required" });
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Missing CLIENT_ID or CLIENT_SECRET" });
  }

  // Get Spotify API token
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization":
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  if (!token) {
    return res.status(500).json({ error: "Failed to create token", details: tokenData });
  }

  // Fetch playlist tracks
  const playlistRes = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const playlistData = await playlistRes.json();

  if (playlistData.error) {
    return res.status(500).json({ error: playlistData.error });
  }

  const tracks = playlistData.items.map((item) => ({
    title: item.track.name,
    artists: item.track.artists.map((a) => a.name).join(", "),
    album: item.track.album.name,
    image: item.track.album.images[0]?.url,
    preview: item.track.preview_url,
  }));

  return res.status(200).json({ total: tracks.length, tracks });
}
