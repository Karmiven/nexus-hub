/**
 * Authentication middleware
 */

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Please log in to access this page.');
  return res.redirect('/auth/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  // Don't reveal that admin panel exists - just 404
  return res.status(404).render('errors/404', { title: 'Page Not Found' });
}

function isGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  return next();
}

module.exports = { isAuthenticated, isAdmin, isGuest };
