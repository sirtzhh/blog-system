const PostModel = require('../models/postModel');
const CategoryModel = require('../models/categoryModel');

class PostController {
	static async create(req, res) {
		const {
			title,
			content,
			categoryId
		} = req.body;

		if(!title || !content) {
			return res.status(400).json({
				success: false,
				message: '标题和内容不能为空'
			});
		}

		try {
			const finalCategoryId = (categoryId && categoryId !== '') ? parseInt(categoryId) : null;

			const postId = await PostModel.create(
				title,
				content,
				req.userId,
				finalCategoryId
			);

			res.json({
				success: true,
				message: '文章发表成功！',
				postId: postId
			});
		} catch(err) {
			console.error('创建文章错误:', err);
			res.status(500).json({
				success: false,
				message: '服务器错误：' + err.message
			});
		}
	}

	// 获取文章列表（支持分页、分类、搜索）
	static async getList(req, res) {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const categoryId = req.query.category ? parseInt(req.query.category) : null;
		const keyword = req.query.keyword ? req.query.keyword.trim() : null;

		try {
			let posts;
			let total;
			let categories;

			// 搜索模式
			if(keyword) {
				posts = await PostModel.search(keyword, page, limit);
				total = await PostModel.searchCount(keyword);
				categories = await CategoryModel.getAll();
			}
			// 分类筛选模式
			else if(categoryId) {
				posts = await PostModel.getAllPublished(page, limit, categoryId);
				total = await PostModel.getCount(categoryId);
				categories = await CategoryModel.getAll();
			}
			// 普通模式
			else {
				posts = await PostModel.getAllPublished(page, limit);
				total = await PostModel.getCount();
				categories = await CategoryModel.getAll();
			}

			res.json({
				success: true,
				data: posts,
				categories: categories,
				total: total,
				page: page,
				limit: limit,
				keyword: keyword // 返回搜索关键词，用于前端高亮
			});
		} catch(err) {
			console.error('获取文章列表错误:', err);
			res.status(500).json({
				success: false,
				message: '服务器错误'
			});
		}
	}

	static async getDetail(req, res) {
		const {
			slug
		} = req.params;
		try {
			const post = await PostModel.getBySlug(slug);
			if(!post) {
				return res.status(404).json({
					success: false,
					message: '文章不存在'
				});
			}
			await PostModel.incrementViewCount(post.id);
			res.json({
				success: true,
				data: post
			});
		} catch(err) {
			console.error('获取文章详情错误:', err);
			res.status(500).json({
				success: false,
				message: '服务器错误：' + err.message
			});
		}
	}

	// 删除文章
	static async delete(req, res) {
		const postId = req.params.id;
		const isAdmin = req.user.role === 'admin';

		try {
			const post = await PostModel.getById(postId);
			if(!post) {
				return res.status(404).json({
					success: false,
					message: '文章不存在'
				});
			}

			const success = await PostModel.delete(postId, req.userId, isAdmin);

			if(success) {
				res.json({
					success: true,
					message: '文章删除成功'
				});
			} else {
				res.status(403).json({
					success: false,
					message: '无权删除此文章'
				});
			}
		} catch(err) {
			console.error('删除文章错误:', err);
			res.status(500).json({
				success: false,
				message: '服务器错误'
			});
		}
	}

	// 更新文章
	static async update(req, res) {
		const postId = req.params.id;
		const {
			title,
			content,
			categoryId
		} = req.body;
		const isAdmin = req.user.role === 'admin';

		try {
			const post = await PostModel.getById(postId);
			if(!post) {
				return res.status(404).json({
					success: false,
					message: '文章不存在'
				});
			}

			const updateData = {};
			if(title !== undefined) updateData.title = title;
			if(content !== undefined) updateData.content = content;
			if(categoryId !== undefined) updateData.categoryId = categoryId;

			const success = await PostModel.update(postId, req.userId, updateData, isAdmin);

			if(success) {
				const updatedPost = await PostModel.getById(postId);
				res.json({
					success: true,
					message: '文章更新成功',
					data: updatedPost
				});
			} else {
				res.status(403).json({
					success: false,
					message: '无权修改此文章'
				});
			}
		} catch(err) {
			console.error('更新文章错误:', err);
			res.status(500).json({
				success: false,
				message: '服务器错误'
			});
		}
	}

	// 获取单篇文章（用于编辑）
	static async getById(req, res) {
		const postId = req.params.id;

		try {
			const post = await PostModel.getById(postId);
			if(!post) {
				return res.status(404).json({
					success: false,
					message: '文章不存在'
				});
			}

			res.json({
				success: true,
				data: post
			});
		} catch(err) {
			console.error('获取文章错误:', err);
			res.status(500).json({
				success: false,
				message: '服务器错误'
			});
		}
	}
	
	// 切换置顶状态
	static async togglePin(req, res) {
	    const postId = req.params.id;
	    const isAdmin = req.user.role === 'admin';
	    
	    try {
	        const result = await PostModel.togglePin(postId, req.userId, isAdmin);
	        
	        if (result === null) {
	            return res.status(404).json({ 
	                success: false, 
	                message: '文章不存在或无权操作' 
	            });
	        }
	        
	        res.json({ 
	            success: true, 
	            message: result ? '文章已置顶' : '已取消置顶',
	            isPinned: result
	        });
	    } catch (err) {
	        console.error('切换置顶错误:', err);
	        res.status(500).json({ 
	            success: false, 
	            message: '服务器错误' 
	        });
	    }
	}
}

module.exports = PostController;