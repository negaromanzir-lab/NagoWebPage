/**
 * uploads.controller.js
 *
 * Handles all admin file upload operations against the project_files table.
 * Supports: source ZIPs, topology images, PDFs, implementation guides.
 */

const path = require('path');
const fs   = require('fs');
const { getPool } = require('../config/db');
const { UPLOAD_DIR, subDirForType, inferFileType } = require('../middleware/upload');

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildRelativePath(fileType, filename) {
  return `${subDirForType(fileType)}/${filename}`;
}

function safeUnlink(relativePath) {
  if (!relativePath) return;
  const abs = path.join(UPLOAD_DIR, relativePath);
  try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch { /* ignore */ }
}

function fmtFileType(mimetype, bodyFileType) {
  if (bodyFileType && ['source', 'preview', 'diagram', 'documentation', 'other'].includes(bodyFileType)) {
    return bodyFileType;
  }
  return inferFileType(mimetype);
}

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/uploads/:projectId
 *
 * Upload a single file and attach it to a project.
 * Body (multipart/form-data):
 *   file        — the file itself
 *   file_type   — 'source' | 'preview' | 'diagram' | 'documentation' | 'other'
 *   version     — optional version string (default '1.0')
 *   is_primary  — '1' | '0' — whether this is the main downloadable file
 *   description — optional description
 */
async function uploadSingle(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const db        = getPool();
    const projectId = parseInt(req.params.projectId, 10);

    // Verify project exists
    const [projects] = await db.query(
      'SELECT id, title FROM projects WHERE id = ? AND is_deleted = 0',
      [projectId]
    );
    if (!projects.length) {
      safeUnlink(req.file.path.replace(UPLOAD_DIR + path.sep, '').replace(/\\/g, '/'));
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const fileType   = fmtFileType(req.file.mimetype, req.body.file_type);
    const version    = (req.body.version || '1.0').trim().slice(0, 20);
    const isPrimary  = req.body.is_primary === '1' || req.body.is_primary === 'true';
    const relativePath = buildRelativePath(fileType, req.file.filename);

    // If marking as primary, unset any existing primary for this type
    if (isPrimary) {
      await db.query(
        'UPDATE project_files SET is_primary = 0 WHERE project_id = ? AND file_type = ?',
        [projectId, fileType]
      );
    }

    const [result] = await db.query(
      `INSERT INTO project_files
         (project_id, file_name, stored_name, file_path, mime_type,
          file_size_bytes, file_type, version, is_primary, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        req.file.originalname,
        req.file.filename,
        relativePath,
        req.file.mimetype,
        req.file.size,
        fileType,
        version,
        isPrimary ? 1 : 0,
        req.user.id,
      ]
    );

    // Keep legacy project_file_path / preview_image_path in sync
    if (fileType === 'source' && isPrimary) {
      await db.query(
        'UPDATE projects SET project_file_path = ?, updated_at = NOW() WHERE id = ?',
        [relativePath, projectId]
      );
    }
    if (fileType === 'preview' && isPrimary) {
      await db.query(
        'UPDATE projects SET preview_image_path = ?, updated_at = NOW() WHERE id = ?',
        [relativePath, projectId]
      );
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id:              result.insertId,
        project_id:      projectId,
        file_name:       req.file.originalname,
        stored_name:     req.file.filename,
        file_path:       relativePath,
        mime_type:       req.file.mimetype,
        file_size_bytes: req.file.size,
        file_type:       fileType,
        version,
        is_primary:      isPrimary,
      },
    });
  } catch (err) {
    // Clean up the uploaded file on error
    if (req.file) safeUnlink(req.file.path);
    next(err);
  }
}

/**
 * POST /api/admin/uploads/:projectId/bulk
 *
 * Upload multiple files at once.
 * Body (multipart/form-data):
 *   files[]     — up to 10 files
 *   file_type   — applied to all files in this batch
 *   version     — optional version string
 */
async function uploadBulk(req, res, next) {
  const uploadedFiles = req.files || [];
  try {
    if (!uploadedFiles.length) {
      return res.status(400).json({ success: false, message: 'No files provided' });
    }

    const db        = getPool();
    const projectId = parseInt(req.params.projectId, 10);

    const [projects] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND is_deleted = 0',
      [projectId]
    );
    if (!projects.length) {
      uploadedFiles.forEach((f) => safeUnlink(f.path));
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const version  = (req.body.version || '1.0').trim().slice(0, 20);
    const inserted = [];

    for (const file of uploadedFiles) {
      const fileType     = fmtFileType(file.mimetype, req.body.file_type);
      const relativePath = buildRelativePath(fileType, file.filename);

      const [result] = await db.query(
        `INSERT INTO project_files
           (project_id, file_name, stored_name, file_path, mime_type,
            file_size_bytes, file_type, version, is_primary, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          projectId,
          file.originalname,
          file.filename,
          relativePath,
          file.mimetype,
          file.size,
          fileType,
          version,
          req.user.id,
        ]
      );

      inserted.push({
        id:              result.insertId,
        file_name:       file.originalname,
        file_type:       fileType,
        file_size_bytes: file.size,
        file_path:       relativePath,
      });
    }

    res.status(201).json({
      success: true,
      message: `${inserted.length} file(s) uploaded successfully`,
      data: inserted,
    });
  } catch (err) {
    uploadedFiles.forEach((f) => safeUnlink(f.path));
    next(err);
  }
}

/**
 * GET /api/admin/uploads/:projectId
 *
 * List all files attached to a project, grouped by file_type.
 */
async function listProjectFiles(req, res, next) {
  try {
    const db        = getPool();
    const projectId = parseInt(req.params.projectId, 10);

    const [project] = await db.query(
      'SELECT id, title, vendor FROM projects WHERE id = ? AND is_deleted = 0',
      [projectId]
    );
    if (!project.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const [files] = await db.query(
      `SELECT
         pf.id, pf.file_name, pf.stored_name, pf.file_path,
         pf.mime_type, pf.file_size_bytes, pf.file_type,
         pf.version, pf.is_primary, pf.download_count, pf.created_at,
         u.name AS uploaded_by_name
       FROM project_files pf
       LEFT JOIN users u ON pf.uploaded_by = u.id
       WHERE pf.project_id = ?
       ORDER BY pf.file_type ASC, pf.is_primary DESC, pf.created_at DESC`,
      [projectId]
    );

    // Group by file_type
    const grouped = files.reduce((acc, f) => {
      if (!acc[f.file_type]) acc[f.file_type] = [];
      acc[f.file_type].push(f);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        project: project[0],
        files,
        grouped,
        total: files.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/uploads/files/:fileId
 *
 * Update metadata for an uploaded file (version, is_primary, file_type).
 */
async function updateFileMeta(req, res, next) {
  try {
    const db     = getPool();
    const fileId = parseInt(req.params.fileId, 10);

    const [rows] = await db.query(
      'SELECT id, project_id, file_type FROM project_files WHERE id = ?',
      [fileId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const { version, is_primary, file_type } = req.body;
    const fields = {};

    if (version   !== undefined) fields.version    = String(version).slice(0, 20);
    if (file_type !== undefined && ['source','preview','diagram','documentation','other'].includes(file_type)) {
      fields.file_type = file_type;
    }

    if (is_primary === '1' || is_primary === true || is_primary === 'true') {
      // Unset other primaries for this type in the same project
      const targetType = fields.file_type || rows[0].file_type;
      await db.query(
        'UPDATE project_files SET is_primary = 0 WHERE project_id = ? AND file_type = ?',
        [rows[0].project_id, targetType]
      );
      fields.is_primary = 1;
    } else if (is_primary === '0' || is_primary === false || is_primary === 'false') {
      fields.is_primary = 0;
    }

    if (!Object.keys(fields).length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const setClauses = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    await db.query(
      `UPDATE project_files SET ${setClauses} WHERE id = ?`,
      [...Object.values(fields), fileId]
    );

    res.json({ success: true, message: 'File metadata updated' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/uploads/files/:fileId
 *
 * Delete a single file record and remove it from disk.
 */
async function deleteProjectFile(req, res, next) {
  try {
    const db     = getPool();
    const fileId = parseInt(req.params.fileId, 10);

    const [rows] = await db.query(
      'SELECT id, project_id, file_path, file_type, is_primary FROM project_files WHERE id = ?',
      [fileId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const { project_id, file_path, file_type, is_primary } = rows[0];

    // Remove from disk
    safeUnlink(file_path);

    // Remove DB record
    await db.query('DELETE FROM project_files WHERE id = ?', [fileId]);

    // If this was the primary file, clear the legacy column
    if (is_primary) {
      if (file_type === 'source') {
        await db.query(
          'UPDATE projects SET project_file_path = NULL, updated_at = NOW() WHERE id = ?',
          [project_id]
        );
      }
      if (file_type === 'preview') {
        await db.query(
          'UPDATE projects SET preview_image_path = NULL, updated_at = NOW() WHERE id = ?',
          [project_id]
        );
      }
    }

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/uploads/stats
 *
 * Storage statistics across all project files.
 */
async function getStorageStats(req, res, next) {
  try {
    const db = getPool();

    const [byType] = await db.query(
      `SELECT
         file_type,
         COUNT(*)                        AS file_count,
         COALESCE(SUM(file_size_bytes), 0) AS total_bytes,
         COALESCE(SUM(download_count), 0)  AS total_downloads
       FROM project_files
       GROUP BY file_type
       ORDER BY total_bytes DESC`
    );

    const [[totals]] = await db.query(
      `SELECT
         COUNT(*)                        AS total_files,
         COALESCE(SUM(file_size_bytes), 0) AS total_bytes,
         COALESCE(SUM(download_count), 0)  AS total_downloads,
         COUNT(DISTINCT project_id)      AS projects_with_files
       FROM project_files`
    );

    const [recent] = await db.query(
      `SELECT
         pf.id, pf.file_name, pf.file_type, pf.file_size_bytes, pf.created_at,
         p.title AS project_title,
         u.name  AS uploaded_by
       FROM project_files pf
       JOIN projects p ON pf.project_id = p.id
       JOIN users    u ON pf.uploaded_by = u.id
       ORDER BY pf.created_at DESC
       LIMIT 10`
    );

    res.json({ success: true, data: { byType, totals, recent } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadSingle,
  uploadBulk,
  listProjectFiles,
  updateFileMeta,
  deleteProjectFile,
  getStorageStats,
};
