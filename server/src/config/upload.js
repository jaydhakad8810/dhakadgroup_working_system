const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp = require('sharp');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

const uploadCompressed = async (buffer, folder, opts = {}) => {
  const { width = 800, height = 800, quality = 70 } = opts;
  const compressed = await sharp(buffer)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `dgsystem/${folder}`, resource_type: 'image' },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(compressed);
  });
};

module.exports = { upload, uploadCompressed, cloudinary };
