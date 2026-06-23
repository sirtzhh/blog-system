const db = require('../config/database');

class PostModel {
	static async create(title, content, userId, categoryId = null) {
		var slug = title.toLowerCase();
		slug = slug.replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-');
		slug = slug.replace(/^-|-$/g, '');
		slug = slug + '-' + Date.now();

		const finalCategoryId = (categoryId === undefined || categoryId === '') ? null : categoryId;

		const sql = `INSERT INTO posts 
            (title, slug, content, user_id, category_id, status, created_at) 
            VALUES (?, ?, ?, ?, ?, 'published', ?)`;

		const [result] = await db.execute(sql, [
			title, slug, content, userId, finalCategoryId, new Date()
		]);
		return result.insertId;
	}

	static async getAllPublished(page, limit, categoryId = null) {
		if(page === undefined) page = 1;
		if(limit === undefined) limit = 10;
		const offset = (page - 1) * limit;

		let sql = `SELECT p.*, u.username, u.avatar, c.name as category_name, c.slug as category_slug
                   FROM posts p 
                   LEFT JOIN users u ON p.user_id = u.id 
                   LEFT JOIN categories c ON p.category_id = c.id
                   WHERE p.status = 'published'`;

		const params = [];

		if(categoryId) {
			sql += ` AND p.category_id = ?`;
			params.push(categoryId);
		}

		sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
		params.push(limit, offset);

		const [posts] = await db.query(sql, params);
		return posts;
	}

	static async getBySlug(slug) {
		const [posts] = await db.query(
			`SELECT p.*, u.username, u.avatar, c.name as category_name, c.slug as category_slug
             FROM posts p 
             LEFT JOIN users u ON p.user_id = u.id 
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.slug = ?`, [slug]
		);
		return posts[0];
	}

	static async incrementViewCount(id) {
		await db.execute(
			'UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [id]
		);
	}

	static async getCountByCategory(categoryId) {
		const [result] = await db.query(
			'SELECT COUNT(*) as count FROM posts WHERE category_id = ? AND status = "published"', [categoryId]
		);
		return result[0].count;
	}

	// 删除文章（只有作者或管理员可以删除）
	static async delete(id, userId, isAdmin = false) {
		let sql = 'DELETE FROM posts WHERE id = ?';
		const params = [id];

		if(!isAdmin) {
			sql += ' AND user_id = ?';
			params.push(userId);
		}

		const [result] = await db.execute(sql, params);
		return result.affectedRows > 0;
	}

	// 更新文章（只有作者或管理员可以更新）
	static async update(id, userId, data, isAdmin = false) {
		const updates = [];
		const values = [];

		if(data.title) {
			updates.push('title = ?');
			values.push(data.title);

			// 重新生成 slug
			let slug = data.title.toLowerCase();
			slug = slug.replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-');
			slug = slug.replace(/^-|-$/g, '');
			slug = slug + '-' + Date.now();
			updates.push('slug = ?');
			values.push(slug);
		}
		if(data.content) {
			updates.push('content = ?');
			values.push(data.content);
		}
		if(data.categoryId !== undefined) {
			updates.push('category_id = ?');
			values.push(data.categoryId === '' ? null : data.categoryId);
		}

		if(updates.length === 0) return false;

		updates.push('updated_at = ?');
		values.push(new Date());

		let sql = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
		values.push(id);

		if(!isAdmin) {
			sql += ' AND user_id = ?';
			values.push(userId);
		}

		const [result] = await db.execute(sql, values);
		return result.affectedRows > 0;
	}

	// 根据ID获取文章（不限制状态，用于编辑）
	static async getById(id) {
		const [posts] = await db.query(
			`SELECT p.*, u.username, u.avatar, c.name as category_name, c.id as category_id
	         FROM posts p 
	         LEFT JOIN users u ON p.user_id = u.id 
	         LEFT JOIN categories c ON p.category_id = c.id
	         WHERE p.id = ?`, [id]
		);
		return posts[0];
	}

	// 获取文章总数（按分类，可选）
	static async getCount(categoryId = null) {
		let sql = 'SELECT COUNT(*) as count FROM posts WHERE status = "published"';
		const params = [];

		if(categoryId) {
			sql += ' AND category_id = ?';
			params.push(categoryId);
		}

		const [result] = await db.query(sql, params);
		return result[0].count;
	}

	// 获取用户文章总数
	static async getCountByUserId(userId) {
		const [result] = await db.query(
			'SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND status = "published"', [userId]
		);
		return result[0].count;
	}

	// 获取用户的所有文章
	static async getByUserId(userId, page = 1, limit = 10) {
		const offset = (page - 1) * limit;
		const [posts] = await db.query(
			`SELECT p.*, u.username, u.avatar, c.name as category_name
             FROM posts p 
             LEFT JOIN users u ON p.user_id = u.id 
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.user_id = ? AND p.status = 'published'
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`, [userId, limit, offset]
		);
		return posts;
	}

	// 获取文章总数（按分类）
	static async getCountByCategory(categoryId) {
		const [result] = await db.query(
			'SELECT COUNT(*) as count FROM posts WHERE category_id = ? AND status = "published"', [categoryId]
		);
		return result[0].count;
	}
	// 搜索文章（按标题和内容）
	static async search(keyword, page = 1, limit = 10) {
		const offset = (page - 1) * limit;
		const searchPattern = `%${keyword}%`;

		const [posts] = await db.query(
			`SELECT p.*, u.username, u.avatar, c.name as category_name
         FROM posts p 
         LEFT JOIN users u ON p.user_id = u.id 
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.status = 'published' 
         AND (p.title LIKE ? OR p.content LIKE ?)
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`, [searchPattern, searchPattern, limit, offset]
		);
		return posts;
	}

	// 统计搜索结果数量
	static async searchCount(keyword) {
		const searchPattern = `%${keyword}%`;
		const [result] = await db.query(
			`SELECT COUNT(*) as count FROM posts 
         WHERE status = 'published' 
         AND (title LIKE ? OR content LIKE ?)`, [searchPattern, searchPattern]
		);
		return result[0].count;
	}
	
	// 获取已发布文章列表（置顶优先）
	static async getAllPublished(page = 1, limit = 10, categoryId = null) {
	    const offset = (page - 1) * limit;
	    let sql = `
	        SELECT p.*, u.username, u.avatar, c.name as category_name
	        FROM posts p 
	        LEFT JOIN users u ON p.user_id = u.id 
	        LEFT JOIN categories c ON p.category_id = c.id
	        WHERE p.status = 'published'
	    `;
	    const params = [];
	    
	    if (categoryId) {
	        sql += ` AND p.category_id = ?`;
	        params.push(categoryId);
	    }
	    
	    // 置顶文章优先排序
	    sql += ` ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ? OFFSET ?`;
	    params.push(limit, offset);
	    
	    const [posts] = await db.query(sql, params);
	    return posts;
	}
	
	// 搜索文章（置顶优先）
	static async search(keyword, page = 1, limit = 10) {
	    const offset = (page - 1) * limit;
	    const searchPattern = `%${keyword}%`;
	    
	    const [posts] = await db.query(
	        `SELECT p.*, u.username, u.avatar, c.name as category_name
	         FROM posts p 
	         LEFT JOIN users u ON p.user_id = u.id 
	         LEFT JOIN categories c ON p.category_id = c.id
	         WHERE p.status = 'published' 
	         AND (p.title LIKE ? OR p.content LIKE ?)
	         ORDER BY p.is_pinned DESC, p.created_at DESC
	         LIMIT ? OFFSET ?`,
	        [searchPattern, searchPattern, limit, offset]
	    );
	    return posts;
	}
	
	// 切换置顶状态
	static async togglePin(id, userId, isAdmin = false) {
	    // 先获取当前状态
	    let sql = 'SELECT is_pinned FROM posts WHERE id = ?';
	    const params = [id];
	    
	    if (!isAdmin) {
	        sql += ' AND user_id = ?';
	        params.push(userId);
	    }
	    
	    const [posts] = await db.query(sql, params);
	    if (posts.length === 0) return null;
	    
	    const newStatus = posts[0].is_pinned === 1 ? 0 : 1;
	    
	    const updateSql = 'UPDATE posts SET is_pinned = ? WHERE id = ?';
	    await db.execute(updateSql, [newStatus, id]);
	    
	    return newStatus === 1;
	}
}

module.exports = PostModel;