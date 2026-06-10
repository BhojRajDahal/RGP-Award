import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const sanitizeFilename = (name) =>
  name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120);

const isMimeExtConsistent = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const map = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/jpg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  };
  return (map[file.mimetype] || []).includes(ext);
};

const APPLICATION_MAX_FILE_SIZE = 200 * 1024; // 200KB per application file
const APPLICATION_MAX_FILE_SIZE_LABEL = '200KB';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create upload directories if they don't exist
const photosDir = path.join(__dirname, '../../public/photos');
const filesDir = path.join(__dirname, '../../public/files');
const winnerPhotoesDir = path.join(__dirname, '../../public/winnerPhotoes');

[photosDir, filesDir, winnerPhotoesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Upload] Created directory: ${dir}`);
  }
});

// Configure storage for photos (images)
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, photosDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_fieldId_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `${uniqueSuffix}_${name}${ext}`);
  }
});

// Configure storage for PDFs and documents
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_fieldId_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `${uniqueSuffix}_${name}${ext}`);
  }
});

// Configure storage for winner photos
const winnerPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, winnerPhotoesDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_random_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `${uniqueSuffix}_${name}${ext}`);
  }
});

// File filter for photos
const photoFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype) && isMimeExtConsistent(file)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed for photos'), false);
  }
};

// File filter for documents
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];
  if (allowedMimes.includes(file.mimetype) && isMimeExtConsistent(file)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed'), false);
  }
};

// Create upload instances
export const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: photoFilter,
  limits: {
    fileSize: APPLICATION_MAX_FILE_SIZE
  }
});

export const uploadFile = multer({
  storage: fileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: APPLICATION_MAX_FILE_SIZE
  }
});

// Upload middleware for winner photos
export const uploadWinnerPhoto = multer({
  storage: winnerPhotoStorage,
  fileFilter: photoFilter,
  limits: {
    fileSize: APPLICATION_MAX_FILE_SIZE
  }
});

// Helper function to determine if file is an image
export const isImageFile = (mimetype) => {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(mimetype);
};

// Custom storage that routes files to photos or files directory based on file type
const dynamicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route images to photos directory, others to files directory
    if (isImageFile(file.mimetype)) {
      cb(null, photosDir);
    } else {
      cb(null, filesDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_random_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `${uniqueSuffix}_${name}${ext}`);
  }
});

// File filter for all allowed types
const allFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedMimes.includes(file.mimetype) && isMimeExtConsistent(file)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDF, DOC, DOCX are allowed'), false);
  }
};

const removeUploadedFiles = (files) => {
  files.forEach(file => {
    const filePath = path.join(
      isImageFile(file.mimetype) ? photosDir : filesDir,
      file.filename
    );
    fs.promises
      .unlink(filePath)
      .catch((deleteError) => {
        if (deleteError?.code !== 'ENOENT') {
          console.error(`[Upload] Error deleting file ${filePath}:`, deleteError);
        }
      });
  });
};

// Upload middleware that accepts any number of files with dynamic field names
// Validates that each application file does not exceed 200KB
export const getUploadMiddleware = () => {
  const upload = multer({
    storage: dynamicStorage,
    fileFilter: allFileFilter,
    limits: {
      fileSize: APPLICATION_MAX_FILE_SIZE
    }
  });

  // Return middleware chain with a user-friendly file size error
  return (req, res, next) => {
    // First, process files with multer
    upload.any()(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            msg: `Each uploaded file must be ${APPLICATION_MAX_FILE_SIZE_LABEL} or less.`
          });
        }

        // If multer error (e.g., invalid type), pass it along
        return next(err);
      }

      const files = req.files || [];
      const oversizedFile = files.find(file => file.size > APPLICATION_MAX_FILE_SIZE);
      if (oversizedFile) {
        removeUploadedFiles(files);
        return res.status(400).json({
          msg: `Each uploaded file must be ${APPLICATION_MAX_FILE_SIZE_LABEL} or less.`
        });
      }

      next();
    });
  };
};

