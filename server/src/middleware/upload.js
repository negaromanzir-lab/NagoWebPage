/**
 * upload.js — Multer middleware for NagoWebPage
 *
 * File type categories:
 *   source       — ZIP, .pkt, .gns3, .yml  (the downloadable project)
 *   preview      — PNG, JPEG, WebP, SVG    (listing thumbnail)
 *   diagram      — PNG, JPEG, SVG, PDF     (topology diagrams)
 *   documentation — PDF, DOCX, TXT, MD     (implementation guides)
 *   other        — any of the above
 *
 * Storage layout:
 *   uploads/
 *     projects/source/
 *     projects/previews/
 *     projects/diagrams/
 *     projects/documentation/
 *     avatars/
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR     = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const MAX_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10) * 1024 * 1024;

// ── MIME type maps ─────────────────────────────────────────────────────────────

const MIME = {
  // Source / project files
  source: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'application/octet-stream',   // .pkt, .gns3
    'text/yaml',
    'application/x-yaml',
    'text/plain',                 // .txt configs
  ],

  // Preview / thumbnail images
  preview: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
  ],

  // Topology diagrams
  diagram: [
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'image/webp',
    'application/pdf',
  ],

  // Implementation guides / documentation
  documentation: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword',         // .doc
    'text/plain',
    'text/markdown',
    'text/x-markdown',
  ],

  // Avatar images
  avatar: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
  ],
};

// Union of all project-related MIME types (used for the legacy single-upload route)
const ALL_PROJECT_MIMES = [...new Set([
  ...MIME.source,
  ...MIME.preview,
  ...MIME.diagram,
  ...MIME.documentation,
])];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Resolve the sub-directory for a given file_type category.
 */
function subDirForType(fileType) {
  const map = {
    source:        'projects/source',
    preview:       'projects/previews',
    diagram:       'projects/diagrams',
    documentation: 'projects/documentation',
    other:         'projects/other',
  };
  return map[fileType] || 'projects/other';
}

/**
 * Infer file_type from MIME type when the client doesn't specify one.
 */
function inferFileType(mimetype) {
  if (MIME.source.includes(mimetype))        return 'source';
  if (MIME.preview.includes(mimetype))       return 'preview';
  if (MIME.documentation.includes(mimetype)) return 'documentation';
  return 'other';
}

/**
 * Build a disk-storage engine that routes files into the correct sub-directory
 * based on the `file_type` field in the request body (or inferred from MIME).
 */
function makeTypedStorage() {
  return multer.diskStorage({
    destination(req, file, cb) {
      // Prefer explicit file_type from body; fall back to MIME inference
      const fileType = req.body?.file_type || inferFileType(file.mimetype);
      const dir = ensureDir(path.join(UPLOAD_DIR, subDirForType(fileType)));
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

/**
 * Build a simple disk-storage engine for a fixed sub-directory.
 */
function makeStorage(subdir) {
  const dir = ensureDir(path.join(UPLOAD_DIR, subdir));
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename:    (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

/**
 * Build a Multer fileFilter that accepts only the given MIME types.
 */
function fileFilter(allowedTypes) {
  return (_req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        Object.assign(
          new Error(`File type "${file.mimetype}" is not allowed for this upload`),
          { status: 415 }
        ),
        false
      );
    }
  };
}

// ── Exported middleware ────────────────────────────────────────────────────────

/**
 * Payment proof screenshot upload — single image or PDF, max 10 MB.
 * Stored under uploads/payment_proofs/
 * Field name: `screenshot`
 */
const uploadPaymentProof = multer({
  storage: makeStorage('payment_proofs'),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: fileFilter([
    'image/png', 'image/jpeg', 'image/webp',
    'application/pdf',
  ]),
}).single('screenshot');

/**
 * Admin multi-type upload — single file, routed to the correct sub-directory
 * based on `file_type` in the request body.
 *
 * Accepts: source, preview, diagram, documentation files.
 * Field name: `file`
 * Max size: MAX_FILE_SIZE_MB (default 100 MB)
 */
const uploadProjectFile = multer({
  storage: makeTypedStorage(),
  limits:  { fileSize: MAX_SIZE_BYTES },
  fileFilter: fileFilter(ALL_PROJECT_MIMES),
}).single('file');

/**
 * Admin bulk upload — up to 10 files in a single request.
 * All files are routed to the correct sub-directory based on `file_type`.
 *
 * Field name: `files`
 */
const uploadProjectFiles_bulk = multer({
  storage: makeTypedStorage(),
  limits:  { fileSize: MAX_SIZE_BYTES, files: 10 },
  fileFilter: fileFilter(ALL_PROJECT_MIMES),
}).array('files', 10);

/**
 * Legacy project upload — used by the existing POST /api/projects route.
 * Keeps backward compatibility with `preview_image` + `project_file` fields.
 */
const uploadProjectFiles = multer({
  storage: makeStorage('projects/source'),
  limits:  { fileSize: MAX_SIZE_BYTES },
  fileFilter: fileFilter(ALL_PROJECT_MIMES),
}).fields([
  { name: 'preview_image', maxCount: 1 },
  { name: 'project_file',  maxCount: 1 },
]);

/**
 * Avatar upload — single image, max 2 MB.
 */
const uploadAvatar = multer({
  storage: makeStorage('avatars'),
  limits:  { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter(MIME.avatar),
}).single('avatar');

// ── Utility exports ────────────────────────────────────────────────────────────

module.exports = {
  uploadProjectFile,
  uploadProjectFiles_bulk,
  uploadProjectFiles,
  uploadAvatar,
  uploadPaymentProof,
  subDirForType,
  inferFileType,
  MIME,
  UPLOAD_DIR,
};
