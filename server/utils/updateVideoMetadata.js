    const cron = require('node-cron');
const Video = require('../models/Video');
const youtubeService = require('./youtubeService');

// Run every day at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('Starting video metadata update job...');
  
  try {
    // Only update videos that haven't been updated in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const videos = await Video.find({
      lastMetadataUpdate: { $lt: oneDayAgo }
    });
    
    for (const video of videos) {
      try {
        // Extract YouTube video ID
        const getYouTubeVideoId = (url) => {
          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
          const match = url.match(regExp);
          return match && match[2].length === 11 ? match[2] : null;
        };

        const videoId = getYouTubeVideoId(video.url);
        if (!videoId) continue;

        const metadata = await youtubeService.getVideoMetadata(videoId);
        
        await Video.findByIdAndUpdate(video._id, {
          title: metadata.title,
          description: metadata.description,
          duration: metadata.duration,
          views: metadata.views,
          likes: metadata.likes,
          lastMetadataUpdate: new Date(),
        });
        
        console.log(`Updated metadata for video: ${video.title}`);
      } catch (error) {
        console.error(`Failed to update metadata for video ${video._id}:`, error.message);
      }
    }
    
    console.log('Video metadata update job completed');
  } catch (error) {
    console.error('Error in video metadata update job:', error);
  }
});

console.log('Video metadata update job scheduled');