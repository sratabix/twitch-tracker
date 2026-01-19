const store = require("./store");

const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const GQL_URL = "https://gql.twitch.tv/gql";

// State management
let rssHistory = [];
let activeStreams = new Map(); // Map<channelName, { id, startTime }>

async function checkChannel(channelName) {
  // requesting stream title and createdAt
  const query = `query { user(login: "${channelName}") { stream { id title createdAt } } }`;

  try {
    const response = await fetch(GQL_URL, {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      // console.error(`Failed to fetch ${channelName}: ${response.statusText}`);
      return null;
    }

    const json = await response.json();
    if (json.errors) {
      // console.error(`GQL errors for ${channelName}:`, json.errors);
      return null;
    }

    // Check if stream is active (id is not null)
    const stream = json.data?.user?.stream;

    if (stream && stream.id) {
      return {
        name: channelName,
        id: stream.id,
        title: stream.title || "No Title",
        startTime: stream.createdAt,
        link: `https://www.twitch.tv/${channelName}`,
        isLive: true,
      };
    }

    return { name: channelName, isLive: false };
  } catch (error) {
    console.error(`Error checking ${channelName}:`, error);
    return null;
  }
}

async function updateFeeds() {
  const channels = store.getChannels();
  const now = new Date();

  // Parallel fetch
  const results = await Promise.all(channels.map(checkChannel));

  results.forEach((status) => {
    if (!status) return; // Fetch failed

    const lastSession = activeStreams.get(status.name);

    if (status.isLive) {
      // It is live now. Was it live before?
      // We check if the stream ID changed to detect a new stream session

      if (!lastSession || lastSession.id !== status.id) {
        // NEW STREAM DETECTED
        // Use Twitch's createdAt if available, else fallback to now
        const startTime = status.startTime ? new Date(status.startTime) : now;

        activeStreams.set(status.name, { id: status.id, startTime });

        console.log(`[${now.toISOString()}] ${status.name} went live`);

        const item = {
          title: `LIVE: ${status.name} - ${status.title}`,
          channel: status.name,
          guid: `twitch:${status.name}:${status.id}`,
          link: status.link,
          description: `<p><strong>${status.name}</strong> is live playing: ${status.title}</p>`,
          pubDate: startTime.toUTCString(),
        };

        // Add to history
        rssHistory.unshift(item);
      }
    } else {
      // Not live
      if (lastSession) {
        // WENT OFFLINE
        const durationMs = now - lastSession.startTime;
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        const durationStr = `${hours}h ${minutes}m`;

        console.log(
          `[${now.toISOString()}] ${status.name} went offline (Duration: ${durationStr})`,
        );

        const item = {
          title: `OFFLINE: ${status.name} (Streamed for ${durationStr})`,
          channel: status.name,
          guid: `twitch:${status.name}:offline:${now.getTime()}`,
          link: `https://www.twitch.tv/${status.name}`,
          description: `<p>${status.name} has gone offline.</p><p>Total stream duration: ${durationStr}</p>`,
          pubDate: now.toUTCString(),
        };

        rssHistory.unshift(item);

        activeStreams.delete(status.name);
      }
    }
  });

  // Keep history manageable (last 50 items)
  if (rssHistory.length > 50) {
    rssHistory = rssHistory.slice(0, 50);
  }
}

function startTracking(intervalMinutes = 2) {
  console.log(
    `Starting Twitch tracker (poll every ${intervalMinutes} mins)...`,
  );
  updateFeeds(); // Initial check
  setInterval(updateFeeds, intervalMinutes * 60 * 1000);
}

function generateRSS(selfLink) {
  // Return the XML based on memory history
  const now = new Date().toUTCString();
  const atomLink = selfLink
    ? `\n  <atom:link href="${selfLink}" rel="self" type="application/rss+xml" />`
    : "";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Twitch Live Status</title>
  <link>https://www.twitch.tv/</link>
  <description>Live status feed for tracked Twitch channels</description>${atomLink}
  <lastBuildDate>${now}</lastBuildDate>
  <language>en-US</language>
`;

  rssHistory.forEach((item) => {
    // Escaping
    const safeTitle = item.title
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    xml += `
  <item>
    <title>${safeTitle}</title>
    <guid isPermaLink="false">${item.guid}</guid>
    <link>${item.link}</link>
    <description><![CDATA[${item.description}]]></description>
    <pubDate>${item.pubDate}</pubDate>
  </item>`;
  });

  xml += `
</channel>
</rss>`;

  return xml;
}

module.exports = { generateRSS, startTracking, updateFeeds };
