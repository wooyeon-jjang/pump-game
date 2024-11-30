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
let modelLoaded = false;

async function loadPoseDetector() {
    try {
        console.log('모델 로딩 시작...');
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            minPoseScore: 0.2
        };
        detector = await poseDetection.createDetector(model, detectorConfig);
        console.log('모델 로딩 완료!');
        modelLoaded = true;
        return true;
    } catch (error) {
        console.error('모델 로딩 실패:', error);
        return false;
    }
}

async function setupVideo() {
    try {
        console.log('비디오 설정 시작...');
        video = document.getElementById('webcam');
        
        if (!video) {
            throw new Error('웹캠 요소를 찾을 수 없습니다.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 30 }
            }
        });

        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadeddata = () => {
                console.log('비디오 설정 완료!');
                resolve(true);
            };
            video.onerror = () => {
                console.error('비디오 로딩 실패');
                resolve(false);
            };
        });
    } catch (error) {
        console.error('비디오 설정 실패:', error);
        return false;
    }
}

async function init() {
    try {
        console.log('초기화 시작...');
        
        // 캔버스 설정
        videoCanvas = document.getElementById('videoCanvas');
        videoContext = videoCanvas.getContext('2d');
        uiCanvas = document.getElementById('uiCanvas');
        uiContext = uiCanvas.getContext('2d');

        // 비디오 설정
        const videoSuccess = await setupVideo();
        if (!videoSuccess) {
            throw new Error('비디오 설정 실패');
        }

        // 모델 로딩
        const modelSuccess = await loadPoseDetector();
        if (!modelSuccess) {
            throw new Error('모델 로딩 실패');
        }

        // 비디오 크기에 맞게 캔버스 조정
        function resizeCanvases() {
            if (video.videoWidth && video.videoHeight) {
                videoCanvas.width = video.videoWidth;
                videoCanvas.height = video.videoHeight;
                uiCanvas.width = video.videoWidth;
                uiCanvas.height = 100;
                // 점수 표시 위치 업데이트
                scoreDisplayX = uiCanvas.width - 100;
            }
        }

        video.onloadedmetadata = resizeCanvases;
        window.addEventListener('resize', resizeCanvases);

        // 포즈 감지 시작
        await video.play();
        detectPose();
        
        // 게임 시작
        console.log('게임 시작 준비...');
        startGame();
        
        console.log('초기화 완료!');

    } catch (error) {
        console.error('초기화 실패:', error);
        alert('초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    }
}

function startGame() {
    if (isGameRunning) {
        console.log('게임이 이미 실행 중입니다.');
        return;
    }
    
    console.log('게임 시작!');
    isGameRunning = true;
    score = 0;
    lastArrowTime = Date.now();  // 마지막 화살표 생성 시간 초기화

    // 기존 화살표 제거
    arrows.length = 0;

    // 게임 루프 시작
    if (!gameInterval) {
        gameInterval = setInterval(() => {
            const currentTime = Date.now();
            
            // 화살표 생성 조건:
            // 1. 마지막 화살표 생성 후 ARROW_INTERVAL 시간이 지났고
            // 2. 현재 화살표 개수가 MAX_ARROWS보다 적을 때
            if (currentTime - lastArrowTime >= ARROW_INTERVAL && arrows.length < MAX_ARROWS) {
                generateArrow();
                lastArrowTime = currentTime;
            }
            
            // 게임 상태 업데이트
            gameLoop();
            
            // UI 그리기
            drawGameUI();
        }, 1000 / 60); // 60 FPS
        
        console.log('게임 루프 시작됨');
    }
}

function generateArrow() {
    if (arrows.length >= MAX_ARROWS) {
        return;  // 최대 화살표 개수를 초과하면 생성하지 않음
    }
    
    // 랜덤한 방향 선택
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    // 새로운 화살표 생성
    const arrow = {
        x: uiCanvas.width, // 화면 오른쪽 끝에서 시작
        y: arrowY,
        direction: direction,
        active: true,
        checked: false
    };
    
    arrows.push(arrow);
    console.log('새로운 화살표 생성:', direction);
}

function gameLoop() {
    if (!isGameRunning) return;

    // 화살표 이동
    arrows.forEach(arrow => {
        if (arrow.active) {
            arrow.x += arrowSpeed;
            
            // 화살표가 점수 영역에 있을 때 포즈 체크
            if (!arrow.checked && 
                arrow.x <= targetX + scoreZones.good.width/2 && 
                arrow.x >= targetX - scoreZones.good.width/2) {
                
                // 현재 손의 방향 가져오기
                const pose = poses && poses[0];
                if (pose) {
                    const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
                    const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
                    const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
                    const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');

                    let leftHandDir = null;
                    let rightHandDir = null;

                    if (leftShoulder && leftWrist && leftShoulder.score > 0.3 && leftWrist.score > 0.3) {
                        leftHandDir = getHandDirection(leftShoulder, leftWrist);
                    }
                    if (rightShoulder && rightWrist && rightShoulder.score > 0.3 && rightWrist.score > 0.3) {
                        rightHandDir = getHandDirection(rightShoulder, rightWrist);
                    }

                    // 손의 방향이 화살표와 일치하는지 확인
                    if (leftHandDir === arrow.direction || rightHandDir === arrow.direction) {
                        // 점수 영역에 따른 점수 계산
                        let addedScore = 0;
                        const arrowCenter = Math.abs(arrow.x - targetX);
                        
                        if (arrowCenter <= scoreZones.wow.width/2) {
                            addedScore = scoreZones.wow.score;
                            console.log('WOW! +' + addedScore);
                        } else if (arrowCenter <= scoreZones.perfect.width/2) {
                            addedScore = scoreZones.perfect.score;
                            console.log('Perfect! +' + addedScore);
                        } else if (arrowCenter <= scoreZones.good.width/2) {
                            addedScore = scoreZones.good.score;
                            console.log('Good! +' + addedScore);
                        }

                        if (addedScore > 0) {
                            score += addedScore;
                            arrow.active = false; // 점수를 얻은 화살표는 비활성화
                        }
                    }
                }
                arrow.checked = true; // 체크 완료 표시
            }
            
            // 화면 왼쪽을 벗어난 화살표 처리
            if (arrow.x + arrowWidth < 0) {
                arrow.active = false;
                if (!arrow.checked) {
                    console.log('화살표 놓침!');
                }
            }
        }
    });

    // 비활성화된 화살표 제거
    for (let i = arrows.length - 1; i >= 0; i--) {
        if (!arrows[i].active) {
            arrows.splice(i, 1);
        }
    }
}

function drawGameUI() {
    if (!isGameRunning) return;

    // UI 캔버스 초기화
    uiContext.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    
    // 목표 영역 그리기
    Object.values(scoreZones).forEach(zone => {
        uiContext.fillStyle = zone.color;
        uiContext.fillRect(targetX - zone.width / 2, 0, zone.width, arrowLayerHeight);
    });

    // 화살표 그리기
    arrows.forEach(arrow => {
        if (arrow.active) {
            uiContext.font = `${arrowWidth}px Arial`;
            uiContext.fillStyle = 'white';
            uiContext.textAlign = 'center';
            uiContext.textBaseline = 'middle';
            uiContext.fillText(arrow.direction, arrow.x, arrow.y);

            // 디버그용: 화살표의 x 좌표 표시
            uiContext.font = '12px Arial';
            uiContext.fillText(`x: ${Math.round(arrow.x)}`, arrow.x, arrow.y + 30);
        }
    });

    // 점수 표시
    uiContext.font = '24px Arial';
    uiContext.fillStyle = 'white';
    uiContext.textAlign = 'right';
    uiContext.fillText(`Score: ${score}`, scoreDisplayX, scoreDisplayY);
}

async function detectPose() {
    try {
        if (!detector || !video || !modelLoaded) {
            console.log('아직 준비되지 않음:', {
                detector: !!detector,
                video: !!video,
                modelLoaded: modelLoaded
            });
            requestAnimationFrame(detectPose);
            return;
        }

        if (video.readyState < 2) {
            requestAnimationFrame(detectPose);
            return;
        }

        // 비디오 프레임을 캔버스에 그리기
        videoContext.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
        
        // 포즈 감지
        poses = await detector.estimatePoses(videoCanvas, {
            maxPoses: 1,
            flipHorizontal: false
        });
        
        if (poses && poses.length > 0) {
            const pose = poses[0];
            
            // 필요한 키포인트만 추출
            const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
            const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
            const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
            const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');

            // 손의 방향 계산
            let leftHandDirection = '감지안됨';
            let rightHandDirection = '감지안됨';

            if (leftShoulder && leftWrist && leftShoulder.score > 0.3 && leftWrist.score > 0.3) {
                leftHandDirection = getHandDirection(leftShoulder, leftWrist);
            }
            if (rightShoulder && rightWrist && rightShoulder.score > 0.3 && rightWrist.score > 0.3) {
                rightHandDirection = getHandDirection(rightShoulder, rightWrist);
            }

            // 1초에 한 번만 상태 출력
            const now = Date.now();
            if (now - lastLogTime > 1000) {
                console.log('현재 손의 방향:', {
                    왼손: leftHandDirection,
                    오른손: rightHandDirection
                });
                lastLogTime = now;
            }

            // 감지된 포인트 시각화
            [leftShoulder, rightShoulder, leftWrist, rightWrist].forEach(point => {
                if (point && point.score > 0.3) {
                    videoContext.beginPath();
                    videoContext.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                    videoContext.fillStyle = point.name.includes('wrist') ? 'red' : 'blue';
                    videoContext.fill();
                }
            });

            // 어깨와 손목 연결선 그리기
            if (leftShoulder && leftWrist && leftShoulder.score > 0.3 && leftWrist.score > 0.3) {
                videoContext.beginPath();
                videoContext.moveTo(leftShoulder.x, leftShoulder.y);
                videoContext.lineTo(leftWrist.x, leftWrist.y);
                videoContext.strokeStyle = 'yellow';
                videoContext.lineWidth = 2;
                videoContext.stroke();
            }
            if (rightShoulder && rightWrist && rightShoulder.score > 0.3 && rightWrist.score > 0.3) {
                videoContext.beginPath();
                videoContext.moveTo(rightShoulder.x, rightShoulder.y);
                videoContext.lineTo(rightWrist.x, rightWrist.y);
                videoContext.strokeStyle = 'yellow';
                videoContext.lineWidth = 2;
                videoContext.stroke();
            }
        }

        requestAnimationFrame(detectPose);
    } catch (error) {
        console.error('포즈 감지 오류:', error);
        requestAnimationFrame(detectPose);
    }
}

function getHandDirection(shoulder, wrist) {
    // 손목과 어깨의 상대적 위치로 방향 계산
    const dx = wrist.x - shoulder.x;
    const dy = wrist.y - shoulder.y;
    // 좌우, 상하 모두 반전
    const adjustedDx = -dx;
    const adjustedDy = -dy;
    
    // 각도 계산 (라디안)
    let angle = Math.atan2(adjustedDy, adjustedDx);
    // 각도를 도수로 변환
    angle = angle * (180 / Math.PI);
    
    // 각도를 0-360 범위로 조정
    if (angle < 0) {
        angle += 360;
    }
    
    // 8방향 매핑
    if (angle >= 337.5 || angle < 22.5) return '→';
    if (angle >= 22.5 && angle < 67.5) return '↗';
    if (angle >= 67.5 && angle < 112.5) return '↑';
    if (angle >= 112.5 && angle < 157.5) return '↖';
    if (angle >= 157.5 && angle < 202.5) return '←';
    if (angle >= 202.5 && angle < 247.5) return '↙';
    if (angle >= 247.5 && angle < 292.5) return '↓';
    if (angle >= 292.5 && angle < 337.5) return '↘';
    
    return '→'; // 기본값
}

// 마지막 로그 시간 초기화
let lastLogTime = 0;

// 게임 상태 변수들
const arrows = [];
const arrowSpeed = -5;  // 음수로 변경하여 오른쪽에서 왼쪽으로 이동
const arrowWidth = 50;
const arrowHeight = 50;
const arrowY = 50;  // UI 캔버스의 중앙
const targetX = 100;  // 목표 영역을 왼쪽으로 이동 (100px 지점)
const arrowLayerHeight = 100;  // 화살표 레이어의 높이
const scoreDisplayY = 35;  // 점수 표시 Y 좌표
const MAX_ARROWS = 3;  // 화면에 표시될 최대 화살표 개수
let scoreDisplayX;  // 점수 표시 X 좌표는 canvas 초기화 후 설정
let lastArrowTime = 0;  // 마지막 화살표 생성 시간
const ARROW_INTERVAL = 2000;  // 화살표 생성 간격 (2초)

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

// 페이지 로드 시 초기화 시작
document.addEventListener('DOMContentLoaded', init);

function checkPoseMatchAtTarget(direction) {
    if (!poses || poses.length === 0) {
        console.log('포즈가 감지되지 않음');
        return false;
    }

    const keypoints = poses[0].keypoints;
    const leftShoulder = keypoints[5];
    const leftWrist = keypoints[9];
    const rightShoulder = keypoints[6];
    const rightWrist = keypoints[10];

    // 좌우 반전된 카메라에 맞춰 방향 계산 수정
    const leftAngle = calculateAngle(leftShoulder, leftWrist);
    const rightAngle = calculateAngle(rightShoulder, rightWrist);

    // 디버깅을 위한 시각적 피드백
    if (videoContext) {
        // 인식된 포인트 표시
        [leftShoulder, leftWrist, rightShoulder, rightWrist].forEach(point => {
            if (point && isPointVisible(point)) {
                videoContext.fillStyle = 'rgba(0, 255, 0, 0.6)';
                videoContext.beginPath();
                videoContext.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                videoContext.fill();
            }
        });

        // 각도 표시 (화면에 더 크게 표시)
        videoContext.fillStyle = 'white';
        videoContext.font = 'bold 24px Arial';
        if (leftAngle !== null) {
            videoContext.fillText(`Left: ${Math.round(leftAngle)}°`, 10, 30);
        }
        if (rightAngle !== null) {
            videoContext.fillText(`Right: ${Math.round(rightAngle)}°`, 10, 60);
        }
        // 목표 방향 표시
        videoContext.fillText(`Target: ${direction}`, 10, 90);
    }

    // 자세한 디버깅 로그
    console.log('=== 포즈 체크 정보 ===');
    console.log(`목표 방향: ${direction}`);
    console.log(`왼쪽 각도: ${Math.round(leftAngle)}°`);
    console.log(`오른쪽 각도: ${Math.round(rightAngle)}°`);
    console.log(`왼쪽 포인트 신뢰도: ${leftShoulder?.score.toFixed(2)}, ${leftWrist?.score.toFixed(2)}`);
    console.log(`오른쪽 포인트 신뢰도: ${rightShoulder?.score.toFixed(2)}, ${rightWrist?.score.toFixed(2)}`);

    // 각도 범위 정의 (좌우 반전 고려, 범위를 더 넓게 조정)
    const angleRanges = {
        '↑': { min: -30, max: 30 },
        '↗': { min: 15, max: 75 },
        '→': { min: 60, max: 120 },
        '↘': { min: 105, max: 165 },
        '↓': { min: 150, max: 210 },
        '↙': { min: 195, max: 255 },
        '←': { min: 240, max: 300 },
        '↖': { min: 285, max: 345 }
    };

    // 좌우 반전을 고려한 방향 매칭
    const range = angleRanges[direction];
    const leftMatch = isAngleInRange(leftAngle, range.min, range.max);
    const rightMatch = isAngleInRange(rightAngle, range.min, range.max);

    console.log(`허용 범위: ${range.min}° ~ ${range.max}°`);
    console.log(`매칭 결과: 왼쪽=${leftMatch}, 오른쪽=${rightMatch}`);

    if (leftMatch || rightMatch) {
        console.log('✨ 방향 매치 성공! ✨');
        // 성공 시 시각적 피드백
        if (videoContext) {
            videoContext.fillStyle = 'rgba(0, 255, 0, 0.3)';
            videoContext.fillRect(0, 0, videoCanvas.width, videoCanvas.height);
        }
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

function isPointVisible(point) {
    // 점수가 너무 낮거나 좌표가 화면 밖이면 false 반환
    if (point.score < 0.2) return false; 
    
    // 캔버스 크기를 기준으로 확인
    const isXVisible = point.x >= 0 && point.x <= videoCanvas.width;
    const isYVisible = point.y >= 0 && point.y <= videoCanvas.height;
    
    return isXVisible && isYVisible;
}
