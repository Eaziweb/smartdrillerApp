const mongoose = require("mongoose")
const materialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    // Cloudinary fields
    cloudinaryUrl: {
      type: String,
      required: true,
      trim: true
    },
  cloudinaryPublicId: {
    type: String,
    required: true,
    trim: true,
    get: function(publicId) {
      return publicId ? `materials/${publicId}` : publicId;
    }
  },
    cloudinaryResourceType: {
      type: String,
      required: true,
      enum: ['image', 'raw', 'video', 'auto'],
      default: 'raw'
    },
    // Original file information
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ['pdf', 'docx', 'ppt']
    },
    // Relationships
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    // Stats and status
    downloadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    // Additional metadata
    tags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for file URL
materialSchema.virtual('fileUrl').get(function() {
  if (!this.cloudinaryUrl) return null;
  
  // Add transformations based on file type
  if (this.fileType === 'pdf') {
    return `${this.cloudinaryUrl}?fl_attachment=true`;
  }
  return this.cloudinaryUrl;
});

// Virtual for formatted file size
materialSchema.virtual('formattedFileSize').get(function() {
  if (this.fileSize < 1024) return `${this.fileSize} bytes`;
  if (this.fileSize < 1024 * 1024) return `${(this.fileSize / 1024).toFixed(1)} KB`;
  return `${(this.fileSize / (1024 * 1024)).toFixed(1)} MB`;
});

// Virtual for file icon class
materialSchema.virtual('fileIcon').get(function() {
  const iconMap = {
    pdf: 'fa-file-pdf',
    docx: 'fa-file-word',
    ppt: 'fa-file-powerpoint'
  };
  return iconMap[this.fileType] || 'fa-file';
});

// Indexes for performance
materialSchema.index({ course: 1, isApproved: 1 });
materialSchema.index({ uploadedBy: 1 });
materialSchema.index({ fileType: 1 });
materialSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure consistent data
materialSchema.pre('save', function(next) {
  // Ensure fileType is lowercase
  if (this.fileType) {
    this.fileType = this.fileType.toLowerCase();
  }
  
  // Trim rejection reason
  if (this.rejectionReason) {
    this.rejectionReason = this.rejectionReason.trim();
  }
  
  next();
});

module.exports = mongoose.model("Material", materialSchema);