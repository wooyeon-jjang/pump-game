const express = require('express');
const app = express();
const path = require('path');

// 보안 및 캐시 헤더 설정
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path) => {
        // JavaScript 파일에 대한 특별한 캐시 설정
        if (path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
        // CSS 파일에 대한 캐시 설정
        else if (path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1시간 캐시
        }
        // 이미지 파일에 대한 캐시 설정
        else if (path.match(/\.(jpg|jpeg|png|gif|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐시
        }
    }
}));

// 기본 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
