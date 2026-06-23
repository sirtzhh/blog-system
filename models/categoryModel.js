const db = require('../config/database');

class CategoryModel {
    // 获取所有分类
    static async getAll() {
        const [categories] = await db.query(
            'SELECT * FROM categories ORDER BY id'
        );
        return categories;
    }

    // 根据ID获取分类
    static async getById(id) {
        const [categories] = await db.query(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );
        return categories[0];
    }

    // 创建分类
    static async create(name, slug) {
        const [result] = await db.execute(
            'INSERT INTO categories (name, slug, created_at) VALUES (?, ?, ?)',
            [name, slug, new Date()]
        );
        return result.insertId;
    }
}

module.exports = CategoryModel;