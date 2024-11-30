let detector;
let poses;
let video;
let videoCanvas;
let videoContext;
let uiCanvas;
let uiContext;
let score = 0;
let gameInterval;
let isGameRunning = false;

// 게임 상태 변수들
const arrows = [];
const arrowSpeed = -5;  // 음수로 변경하여 오른쪽에서 왼쪽으로 이동
const arrowWidth = 50;
const arrowHeight = 50;
const arrowY = 50;  // UI 캔버스의 중앙
const targetX = 100;  // 목표 영역을 왼쪽으로 이동 (100px 지점)
const arrowLayerHeight = 100;  // 화살표 레이어의 높이
const scoreDisplayY = 35;  // 점수 표시 Y 좌표
let scoreDisplayX;  // 점수 표시 X 좌표는 canvas 초기화 후 설정

const directions = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

// 점수 영역 설정
const scoreZones = {
    wow: {
        width: 30,
        score: 100,
        color: 'rgba(255, 215, 0, 0.3)'  // 금색
    },
    perfect: {
        width: 60,
        score: 70,
        color: 'rgba(255, 0, 0, 0.3)'  // 빨간색
    },
    good: {
        width: 100,
        score: 40,
        color: 'rgba(0, 255, 0, 0.3)'  // 초록색
    }
};

async function init() {
    try {
        video = document.getElementById('webcam');
        videoCanvas = document.getElementById('videoCanvas');
        videoContext = videoCanvas.getContext('2d');
        uiCanvas = document.getElementById('uiCanvas');
        uiContext = uiCanvas.getContext('2d');

        // 모바일 카메라 설정
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };

        // 카메라 스트림 시작
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        // 비디오 로드 완료 대기
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });

        // 캔버스 크기 설정
        function resizeCanvases() {
            const container = document.querySelector('.camera-view');
            const width = container.clientWidth;
            const height = container.clientHeight;

            videoCanvas.width = width;
            videoCanvas.height = height;
            uiCanvas.width = width;
            
            // UI 캔버스 높이는 화면 크기에 따라 조정
            uiCanvas.height = window.innerWidth <= 640 ? 80 : 100;
            
            // 점수 표시 위치 업데이트
            scoreDisplayX = uiCanvas.width - 100;
        }

        // 초기 크기 설정 및 리사이즈 이벤트 리스너 추가
        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);

        // 모델 초기화
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true
        };
        detector = await poseDetection.createDetector(model, detectorConfig);

        // 게임 시작
        startGame();
        
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
        alert('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
    }
}

// 페이지 로드 시 초기화 시작
document.addEventListener('DOMContentLoaded', init);

async function detectPose() {
    try {
        if (!detector || !video) return;

        poses = await detector.estimatePoses(video);
        // 다음 프레임 요청
        requestAnimationFrame(detectPose);
    } catch (error) {
        console.error('포즈 감지 중 오류 발생:', error);
    }
}

function startGame() {
    if (isGameRunning) return;
    
    isGameRunning = true;
    score = 0;
    
    // 시작 버튼 비활성화
    const startButton = document.getElementById('startButton');
    startButton.textContent = 'Game Running...';
    startButton.disabled = true;

    // 게임 루프 시작
    requestAnimationFrame(gameLoop);
    // 화살표 생성 시작
    generateArrow();
}

function stopGame() {
    isGameRunning = false;
    score = 0;
    arrows.length = 0;  // 모든 화살표 제거

    // 시작 버튼 다시 활성화
    const startButton = document.getElementById('startButton');
    startButton.textContent = 'Start Game';
    startButton.disabled = false;
}

function generateArrow() {
    if (!isGameRunning) return;

    const direction = directions[Math.floor(Math.random() * directions.length)];
    const arrow = {
        direction: direction,
        x: uiCanvas.width - arrowWidth,  // 오른쪽 끝에서 시작
        y: arrowY,
        checked: false,
        scored: false
    };
    arrows.push(arrow);

    // 2초마다 새로운 화살표 생성
    setTimeout(generateArrow, 2000);
}

function gameLoop() {
    if (!isGameRunning) return;

    // 비디오 캔버스 업데이트
    videoContext.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
    
    // 비디오를 좌우 반전하여 그리기
    videoContext.save();
    videoContext.scale(-1, 1);
    videoContext.translate(-videoCanvas.width, 0);
    videoContext.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
    videoContext.restore();

    // UI 캔버스 업데이트
    uiContext.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    drawGameUI();

    // 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

function drawGameUI() {
    // 점수 영역 그리기
    // good 존 (가장 넓은 영역)
    uiContext.fillStyle = scoreZones.good.color;
    uiContext.fillRect(targetX - scoreZones.good.width/2, 0, scoreZones.good.width, uiCanvas.height);
    
    // perfect 존 (중간 영역)
    uiContext.fillStyle = scoreZones.perfect.color;
    uiContext.fillRect(targetX - scoreZones.perfect.width/2, 0, scoreZones.perfect.width, uiCanvas.height);
    
    // wow 존 (가장 좁은 영역)
    uiContext.fillStyle = scoreZones.wow.color;
    uiContext.fillRect(targetX - scoreZones.wow.width/2, 0, scoreZones.wow.width, uiCanvas.height);

    // 화살표 업데이트 및 그리기
    for (let i = arrows.length - 1; i >= 0; i--) {
        const arrow = arrows[i];
        
        // 화살표 이동 (오른쪽에서 왼쪽으로)
        arrow.x += arrowSpeed;

        // 화살표가 목표 영역에 도달했고 아직 체크되지 않았다면
        if (!arrow.checked && 
            arrow.x <= targetX + scoreZones.good.width/2 && 
            arrow.x + arrowWidth >= targetX - scoreZones.good.width/2) {
            arrow.checked = true;
            
            if (checkPoseMatchAtTarget(arrow.direction)) {
                const zoneScore = checkScoreZone(arrow);
                if (zoneScore) {
                    score += zoneScore;
                    
                    // 점수 텍스트 표시
                    uiContext.fillStyle = 'yellow';
                    uiContext.font = 'bold 24px Arial';
                    uiContext.textAlign = 'center';
                    uiContext.fillText(`+${zoneScore}`, arrow.x + arrowWidth/2, arrowY + arrowHeight/2);
                }
            }
        }

        // 화살표가 화면을 벗어나면 제거
        if (arrow.x + arrowWidth < 0) {  // 왼쪽으로 벗어날 때 제거
            arrows.splice(i, 1);
            continue;
        }

        // 화살표 그리기
        uiContext.fillStyle = 'rgba(0, 0, 255, 0.7)';
        uiContext.fillRect(arrow.x, arrowY - arrowHeight/2, arrowWidth, arrowHeight);
        
        // 화살표 방향 텍스트
        uiContext.fillStyle = 'white';
        uiContext.font = '24px Arial';
        uiContext.textAlign = 'center';
        uiContext.textBaseline = 'middle';
        uiContext.fillText(arrow.direction, arrow.x + arrowWidth/2, arrowY);
    }

    // 점수 표시
    uiContext.fillStyle = 'white';
    uiContext.font = 'bold 24px Arial';
    uiContext.textAlign = 'right';
    uiContext.fillText(`Score: ${score}`, scoreDisplayX, scoreDisplayY);
}

function getHandDirection(shoulder, wrist) {
    // 어깨나 손목이 없거나 화면 밖에 있으면 null 반환
    if (!shoulder || !wrist || 
        !isPointVisible(shoulder) || !isPointVisible(wrist)) {
        return null;
    }

    // 어깨에서 손목까지의 벡터 계산
    const vector = {
        x: wrist.x - shoulder.x,
        y: wrist.y - shoulder.y
    };

    // 각도 계산 (y축이 아래로 증가하므로 y를 반전)
    let angle = Math.atan2(-vector.y, vector.x);
    
    // 각도를 도(degree)로 변환
    angle = angle * (180 / Math.PI);
    
    // 각도를 0-360 범위로 조정
    if (angle < 0) {
        angle += 360;
    }

    return angle;
}

// 점이 화면 안에 있는지 확인하는 함수
function isPointVisible(point) {
    // 점수가 너무 낮거나 좌표가 화면 밖이면 false 반환
    if (point.score < 0.3) return false;
    
    // 캔버스 크기를 기준으로 확인
    const isXVisible = point.x >= 0 && point.x <= videoCanvas.width;
    const isYVisible = point.y >= 0 && point.y <= videoCanvas.height;
    
    return isXVisible && isYVisible;
}

function checkPoseMatchAtTarget(direction) {
    if (!poses || poses.length === 0) return false;

    const keypoints = poses[0].keypoints;
    const leftShoulder = keypoints[5];
    const leftWrist = keypoints[9];
    const rightShoulder = keypoints[6];
    const rightWrist = keypoints[10];

    // 좌우 반전된 카메라에 맞춰 방향 계산 수정
    const leftAngle = calculateAngle(leftShoulder, leftWrist);
    const rightAngle = calculateAngle(rightShoulder, rightWrist);

    console.log('방향 체크:', {
        targetDirection: direction,
        leftAngle: leftAngle,
        rightAngle: rightAngle,
        leftVisible: isPointVisible(leftShoulder) && isPointVisible(leftWrist),
        rightVisible: isPointVisible(rightShoulder) && isPointVisible(rightWrist)
    });

    // 각도 범위 정의 (좌우 반전 고려)
    const angleRanges = {
        '↑': { min: -20, max: 20 },
        '↗': { min: 20, max: 70 },
        '→': { min: 70, max: 110 },
        '↘': { min: 110, max: 160 },
        '↓': { min: 160, max: 200 },
        '↙': { min: 200, max: 250 },
        '←': { min: 250, max: 290 },
        '↖': { min: 290, max: 340 }
    };

    // 좌우 반전을 고려한 방향 매칭
    const range = angleRanges[direction];
    const leftMatch = isAngleInRange(leftAngle, range.min, range.max);
    const rightMatch = isAngleInRange(rightAngle, range.min, range.max);

    if (leftMatch || rightMatch) {
        console.log('방향 매치 성공!', direction);
    }

    return leftMatch || rightMatch;
}

function calculateAngle(shoulder, wrist) {
    // 어깨나 손목이 없거나 화면 밖에 있으면 null 반환
    if (!shoulder || !wrist || 
        !isPointVisible(shoulder) || !isPointVisible(wrist)) {
        return null;
    }

    // 어깨에서 손목까지의 벡터 계산
    const vector = {
        x: wrist.x - shoulder.x,
        y: wrist.y - shoulder.y
    };

    // 각도 계산 (y축이 아래로 증가하므로 y를 반전)
    let angle = Math.atan2(-vector.y, vector.x);
    
    // 각도를 도(degree)로 변환
    angle = angle * (180 / Math.PI);
    
    // 각도를 0-360 범위로 조정
    if (angle < 0) {
        angle += 360;
    }

    console.log('각도 계산:', {
        shoulderPos: { x: shoulder.x, y: shoulder.y },
        wristPos: { x: wrist.x, y: wrist.y },
        calculatedAngle: angle
    });

    return angle;
}

function isAngleInRange(angle, min, max) {
    if (angle === null) return false;
    if (min > max) {  // 범위가 0을 걸치는 경우 (예: 315 ~ 45)
        return angle >= min || angle <= max;
    }
    return angle >= min && angle <= max;
}

function checkScoreZone(arrow) {
    if (arrow.scored) return null;

    const arrowCenter = arrow.x + arrowWidth/2;
    const targetCenter = targetX;
    const distance = Math.abs(arrowCenter - targetCenter);

    if (distance <= scoreZones.wow.width/2) {
        arrow.scored = true;
        return scoreZones.wow.score;
    } else if (distance <= scoreZones.perfect.width/2) {
        arrow.scored = true;
        return scoreZones.perfect.score;
    } else if (distance <= scoreZones.good.width/2) {
        arrow.scored = true;
        return scoreZones.good.score;
    }
    
    return null;
}
