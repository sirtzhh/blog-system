const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保所有上传目录存在
const dirs = ['./uploads/avatars', './uploads/images', './uploads/videos', './uploads/archives'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 头像上传配置
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatars/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + req.userId + '-' + uniqueSuffix + ext);
    }
});

// 图片上传配置
const imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/images/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'image-' + uniqueSuffix + ext);
    }
});

// 视频上传配置
const videoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/videos/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'video-' + uniqueSuffix + ext);
    }
});

// 压缩包上传配置
const archiveStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/archives/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'archive-' + uniqueSuffix + ext);
    }
});

// 文件过滤器（图片、视频、压缩包）
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov|zip|rar|7z|tar|gz/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('只允许上传图片、视频或压缩包文件'));
    }
};

// 压缩包专用过滤器（更宽松）
const archiveFilter = (req, file, cb) => {
    // 扩展名检查
    const extname = /zip|rar|7z|tar|gz|bz2/.test(
        path.extname(file.originalname).toLowerCase()
    );
    
    // MIME 类型检查（添加更多类型）
    const mimetype = /zip|rar|7z|tar|gzip|x-rar-compressed|vnd.rar/.test(file.mimetype);
    
    if (extname) {
        return cb(null, true);
    } else {
        cb(new Error('只允许上传压缩包文件 (zip, rar, 7z, tar, gz)'));
    }
};


const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 1024 * 1024 * 2 }, // 2MB
    fileFilter: fileFilter
});

const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB
    fileFilter: fileFilter
});

const uploadVideo = multer({
    storage: videoStorage,
    limits: { fileSize: 1024 * 1024 * 50 }, // 50MB
    fileFilter: fileFilter
});

const uploadArchive = multer({
    storage: archiveStorage,
    limits: { fileSize: 1024 * 1024 * 100 }, // 100MB
    fileFilter: archiveFilter
});

module.exports = { 
    uploadAvatar, 
    uploadImage, 
    uploadVideo,
    uploadArchive 
};