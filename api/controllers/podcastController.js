const axios = require('axios');
const cheerio = require('cheerio');

// Cache duration for HTTP headers (in seconds)
const CACHE_DURATION_SECONDS = 10 * 60; // 10 minutes

// Function to fetch download links for a video from ssyoutube.online
const fetchVideoDownloadLinks = async (videoId) => {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ssyoutubeUrl = "https://ssyoutube.online/yt-video-detail/";
    
    const headers = {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en-GB;q=0.9,en;q=0.8,ar-EG;q=0.7,ar;q=0.6",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      "dnt": "1",
      "origin": "https://ssyoutube.online",
      "priority": "u=0, i",
      "referer": "https://ssyoutube.online/en1/",
      "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    };

    const formData = new URLSearchParams();
    formData.append('videoURL', videoUrl);

    const response = await axios.post(ssyoutubeUrl, formData.toString(), {
      headers,
      timeout: 15000 // 15 seconds timeout
    });

    const $ = cheerio.load(response.data);
    const downloads = [];

    // Extract download links from table rows
    let tableRowSelector = 'tbody tr';
    if ($('tbody tr').length === 0) {
      tableRowSelector = 'tr'; // Fallback if no tbody
    }
    
    $(tableRowSelector).each((index, row) => {
      const $row = $(row);
      const $button = $row.find('button[data-url]');
      
      if ($button.length > 0) {
        const url = $button.attr('data-url');
        const quality = $button.attr('data-quality') || $row.find('td:first-child').text().trim().split('\n')[0].trim();
        const hasAudio = $button.attr('data-has-audio') || 'N/A';
        const size = $row.find('td:nth-child(2)').text().trim();
        
        // Check if it's audio by looking for text indicators or file type
        const firstCell = $row.find('td:first-child').text().trim();
        const hasVideoQuality = /\d+p/i.test(firstCell); // Check for 720p, 1080p, etc.
        const hasAudioFormat = /m4a|mp3|aac|audio/i.test(firstCell);
        const hasDataHasAudioFalse = hasAudio === 'false';
        
        // It's audio if: has audio format OR (no video quality AND not explicitly marked as no audio)
        const isAudio = hasAudioFormat || (!hasVideoQuality && !hasDataHasAudioFalse);
        
        const downloadItem = {
          url: url,
          quality: quality,
          hasAudio: isAudio ? 'true' : hasAudio,
          size: size,
          type: isAudio ? 'audio' : 'video'
        };
        
        downloads.push(downloadItem);
      }
    });
    
    // Fallback: if no downloads found in tables, try original button selector
    if (downloads.length === 0) {
      $('button[data-url]').each((index, element) => {
        const button = $(element);
        downloads.push({
          url: button.attr('data-url'),
          quality: button.attr('data-quality') || 'N/A',
          hasAudio: button.attr('data-has-audio') || 'N/A',
          size: 'N/A',
          type: 'unknown'
        });
      });
    }

    // Organize downloads by type
    const audioLinks = downloads.filter(download => download.type === 'audio');
    const videoLinks = downloads.filter(download => download.type === 'video');

    return {
      success: true,
      audioLinks,
      videoLinks,
      allDownloads: downloads
    };

  } catch (error) {
    console.error(`Error fetching download links for video ${videoId}:`, error.message);
    return {
      success: false,
      error: error.message,
      audioLinks: [],
      videoLinks: [],
      allDownloads: []
    };
  }
};

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

    // Format basic video data first
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

    // Check if user wants download links
    const includeDownloads = req.query.includeDownloads === 'true';
    
    if (includeDownloads && formattedVideos.length > 0) {
      // Fetch download links for all videos in parallel - keeping it fast!
      const downloadPromises = formattedVideos.map(async (video) => {
        const downloadData = await fetchVideoDownloadLinks(video.id);
        return {
          ...video,
          downloads: {
            success: downloadData.success,
            audioLinks: downloadData.audioLinks,
            videoLinks: downloadData.videoLinks,
            error: downloadData.error || null
          }
        };
      });

      // Wait for all download requests to complete
      const videosWithDownloads = await Promise.all(downloadPromises);
      res.json(videosWithDownloads);
    } else {
      res.json(formattedVideos);
    }
  } catch (error) {
    console.error(`Error in getVideosByPlaylistId for playlist ${req.params.playlistId}:`, error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Endpoint to get download links for a single video
const getVideoDownloadLinks = async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Set cache headers for download links (shorter cache time as links may expire)
    res.set({
      'Cache-Control': `public, max-age=1800, s-maxage=1800`, // 30 minutes
      'ETag': `"downloads-${videoId}-${Date.now()}"`,
      'Vary': 'Accept-Encoding'
    });

    const downloadData = await fetchVideoDownloadLinks(videoId);
    
    const response = {
      videoId,
      success: downloadData.success,
      audioLinks: downloadData.audioLinks,
      videoLinks: downloadData.videoLinks,
      totalLinks: downloadData.allDownloads.length,
      error: downloadData.error || null,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error(`Error in getVideoDownloadLinks for video ${req.params.videoId}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to fetch download links',
      videoId: req.params.videoId,
      success: false 
    });
  }
};

const getAllPodcasts = (req, res) => {
  res.json(podcasts);
};

module.exports = {
  getAllChannels,
  getPlaylistsByChannelId,
  getVideosByPlaylistId,
  getVideoDownloadLinks,
};
