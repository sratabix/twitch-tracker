const express = require('express');
const router = express.Router();
const store = require('./store');
const tracker = require('./tracker');

// RSS Feed
const rssPath = process.env.RSS_PATH || '/rss';
router.get(rssPath, async (req, res) => {
  try {
    const xml = await tracker.generateRSS();
    res.set('Content-Type', 'application/rss+xml');
    res.send(xml);
  } catch (error) {
    console.error("RSS Error:", error);
    res.status(500).send("Error generating RSS feed");
  }
});

// Channels API
router.get('/api/channels', (req, res) => {
  res.json(store.getChannels());
});

router.post('/api/channels', (req, res) => {
  const { channel } = req.body;
  if(channel && typeof channel === 'string') {
      store.addChannel(channel);
      // Check for updates immediately so the new channel appears in RSS if live
      tracker.updateFeeds();
      res.json({ success: true, channels: store.getChannels() });
  } else {
      res.status(400).json({ error: "Invalid channel name" });
  }
});

router.delete('/api/channels/:name', (req, res) => {
  const name = req.params.name;
  store.removeChannel(name);
  res.json({ success: true, channels: store.getChannels() });
});

module.exports = router;
