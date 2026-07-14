/**
 * cloudinary.js — Cloudinary configuration and upload helpers
 *
 * Files are stored permanently on Cloudinary (free tier: 25GB).
 * This replaces local disk storage for project files, previews, and avatars.
 */

const cloudinary        = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer            = require('multer');

// ── Configure Cloudinary ───────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ── Storage factories ──────────────────────────────────────────────────────────

/**
 * Create a CloudinaryStorage engine for a given folder.
 * Files are stored as 'raw' (original format, not image-processed).
 */
function makeCloudinaryStorage(folder, allowedFormats = null) {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder:           `nagoweb/${folder}`,
      resource_type:    'raw',         // preserve original file format
      allowed_formats:  allowedFormats || undefined,
      use_filename:     true,
      unique_filename:  true,
    },
  });
}

/**
 * Image storage — Cloudinary handles image optimization.
 */
function makeCloudinaryImageStorage(folder) {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder:        `nagoweb/${folder}`,
      resource_type: 'image',
      allowed_formats: ['jpg','jpeg','png','webp','svg'],
      use_filename:  true,
      unique_filename: true,
    },
  });
}

// ── Multer instances ───────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10) * 1024 * 1024;

/** Project source files (.pkt, .zip, .gns3) */
const uploadProjectFileCloud = multer({
  storage: makeCloudinaryStorage('projects/source'),
  limits:  { fileSize: MAX_SIZE_BYTES },
}).single('file');

/** Project preview images */
const uploadPreviewImageCloud = multer({
  storage: makeCloudinaryImageStorage('projects/previews'),
  limits:  { fileSize: 5 * 1024 * 1024 },
}).single('file');

/** Avatar images */
const uploadAvatarCloud = multer({
  storage: makeCloudinaryImageStorage('avatars'),
  limits:  { fileSize: 2 * 1024 * 1024 },
}).single('avatar');

/** Payment proof screenshots */
const uploadPaymentProofCloud = multer({
  storage: makeCloudinaryImageStorage('payment_proofs'),
  limits:  { fileSize: 10 * 1024 * 1024 },
}).single('screenshot');

/** Book cover images */
const uploadBookCoverCloud = multer({
  storage: makeCloudinaryImageStorage('books/covers'),
  limits:  { fileSize: 5 * 1024 * 1024 },
}).single('cover');

/** Book PDF files */
const uploadBookPdfCloud = multer({
  storage: makeCloudinaryStorage('books/pdfs', ['pdf']),
  limits:  { fileSize: MAX_SIZE_BYTES },
}).single('pdf');

// ── Delete a file from Cloudinary ─────────────────────────────────────────────

async function deleteFromCloudinary(publicId, resourceType = 'raw') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('[Cloudinary] Delete failed:', err.message);
  }
}

/**
 * Extract the Cloudinary public_id from a stored URL or path.
 * Cloudinary URLs look like:
 *   https://res.cloudinary.com/cloud/raw/upload/v1234/nagoweb/projects/source/uuid.pkt
 * public_id = nagoweb/projects/source/uuid  (without extension)
 */
function getPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl) return null;
  try {
    const url  = new URL(cloudinaryUrl);
    const path = url.pathname; // /cloud/raw/upload/v1234/nagoweb/...
    // Remove /cloud/resource_type/upload/vXXXX/ prefix
    const match = path.match(/\/upload\/v\d+\/(.+)$/);
    if (match) {
      // Remove file extension
      return match[1].replace(/\.[^.]+$/, '');
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = {
  cloudinary,
  uploadProjectFileCloud,
  uploadPreviewImageCloud,
  uploadAvatarCloud,
  uploadPaymentProofCloud,
  uploadBookCoverCloud,
  uploadBookPdfCloud,
  deleteFromCloudinary,
  getPublicId,
};
