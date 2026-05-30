const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Allowed image MIME types (whitelist — no SVG, XSS vector)
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp'
]);

const IMAGE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

/**
 * Detect image type by magic bytes (PNG, JPEG, GIF, WebP)
 */
function detectImageExtension(buffer) {
  if (!buffer || buffer.length < 12) return '';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpg';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'webp';
  return '';
}

function isValidImageBuffer(buffer) {
  return !!detectImageExtension(buffer);
}

function removeUploadedFile(file) {
  if (!file || !file.path) return;
  try {
    fs.unlinkSync(file.path);
  } catch (e) { /* best effort cleanup */ }
}

/**
 * Create a multer upload instance for a given subdirectory under uploads/
 */
function createUploader(subdir) {
  const uploadsDir = path.join(__dirname, '..', 'uploads', subdir);
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
      cb(null, file.fieldname + '-' + uniqueSuffix + (IMAGE_EXTENSIONS[file.mimetype] || path.extname(file.originalname)));
    }
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) cb(null, true);
      else cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
  });
}

/**
 * Resolve image from cropped base64 data, uploaded file, or existing value.
 * @param {string} croppedImageData - base64 data URI or 'REMOVE'
 * @param {object} uploadedFile - multer file object
 * @param {string} subdir - upload subdirectory (e.g. 'news', 'servers')
 * @param {string} prefix - filename prefix (e.g. 'cropped', 'server')
 * @param {string} existingImage - current image path to keep as fallback
 */
function resolveImage(croppedImageData, uploadedFile, subdir, prefix, existingImage = '') {
  if (croppedImageData === 'REMOVE') return '';

  if (croppedImageData && croppedImageData.startsWith('data:image/')) {
    try {
      const matches = croppedImageData.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        if (buffer.length > 5 * 1024 * 1024) return existingImage;
        const detectedExt = detectImageExtension(buffer);
        if (!detectedExt || detectedExt !== ext) return existingImage;
        const filename = prefix + '-' + Date.now() + '-' + crypto.randomBytes(8).toString('hex') + '.' + detectedExt;
        const uploadsDir = path.join(__dirname, '..', 'uploads', subdir);
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        return '/uploads/' + subdir + '/' + filename;
      }
    } catch (e) {
      console.error('Failed to save cropped image:', e.message);
    }
  }

  if (uploadedFile) {
    try {
      const buffer = fs.readFileSync(uploadedFile.path);
      if (!isValidImageBuffer(buffer)) {
        removeUploadedFile(uploadedFile);
        return existingImage;
      }
      return '/uploads/' + subdir + '/' + uploadedFile.filename;
    } catch (e) {
      removeUploadedFile(uploadedFile);
      return existingImage;
    }
  }
  return existingImage;
}

module.exports = { createUploader, resolveImage };
