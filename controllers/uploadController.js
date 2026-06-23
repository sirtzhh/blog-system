const fs = require('fs');
const path = require('path');

class UploadController {
    // 上传文章图片
    static async uploadImage(req, res) {
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
    }
    
    // 删除图片（可选，用于删除文章时清理无用图片）
    static async deleteImage(req, res) {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: '缺少图片地址' });
        }
        
        try {
            // 从 URL 中提取文件路径
            const filename = path.basename(url);
            const filePath = path.join(__dirname, '../uploads/images/', filename);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            
            res.json({ success: true, message: '图片删除成功' });
        } catch (err) {
            console.error('删除图片错误:', err);
            res.status(500).json({ success: false, message: '删除失败' });
        }
    }
}

module.exports = UploadController;