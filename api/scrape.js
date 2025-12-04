import fetch from "node-fetch";

export default async function handler(req, res) {
  // ---- CORS FIX ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const playlistId = req.query.playlist;

  if (!playlistId) {
    return res.status(400).json({ error: "Playlist ID is required" });
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Missing CLIENT_ID or CLIENT_SECRET" });
  }

  // Helper: Retry wrapper
  async function fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (res.ok) return res;
      } catch (e) {}
      if (i === retries - 1) throw new Error("API failed after retries");
    }
  }

  // Get Spotify API token
  const tokenRes = await fetchWithRetry(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        "Authorization":
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    }
  );

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  if (!token) {
    return res.status(500).json({ error: "Failed to create token", details: tokenData });
  }

  // ---- Fetch all playlist tracks with paging ----
  let tracks = [];
  let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

  while (nextUrl) {
    const pageRes = await fetchWithRetry(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const pageData = await pageRes.json();

    if (!pageData.items) break;

    const cleaned = pageData.items
      .filter((i) => i && i.track)
      .map((item) => ({
        title: item.track.name,
        artists: item.track.artists.map((a) => a.name).join(", "),
        album: item.track.album.name,
        image: item.track.album.images[0]?.url || null,
        preview: item.track.preview_url || null,
      }));

    tracks.push(...cleaned);

    nextUrl = pageData.next; // Spotify gives full URL for next page
  }

  return res.status(200).json({
    total: tracks.length,
    tracks,
  });
}
