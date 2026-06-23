const CommentModel = require('../models/commentModel');

class CommentController {
    // 发表评论
    static async create(req, res) {
        const { content, postId, parentId } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: '评论内容不能为空' 
            });
        }
        
        if (!postId) {
            return res.status(400).json({ 
                success: false, 
                message: '缺少文章ID' 
            });
        }
        
        try {
            const commentId = await CommentModel.create(
                content.trim(), 
                req.userId, 
                postId, 
                parentId || null
            );
            
            const newComment = await CommentModel.getById(commentId);
            
            res.json({ 
                success: true, 
                message: '评论发表成功',
                comment: newComment
            });
        } catch (err) {
            console.error('发表评论错误:', err);
            res.status(500).json({ 
                success: false, 
                message: '服务器错误' 
            });
        }
    }
    
    // 获取文章的评论列表
    static async getList(req, res) {
        const { postId } = req.params;
        
        try {
            const comments = await CommentModel.getByPostId(postId);
            const count = await CommentModel.getCountByPostId(postId);
            
            // 构建评论树（将平铺的评论转换为嵌套结构）
            const commentMap = {};
            const rootComments = [];
            
            comments.forEach(comment => {
                comment.replies = [];
                commentMap[comment.id] = comment;
            });
            
            comments.forEach(comment => {
                if (comment.parent_id) {
                    if (commentMap[comment.parent_id]) {
                        commentMap[comment.parent_id].replies.push(comment);
                    }
                } else {
                    rootComments.push(comment);
                }
            });
            
            res.json({ 
                success: true, 
                data: rootComments,
                count
            });
        } catch (err) {
            console.error('获取评论列表错误:', err);
            res.status(500).json({ 
                success: false, 
                message: '服务器错误' 
            });
        }
    }
    
    // 删除评论
    static async delete(req, res) {
        const commentId = req.params.id;
        const isAdmin = req.user.role === 'admin';
        
        try {
            const comment = await CommentModel.getById(commentId);
            if (!comment) {
                return res.status(404).json({ 
                    success: false, 
                    message: '评论不存在' 
                });
            }
            
            const success = await CommentModel.delete(commentId, req.userId, isAdmin);
            
            if (success) {
                res.json({ 
                    success: true, 
                    message: '删除成功' 
                });
            } else {
                res.status(403).json({ 
                    success: false, 
                    message: '无权删除此评论' 
                });
            }
        } catch (err) {
            console.error('删除评论错误:', err);
            res.status(500).json({ 
                success: false, 
                message: '服务器错误' 
            });
        }
    }
}

module.exports = CommentController;