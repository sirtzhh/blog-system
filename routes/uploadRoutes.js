const express = require('express');
const { authenticate } = require('../middleware/auth');
const { uploadImage, uploadVideo, uploadArchive } = require('../middleware/upload');

const router = express.Router();

// 上传图片
router.post('/image', authenticate, uploadImage.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: '请选择图片文件' 
        });
    }
    try {
        const imageUrl = '/uploads/images/' + req.file.filename;
        res.json({ 
            success: true, 
            message: '图片上传成功',
            url: imageUrl
        });
    } catch (err) {
        console.error('上传图片错误:', err);
        res.status(500).json({ 
            success: false, 
            message: '上传失败：' + err.message 
        });
    }
});

// 上传视频
router.post('/video', authenticate, uploadVideo.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: '请选择视频文件' 
        });
    }
    try {
        const videoUrl = '/uploads/videos/' + req.file.filename;
        res.json({ 
            success: true, 
            message: '视频上传成功',
            url: videoUrl
        });
    } catch (err) {
        console.error('上传视频错误:', err);
        res.status(500).json({ 
            success: false, 
            message: '上传失败：' + err.message 
        });
    }
});

// 上传压缩包
router.post('/archive', authenticate, uploadArchive.single('archive'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: '请选择压缩包文件' 
        });
    }
    try {
        const archiveUrl = '/uploads/archives/' + req.file.filename;
        res.json({ 
            success: true, 
            message: '压缩包上传成功',
            url: archiveUrl,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (err) {
        console.error('上传压缩包错误:', err);
        res.status(500).json({ 
            success: false, 
            message: '上传失败：' + err.message 
        });
    }
});

module.exports = router;