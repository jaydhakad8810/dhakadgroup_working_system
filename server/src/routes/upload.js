const router = require('express').Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { auth } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(auth);

// Single file upload
router.post('/single', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const folder = req.body.folder || 'dgsystem';
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto', quality: 'auto' },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Multiple files
router.post('/multiple', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files provided' });
    const folder = req.body.folder || 'dgsystem';
    const urls = await Promise.all(req.files.map(file => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto', quality: 'auto' },
        (error, result) => error ? reject(error) : resolve(result.secure_url)
      );
      stream.end(file.buffer);
    })));
    res.json({ urls });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Base64 upload (for PWA camera captures)
router.post('/base64', async (req, res) => {
  try {
    const { data, folder = 'dgsystem' } = req.body;
    if (!data) return res.status(400).json({ message: 'No data provided' });
    const result = await cloudinary.uploader.upload(data, { folder, quality: 'auto' });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Delete file
router.delete('/:public_id', async (req, res) => {
  try {
    await cloudinary.uploader.destroy(decodeURIComponent(req.params.public_id));
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
