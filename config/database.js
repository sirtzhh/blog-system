const mysql = require('mysql2');

// 从环境变量读取数据库配置
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'mysql.railway.internal',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'DPmoMBlqqhIIrywtgMiHBEdvXeSLTEap',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    // Railway 内部网络不需要 SSL，如果用外部代理则需要
    // ssl: { rejectUnauthorized: false }
});

const promisePool = pool.promise();

async function testConnection() {
    try {
        const connection = await promisePool.getConnection();
        console.log('✅ MySQL 数据库连接成功！');
        connection.release();
        return true;
    } catch (err) {
        console.error('❌ MySQL 数据库连接失败:', err.message);
        return false;
    }
}

// 启动时测试连接
testConnection();

module.exports = promisePool;