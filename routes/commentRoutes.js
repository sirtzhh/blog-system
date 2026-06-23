const express = require('express');
const CommentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 公开路由
router.get('/post/:postId', CommentController.getList);

// 需要登录的路由
router.post('/', authenticate, CommentController.create);
router.delete('/:id', authenticate, CommentController.delete);

module.exports = router;