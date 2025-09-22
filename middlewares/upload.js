const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Permitir imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } 
  // Permitir videos
  else if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } 
  else {
    cb(new Error('Solo se permiten archivos de imagen y video'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB para videos más grandes
  },
});

module.exports = upload;