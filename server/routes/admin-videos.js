const express = require("express")
const router = express.Router()
const { adminAuth } = require("../middleware/auth")
const VideoCourse = require("../models/VideoCourse")
const VideoTopic = require("../models/VideoTopic")
const Video = require("../models/Video")
const youtubeService = require('../utils/youtubeService');
// Get all courses with topics and videos (for admin)
router.get("/courses", adminAuth, async (req, res) => {
  try {
    const courses = await VideoCourse.find()
      .populate({
        path: "topics",
        populate: {
          path: "videos",
          select: "title description url createdAt",
        },
      })
      .sort({ createdAt: 1 })

    res.json(courses)
  } catch (error) {
    console.error("Error fetching video courses:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create new course
router.post("/courses", adminAuth, async (req, res) => {
  try {
    const { title, description } = req.body

    const course = new VideoCourse({
      title,
      description,
    })

    await course.save()
    res.status(201).json(course)
  } catch (error) {
    console.error("Error creating video course:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update course
// routes/admin/videos.js

// Update course
router.put("/courses/:courseId", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params
    const { title, description, isVisible } = req.body
    const course = await VideoCourse.findByIdAndUpdate(
      courseId, 
      { title, description, isVisible }, 
      { new: true }
    )
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }
    res.json(course)
  } catch (error) {
    console.error("Error updating video course:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Toggle course visibility
router.put("/courses/:courseId/visibility", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params
    const course = await VideoCourse.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }
    
    course.isVisible = !course.isVisible
    await course.save()
    
    res.json({ 
      message: `Course ${course.isVisible ? 'shown' : 'hidden'} successfully`,
      isVisible: course.isVisible
    })
  } catch (error) {
    console.error("Error toggling course visibility:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete course
router.delete("/courses/:courseId", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params

    // Delete all videos in topics of this course
    const topics = await VideoTopic.find({ course: courseId })
    for (const topic of topics) {
      await Video.deleteMany({ topic: topic._id })
    }

    // Delete all topics of this course
    await VideoTopic.deleteMany({ course: courseId })

    // Delete the course
    await VideoCourse.findByIdAndDelete(courseId)

    res.json({ message: "Course deleted successfully" })
  } catch (error) {
    console.error("Error deleting video course:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create new topic
router.post("/courses/:courseId/topics", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params
    const { title, description } = req.body

    const topic = new VideoTopic({
      title,
      description,
      course: courseId,
    })

    await topic.save()

    // Add topic to course
    await VideoCourse.findByIdAndUpdate(courseId, { $push: { topics: topic._id } })

    res.status(201).json(topic)
  } catch (error) {
    console.error("Error creating video topic:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update topic
router.put("/topics/:topicId", adminAuth, async (req, res) => {
  try {
    const { topicId } = req.params
    const { title, description } = req.body

    const topic = await VideoTopic.findByIdAndUpdate(topicId, { title, description }, { new: true })

    if (!topic) {
      return res.status(404).json({ message: "Topic not found" })
    }

    res.json(topic)
  } catch (error) {
    console.error("Error updating video topic:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete topic
router.delete("/topics/:topicId", adminAuth, async (req, res) => {
  try {
    const { topicId } = req.params

    const topic = await VideoTopic.findById(topicId)
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" })
    }

    // Delete all videos in this topic
    await Video.deleteMany({ topic: topicId })

    // Remove topic from course
    await VideoCourse.findByIdAndUpdate(topic.course, { $pull: { topics: topicId } })

    // Delete the topic
    await VideoTopic.findByIdAndDelete(topicId)

    res.json({ message: "Topic deleted successfully" })
  } catch (error) {
    console.error("Error deleting video topic:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create new video
router.post("/topics/:topicId/videos", adminAuth, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title, description, url } = req.body;
    const topic = await VideoTopic.findById(topicId);
    
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    // Extract YouTube video ID
    const getYouTubeVideoId = (url) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? match[2] : null;
    };

    const videoId = getYouTubeVideoId(url);
    if (!videoId) {
      return res.status(400).json({ message: "Invalid YouTube URL" });
    }

    // Fetch video metadata from YouTube
    let metadata;
    try {
      metadata = await youtubeService.getVideoMetadata(videoId);
    } catch (error) {
      return res.status(400).json({ message: "Failed to fetch video metadata from YouTube" });
    }

    const video = new Video({
      title: title || metadata.title,
      description: description || metadata.description,
      url,
      duration: metadata.duration,
      views: metadata.views,
      likes: metadata.likes,
      topic: topicId,
      course: topic.course,
      lastMetadataUpdate: new Date(),
    });

    await video.save();
    
    // Add video to topic and update count
    await VideoTopic.findByIdAndUpdate(topicId, {
      $push: { videos: video._id },
      $inc: { videoCount: 1 },
    });

    res.status(201).json(video);
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update video
router.put("/:videoId", adminAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, description, url } = req.body;
    
    // If URL is changed, fetch new metadata
    let metadata = {};
    if (url) {
      const getYouTubeVideoId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
      };

      const videoId = getYouTubeVideoId(url);
      if (!videoId) {
        return res.status(400).json({ message: "Invalid YouTube URL" });
      }

      try {
        metadata = await youtubeService.getVideoMetadata(videoId);
      } catch (error) {
        return res.status(400).json({ message: "Failed to fetch video metadata from YouTube" });
      }
    }

    const updateData = {
      title: title || metadata.title,
      description: description || metadata.description,
      url,
      duration: metadata.duration,
      views: metadata.views,
      likes: metadata.likes,
      lastMetadataUpdate: new Date(),
    };

    const video = await Video.findByIdAndUpdate(videoId, updateData, { new: true });
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.json(video);
  } catch (error) {
    console.error("Error updating video:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete video
router.delete("/:videoId", adminAuth, async (req, res) => {
  try {
    const { videoId } = req.params

    const video = await Video.findById(videoId)
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    // Remove video from topic and update count
    await VideoTopic.findByIdAndUpdate(video.topic, {
      $pull: { videos: videoId },
      $inc: { videoCount: -1 },
    })

    // Delete the video
    await Video.findByIdAndDelete(videoId)

    res.json({ message: "Video deleted successfully" })
  } catch (error) {
    console.error("Error deleting video:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// routes/admin/videos.js
// Refresh video metadata
router.post("/:videoId/refresh-metadata", adminAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Extract YouTube video ID
    const getYouTubeVideoId = (url) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? match[2] : null;
    };

    const videoIdFromUrl = getYouTubeVideoId(video.url);
    if (!videoIdFromUrl) {
      return res.status(400).json({ message: "Invalid YouTube URL" });
    }

    // Fetch video metadata from YouTube
    const metadata = await youtubeService.getVideoMetadata(videoIdFromUrl);
    
    // Update video with new metadata
    await Video.findByIdAndUpdate(videoId, {
      title: metadata.title,
      description: metadata.description,
      duration: metadata.duration,
      views: metadata.views,
      likes: metadata.likes,
      lastMetadataUpdate: new Date(),
    });

    res.json({ message: "Video metadata refreshed successfully" });
  } catch (error) {
    console.error("Error refreshing video metadata:", error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router
