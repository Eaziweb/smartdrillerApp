// config/cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Add this helper function for generating URLs
cloudinary.generateDownloadUrl = (publicId, options = {}) => {
  const defaultOptions = {
    resource_type: 'raw',
    secure: true,
    sign_url: true
  };
  
  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

module.exports = cloudinary;