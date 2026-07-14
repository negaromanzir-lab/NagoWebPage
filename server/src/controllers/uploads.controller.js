const { getPool } = require('../config/db');
const { deleteFromCloudinary, getPublicId } = require('../config/cloudinary');
const { inferFileType } = require('../middleware/upload');

function fmtFileType(mimetype, bodyFileType) {
  if (bodyFileType && ['source','preview','diagram','documentation','other'].includes(bodyFileType)) {
    return bodyFileType;
  }
  return inferFileType(mimetype);
}

// ── POST /api/admin/uploads/:projectId ────────────────────────────────────────

async function uploadSingle(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const db        = getPool();
    const projectId = parseInt(req.params.projectId, 10);

    const [projects] = await db.query(
      'SELECT id, title FROM projects WHERE id = $1 AND is_deleted = FALSE',
      [projectId]
    );
    if (!projects.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const fileType  = fmtFileType(req.file.mimetype, req.body.file_type);
    const version   = (req.body.version || '1.0').trim().slice(0, 20);
    const isPrimary = req.body.is_primary === '1' || req.body.is_primary === 'true';

    // Cloudinary gives us the URL in req.file.path
    const cloudinaryUrl  = req.file.path;
    const storedName     = req.file.filename;

    if (isPrimary) {
      await db.query(
        'UPDATE project_files SET is_primary = FALSE WHERE project_id = $1 AND file_type = $2',
        [projectId, fileType]
      );
    }

    const [result] = await db.query(
      `INSERT INTO project_files
         (project_id, file_name, stored_name, file_path, mime_type,
          file_size_bytes, file_type, version, is_primary, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        projectId,
        req.file.originalname,
        storedName,
        cloudinaryUrl,        // store full Cloudinary URL
        req.file.mimetype,
        req.file.size,
        fileType,
        version,
        isPrimary,
        req.user.id,
      ]
    );

    // Update project legacy columns with Cloudinary URL
    if (fileType === 'source' && isPrimary) {
      await db.query(
        'UPDATE projects SET project_file_path = $1, updated_at = NOW() WHERE id = $2',
        [cloudinaryUrl, projectId]
      );
    }
    if (fileType === 'preview' && isPrimary) {
      await db.query(
        'UPDATE projects SET preview_image_path = $1, updated_at = NOW() WHERE id = $2',
        [cloudinaryUrl, projectId]
      );
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded to Cloudinary successfully',
      data: {
        id:              result[0].id,
        project_id:      projectId,
        file_name:       req.file.originalname,
        stored_name:     storedName,
        file_path:       cloudinaryUrl,
        mime_type:       req.file.mimetype,
        file_size_bytes: req.file.size,
        file_type:       fileType,
        version,
        is_primary:      isPrimary,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/uploads/:projectId/bulk ───────────────────────────────────

async function uploadBulk(req, res, next) {
  const uploadedFiles = req.files || [];
  try {
    if (!uploadedFiles.length) {
      return res.status(400).json({ success: false, message: 'No files provided' });
    }

    const db        = getPool();
    const projectId = parseInt(req.params.projectId, 10);

    const [projects] = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND is_deleted = FALSE',
      [projectId]
    );
    if (!projects.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const version  = (req.body.version || '1.0').trim().slice(0, 20);
    const inserted = [];

    for (const file of uploadedFiles) {
      const fileType     = fmtFileType(file.mimetype, req.body.file_type);
      const cloudinaryUrl = file.path;

      const [result] = await db.query(
        `INSERT INTO project_files
           (project_id, file_name, stored_name, file_path, mime_type,
            file_size_bytes, file_type, version, is_primary, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9)
         RETURNING id`,
        [
          projectId,
          file.originalname,
          file.filename,
          cloudinaryUrl,
          file.mimetype,
          file.size,
          fileType,
          version,
          req.user.id,
        ]
      );

      inserted.push({
        id:              result[0].id,
        file_name:       file.originalname,
        file_type:       fileType,
        file_size_bytes: file.size,
        file_path:       cloudinaryUrl,
      });
    }

    res.status(201).json({
      success: true,
      message: `${inserted.length} file(s) uploaded successfully`,
      data: inserted,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/uploads/:projectId ────────────────────────────────────────

async function listProjectFiles(req, res, next) {
  try {
    const db        = getPool();
    const projectId = parseInt(req.params.projectId, 10);

    const [project] = await db.query(
      'SELECT id, title, vendor FROM projects WHERE id = $1 AND is_deleted = FALSE',
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
       WHERE pf.project_id = $1
       ORDER BY pf.file_type ASC, pf.is_primary DESC, pf.created_at DESC`,
      [projectId]
    );

    const grouped = files.reduce((acc, f) => {
      if (!acc[f.file_type]) acc[f.file_type] = [];
      acc[f.file_type].push(f);
      return acc;
    }, {});

    res.json({
      success: true,
      data: { project: project[0], files, grouped, total: files.length },
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/uploads/files/:fileId ────────────────────────────────────

async function updateFileMeta(req, res, next) {
  try {
    const db     = getPool();
    const fileId = parseInt(req.params.fileId, 10);

    const [rows] = await db.query(
      'SELECT id, project_id, file_type FROM project_files WHERE id = $1',
      [fileId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'File not found' });

    const { version, is_primary, file_type } = req.body;
    const fields = {};

    if (version !== undefined) fields.version = String(version).slice(0, 20);
    if (file_type !== undefined && ['source','preview','diagram','documentation','other'].includes(file_type)) {
      fields.file_type = file_type;
    }

    if (is_primary === '1' || is_primary === true || is_primary === 'true') {
      const targetType = fields.file_type || rows[0].file_type;
      await db.query(
        'UPDATE project_files SET is_primary = FALSE WHERE project_id = $1 AND file_type = $2',
        [rows[0].project_id, targetType]
      );
      fields.is_primary = true;
    } else if (is_primary === '0' || is_primary === false || is_primary === 'false') {
      fields.is_primary = false;
    }

    if (!Object.keys(fields).length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const keys   = Object.keys(fields);
    const values = Object.values(fields);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    await db.query(
      `UPDATE project_files SET ${setClauses} WHERE id = $${keys.length + 1}`,
      [...values, fileId]
    );

    res.json({ success: true, message: 'File metadata updated' });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/uploads/files/:fileId ───────────────────────────────────

async function deleteProjectFile(req, res, next) {
  try {
    const db     = getPool();
    const fileId = parseInt(req.params.fileId, 10);

    const [rows] = await db.query(
      'SELECT id, project_id, file_path, file_type, is_primary FROM project_files WHERE id = $1',
      [fileId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'File not found' });

    const { project_id, file_path, file_type, is_primary } = rows[0];

    // Delete from Cloudinary
    const resourceType = ['preview','diagram'].includes(file_type) ? 'image' : 'raw';
    const publicId = getPublicId(file_path);
    if (publicId) await deleteFromCloudinary(publicId, resourceType);

    await db.query('DELETE FROM project_files WHERE id = $1', [fileId]);

    if (is_primary) {
      if (file_type === 'source') {
        await db.query('UPDATE projects SET project_file_path = NULL, updated_at = NOW() WHERE id = $1', [project_id]);
      }
      if (file_type === 'preview') {
        await db.query('UPDATE projects SET preview_image_path = NULL, updated_at = NOW() WHERE id = $1', [project_id]);
      }
    }

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/uploads/stats ─────────────────────────────────────────────

async function getStorageStats(req, res, next) {
  try {
    const db = getPool();

    const [byType] = await db.query(
      `SELECT file_type, COUNT(*) AS file_count,
         COALESCE(SUM(file_size_bytes), 0) AS total_bytes,
         COALESCE(SUM(download_count), 0) AS total_downloads
       FROM project_files GROUP BY file_type ORDER BY total_bytes DESC`
    );

    const [totalsRows] = await db.query(
      `SELECT COUNT(*) AS total_files,
         COALESCE(SUM(file_size_bytes), 0) AS total_bytes,
         COALESCE(SUM(download_count), 0) AS total_downloads,
         COUNT(DISTINCT project_id) AS projects_with_files
       FROM project_files`
    );

    const [recent] = await db.query(
      `SELECT pf.id, pf.file_name, pf.file_type, pf.file_size_bytes, pf.created_at,
         p.title AS project_title, u.name AS uploaded_by
       FROM project_files pf
       JOIN projects p ON pf.project_id = p.id
       JOIN users u ON pf.uploaded_by = u.id
       ORDER BY pf.created_at DESC LIMIT 10`
    );

    res.json({ success: true, data: { byType, totals: totalsRows[0], recent } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadSingle, uploadBulk, listProjectFiles,
  updateFileMeta, deleteProjectFile, getStorageStats,
};
