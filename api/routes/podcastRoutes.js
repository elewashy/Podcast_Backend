const express = require('express');
const router = express.Router();
const podcastController = require('../controllers/podcastController');

router.get('/channels', podcastController.getAllChannels);
router.get('/channels/:channelId/playlists', podcastController.getPlaylistsByChannelId);
router.get('/playlists/:playlistId/videos', podcastController.getVideosByPlaylistId);

module.exports = router;
