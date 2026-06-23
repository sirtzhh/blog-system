const db = require('../config/database');

class CommentModel {
    // 创建评论
    static async create(content, userId, postId, parentId = null) {
        const sql = `INSERT INTO comments (content, user_id, post_id, parent_id, status, created_at) 
                     VALUES (?, ?, ?, ?, 'approved', ?)`;
        const [result] = await db.execute(sql, [content, userId, postId, parentId, new Date()]);
        return result.insertId;
    }

    // 获取文章的所有评论（包括回复）
    static async getByPostId(postId) {
        const [comments] = await db.query(
            `SELECT c.*, u.username, u.avatar 
             FROM comments c 
             LEFT JOIN users u ON c.user_id = u.id 
             WHERE c.post_id = ? AND c.status = 'approved'
             ORDER BY c.created_at ASC`,
            [postId]
        );
        return comments;
    }

    // 获取评论数量
    static async getCountByPostId(postId) {
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND status = "approved"',
            [postId]
        );
        return result[0].count;
    }

    // 删除评论（只有作者或管理员可以删除）
    static async delete(id, userId, isAdmin = false) {
        let sql = 'DELETE FROM comments WHERE id = ?';
        const params = [id];
        
        if (!isAdmin) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }
        
        const [result] = await db.execute(sql, params);
        return result.affectedRows > 0;
    }

    // 获取单条评论（用于权限验证）
    static async getById(id) {
        const [comments] = await db.query('SELECT * FROM comments WHERE id = ?', [id]);
        return comments[0];
    }
}

module.exports = CommentModel;