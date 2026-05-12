/**
 * Central error-handling middleware.
 * Must be registered LAST in the Express app.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isDev = process.env.NODE_ENV === 'development';

  // Log the error server-side
  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`);

  // MySQL duplicate-entry error
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A record with that value already exists',
    });
  }

  // Multer file-size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 50} MB`,
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
}

/**
 * 404 handler — register before errorHandler.
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

module.exports = { errorHandler, notFound };
