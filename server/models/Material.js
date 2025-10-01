const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    cloudinaryUrl: { type: String, required: true, trim: true },
    cloudinaryPublicId: { type: String, required: true, trim: true },
    // cloudinaryVersion: { type: String, required: true },

    cloudinaryResourceType: {
      type: String,
      enum: ["image", "raw", "video", "auto"],
      default: "raw",
    },
    originalName: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    fileType: {
      type: String,
      required: true,
      lowercase: true,
      enum: ["pdf", "docx", "ppt"],
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    downloadCount: { type: Number, default: 0, min: 0 },
    isApproved: { type: Boolean, default: false },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }

);

// Virtual for download URL
materialSchema.virtual("fileUrl").get(function () {
  if (!this.cloudinaryUrl) return null;
  return `${this.cloudinaryUrl}?fl_attachment=true`;
});

// Virtual for formatted file size
materialSchema.virtual("formattedFileSize").get(function () {
  if (this.fileSize < 1024) return `${this.fileSize} bytes`;
  if (this.fileSize < 1024 * 1024) return `${(this.fileSize / 1024).toFixed(1)} KB`;
  return `${(this.fileSize / (1024 * 1024)).toFixed(1)} MB`;
});

// File icon for UI
materialSchema.virtual("fileIcon").get(function () {
  const map = { pdf: "fa-file-pdf", docx: "fa-file-word", ppt: "fa-file-powerpoint" };
  return map[this.fileType] || "fa-file";
});

materialSchema.index({ course: 1, isApproved: 1 });
materialSchema.index({ uploadedBy: 1 });
materialSchema.index({ fileType: 1 });
materialSchema.index({ createdAt: -1 });

materialSchema.pre("save", function (next) {
  if (this.fileType) this.fileType = this.fileType.toLowerCase();
  if (this.rejectionReason) this.rejectionReason = this.rejectionReason.trim();
  next();
});

module.exports = mongoose.model("Material", materialSchema);
