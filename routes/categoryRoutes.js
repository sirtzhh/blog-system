const express = require('express');
const CategoryModel = require('../models/categoryModel');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const categories = await CategoryModel.getAll();
        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;