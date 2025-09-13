const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos';

/**
 * Fetch video metadata from YouTube API
 * @param {string} videoId - YouTube video ID
 * @returns {Object} - Video metadata including duration, views, likes, etc.
 */
const getVideoMetadata = async (videoId) => {
  try {
    const response = await axios.get(YOUTUBE_API_URL, {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    const statistics = video.statistics;

    // Parse duration from ISO 8601 format (PT4M13S -> 4:13)
    const parseDuration = (isoDuration) => {
      const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const seconds = match[3] ? parseInt(match[3]) : 0;
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return {
      title: snippet.title,
      description: snippet.description,
      duration: parseDuration(contentDetails.duration),
      views: parseInt(statistics.viewCount) || 0,
      likes: parseInt(statistics.likeCount) || 0,
      thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url
    };
  } catch (error) {
    console.error('Error fetching YouTube video metadata:', error);
    throw error;
  }
};

module.exports = {
  getVideoMetadata
};