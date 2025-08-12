const axios = require('axios');
const cheerio = require('cheerio');
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
      try {
        const { data } = await axios.get(`${channel.channelUrl}/playlists`);
        const $ = cheerio.load(data);

        const name = $('meta[property="og:title"]').attr('content');
        const description = $('meta[property="og:description"]').attr('content');
        const thumbnail = $('meta[property="og:image"]').attr('content');
        const channelId = $('meta[itemprop="identifier"]').attr('content');
        const channelUrl = `https://www.youtube.com/channel/${channelId}`


        channelDetails.push({
          id: channelId,
          name: name,
          description: description,
          thumbnail: thumbnail,
          channelUrl: channelUrl
        });
      } catch (error) {
        console.error(`Failed to scrape channel: ${channel.channelUrl}`, error);
        // Skip this channel and continue with the next one
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
