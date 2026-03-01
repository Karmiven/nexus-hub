/**
 * Lightweight CSRF protection middleware
 * Generates a per-session token stored in req.session._csrf.
 * Token is exposed to templates as csrfToken and validated on POST/PUT/DELETE.
 */
const crypto = require('crypto');

/**
 * Generate or retrieve a CSRF token from the session
 */
function generateToken(req) {
  if (!req.session._csrf) {
    req.session._csrf = crypto.randomBytes(24).toString('hex');
  }
  return req.session._csrf;
}

/**
 * Middleware: expose csrfToken to all templates
 */
function csrfTokenMiddleware(req, res, next) {
  res.locals.csrfToken = generateToken(req);
  next();
}

/**
 * Middleware: validate CSRF token on state-changing methods
 * Checks body._csrf, query._csrf, and x-csrf-token header
 */
function csrfProtection(req, res, next) {
  // Only check state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionToken = req.session._csrf;
  const submittedToken = req.body?._csrf || req.query?._csrf || req.headers['x-csrf-token'];

  if (!sessionToken || !submittedToken || sessionToken !== submittedToken) {
    // For AJAX requests, return JSON error
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest' ||
        (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(403).json({ success: false, error: 'Invalid CSRF token' });
    }
    req.flash('error', 'Form expired. Please try again.');
    return res.redirect('back');
  }

  next();
}

module.exports = { csrfTokenMiddleware, csrfProtection };
