const { google } = require('googleapis');

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

const getAllChannels = async (req, res) => {
  try {
    const channels = require('../data/channels.json');
    const channelDetails = [];

    for (const channel of channels) {
      const match = channel.channelUrl.match(/@(.+)/);
      if (!match) continue; // Skip if URL format is invalid
      const username = match[1];

      const searchResponse = await youtube.search.list({
        part: 'snippet',
        q: username,
        type: 'channel',
        maxResults: 1,
      });

      if (searchResponse.data.items.length > 0) {
        const item = searchResponse.data.items[0];
        channelDetails.push({
          id: item.snippet.channelId,
          name: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high.url,
          channelUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`
        });
      }
    }

    res.json(channelDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load channel details' });
  }
};

const getPlaylistsByChannelId = async (req, res) => {
  try {
    const { channelId } = req.params;
    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }

    const playlistResponse = await youtube.playlists.list({
      part: 'snippet,contentDetails',
      channelId: channelId,
      maxResults: 50,
    });

    const formattedPlaylists = playlistResponse.data.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high.url,
      itemCount: item.contentDetails.itemCount,
      channelTitle: item.snippet.channelTitle,
    }));

    res.json(formattedPlaylists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const getVideosByPlaylistId = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const response = await youtube.playlistItems.list({
      part: 'snippet,contentDetails',
      playlistId: playlistId,
      maxResults: 50, // Adjust as needed
    });

    const formattedVideos = response.data.items.map(item => ({
      id: item.contentDetails.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));

    res.json(formattedVideos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const getAllPodcasts = (req, res) => {
  res.json(podcasts);
};

module.exports = {
  getAllChannels,
  getPlaylistsByChannelId,
  getVideosByPlaylistId,
};
