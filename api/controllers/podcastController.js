const axios = require('axios');
const cheerio = require('cheerio');

// Cache duration for HTTP headers (in seconds)
const CACHE_DURATION_SECONDS = 10 * 60; // 10 minutes

const getAllChannels = async (req, res) => {
  try {
    const channels = require('../data/channels.json');
    
    // Set cache headers for browser and CDN
    res.set({
      'Cache-Control': `public, max-age=${CACHE_DURATION_SECONDS}, s-maxage=${CACHE_DURATION_SECONDS}`,
      'ETag': `"channels-${Date.now()}"`, // Simple ETag
      'Vary': 'Accept-Encoding'
    });

    // Execute all requests in parallel instead of sequentially - this is the main optimization!
    const channelPromises = channels.map(async (channel) => {
      try {
        const { data } = await axios.get(`${channel.channelUrl}/playlists`, {
          timeout: 10000, // 10 seconds timeout to avoid long waits
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(data);

        const name = $('meta[property="og:title"]').attr('content');
        const description = $('meta[property="og:description"]').attr('content');
        const thumbnail = $('meta[property="og:image"]').attr('content');
        const channelId = $('meta[itemprop="identifier"]').attr('content');
        const channelUrl = `https://www.youtube.com/channel/${channelId}`;

        return {
          id: channelId,
          name: name,
          description: description,
          thumbnail: thumbnail,
          channelUrl: channelUrl
        };
      } catch (error) {
        console.error(`Failed to scrape channel: ${channel.channelUrl}`, error.message);
        // Return null for failed channels, we'll filter them later
        return null;
      }
    });

    // Execute all promises together and wait for results - here's the magic!
    const results = await Promise.all(channelPromises);
    
    // Filter null results (failed channels)
    const channelDetails = results.filter(channel => channel !== null);

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

    // Set cache headers
    res.set({
      'Cache-Control': `public, max-age=${CACHE_DURATION_SECONDS}, s-maxage=${CACHE_DURATION_SECONDS}`,
      'ETag': `"playlists-${channelId}-${Date.now()}"`,
      'Vary': 'Accept-Encoding'
    });

    const channelUrl = `https://www.youtube.com/channel/${channelId}/playlists`;
    const { data: html } = await axios.get(channelUrl, {
      timeout: 15000, // 15 seconds for channels because content is larger
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(html);
    const channelTitle = $('meta[property="og:title"]').attr('content') || '';

    let ytInitialData;
    $('script').each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && scriptContent.trim().startsWith('var ytInitialData =')) {
        const jsonDataStr = scriptContent.split(';')[0].replace('var ytInitialData =', '').trim();
        try {
          ytInitialData = JSON.parse(jsonDataStr);
          return false; // Exit loop once found
        } catch (e) {
          console.error('Failed to parse ytInitialData', e);
        }
      }
    });

    if (!ytInitialData) {
      return res.status(500).json({ error: 'Could not find or parse ytInitialData.' });
    }

    const tabs = ytInitialData.contents?.twoColumnBrowseResultsRenderer?.tabs;
    const selectedTab = tabs?.find(tab => tab.tabRenderer?.selected);
    const contents = selectedTab?.tabRenderer?.content?.sectionListRenderer?.contents;

    if (!contents) {
      return res.json([]);
    }

    let playlistItems = [];
    for (const section of contents) {
      const sectionContents = section.itemSectionRenderer?.contents;
      if (!sectionContents) continue;

      for (const content of sectionContents) {
        if (content.gridRenderer?.items) {
          playlistItems = playlistItems.concat(content.gridRenderer.items);
        } else if (content.shelfRenderer?.content?.horizontalListRenderer?.items) {
          playlistItems = playlistItems.concat(content.shelfRenderer.content.horizontalListRenderer.items);
        }
      }
    }

    const formattedPlaylists = playlistItems.map(item => {
      // Handle gridPlaylistRenderer structure
      const playlistData = item.gridPlaylistRenderer;
      if (playlistData) {
        return {
          id: playlistData.playlistId,
          title: playlistData.title?.simpleText || playlistData.title?.runs?.[0]?.text,
          description: '',
          thumbnail: playlistData.thumbnail?.thumbnails?.pop()?.url,
          itemCount: parseInt(playlistData.videoCountText?.runs?.[0]?.text) || 0,
          channelTitle: channelTitle,
        };
      }

      // Handle lockupViewModel structure (from user's example)
      const lockup = item.lockupViewModel;
      if (lockup) {
        const overlayText = lockup.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.overlays?.[0]?.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]?.thumbnailBadgeViewModel?.text;
        const itemCount = overlayText ? parseInt(overlayText) : 0;
        
        return {
           id: lockup.contentId,
           title: lockup.metadata?.lockupMetadataViewModel?.title?.content,
           description: '',
           thumbnail: lockup.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.[0]?.url,
           itemCount: itemCount,
           channelTitle: channelTitle,
       };
      }
      return null;
    }).filter(Boolean);

    res.json(formattedPlaylists);
  } catch (error) {
    console.error(`Error in getPlaylistsByChannelId for channel ${req.params.channelId}:`, error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const getVideosByPlaylistId = async (req, res) => {
  try {
    const { playlistId } = req.params;
    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }

    // Set cache headers
    res.set({
      'Cache-Control': `public, max-age=${CACHE_DURATION_SECONDS}, s-maxage=${CACHE_DURATION_SECONDS}`,
      'ETag': `"videos-${playlistId}-${Date.now()}"`,
      'Vary': 'Accept-Encoding'
    });

    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    const { data: html } = await axios.get(playlistUrl, {
      timeout: 12000, // 12 seconds for playlists
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    const $ = cheerio.load(html);

    let ytInitialData;
    $('script').each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && scriptContent.trim().startsWith('var ytInitialData =')) {
        const jsonDataStr = scriptContent.split(';')[0].replace('var ytInitialData =', '').trim();
        try {
          ytInitialData = JSON.parse(jsonDataStr);
          return false; // Exit loop once found
        } catch (e) {
          console.error('Failed to parse ytInitialData', e);
        }
      }
    });

    if (!ytInitialData) {
      return res.status(500).json({ error: 'Could not find or parse ytInitialData.' });
    }

    const videoItems = ytInitialData.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;

    if (!videoItems) {
      return res.json([]);
    }

    const formattedVideos = videoItems.map(item => {
      const videoData = item.playlistVideoRenderer;
      if (!videoData) return null;
      
      return {
        id: videoData.videoId,
        title: videoData.title?.runs?.[0]?.text || videoData.title?.simpleText,
        description: '', // Description is not available in this data structure
        thumbnail: videoData.thumbnail?.thumbnails?.pop()?.url,
        publishedAt: videoData.videoInfo?.runs?.[2]?.text || '', // This will be like "7 months ago"
      };
    }).filter(Boolean);

    res.json(formattedVideos);
  } catch (error) {
    console.error(`Error in getVideosByPlaylistId for playlist ${req.params.playlistId}:`, error.message);
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
