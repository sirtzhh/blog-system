const db = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
	static async create(username, email, password) {
		const hashedPassword = await bcrypt.hash(password, 10);
		const sql = 'INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)';
		const [result] = await db.execute(sql, [username, email, hashedPassword, new Date()]);
		return result.insertId;
	}

	static async findByEmail(email) {
		const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
		return users[0];
	}

	static async findByUsername(username) {
		const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
		return users[0];
	}

	static async findById(id) {
		const [users] = await db.query('SELECT id, username, email, avatar, bio, role, created_at FROM users WHERE id = ?', [id]);
		return users[0];
	}

	static async verifyPassword(password, hashedPassword) {
		return bcrypt.compare(password, hashedPassword);
	}

	// 更新用户头像
	static async updateAvatar(id, avatarUrl) {
		const [result] = await db.execute(
			'UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?', [avatarUrl, new Date(), id]
		);
		return result.affectedRows > 0;
	}

	// 更新用户资料
	static async updateProfile(id, data) {
		const updates = [];
		const values = [];

		if(data.bio !== undefined) {
			updates.push('bio = ?');
			values.push(data.bio);
		}
		if(data.username) {
			updates.push('username = ?');
			values.push(data.username);
		}

		if(updates.length === 0) return false;

		updates.push('updated_at = ?');
		values.push(new Date());
		values.push(id);

		const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
		const [result] = await db.execute(sql, values);
		return result.affectedRows > 0;
	}
	
	// 获取用户信息（包含密码）
	static async findUserWithPassword(id) {
	    const [users] = await db.query(
	        'SELECT * FROM users WHERE id = ?',
	        [id]
	    );
	    return users[0];
	}
	
	// 更新密码
	static async updatePassword(id, hashedPassword) {
	    const [result] = await db.execute(
	        'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
	        [hashedPassword, new Date(), id]
	    );
	    return result.affectedRows > 0;
	}
}

module.exports = UserModel;