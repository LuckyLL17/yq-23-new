import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { created, badRequest, unauthorized } from '../utils/response';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片'));
    }
  }
});

interface UploadImageResponse {
  url: string;
}

interface UploadImagesResponse {
  urls: string[];
}

router.post('/image', authMiddleware, upload.single('image'), (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  if (!req.file) {
    return badRequest(res, '请选择要上传的图片');
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  created<UploadImageResponse>(res, { url: imageUrl }, '图片上传成功');
});

router.post('/images', authMiddleware, upload.array('images', 9), (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    return badRequest(res, '请选择要上传的图片');
  }

  const imageUrls = (req.files as Express.Multer.File[]).map(
    (file) => `/uploads/${file.filename}`
  );
  created<UploadImagesResponse>(res, { urls: imageUrls }, '图片上传成功');
});

export default router;
