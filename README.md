# Motion Pump Game

웹캠을 이용한 모션 인식 펌프 게임입니다. TensorFlow.js의 MoveNet 모델을 사용하여 사용자의 포즈를 인식하고, 화면에 나타나는 화살표 방향과 일치하는 동작을 취하면 점수를 획득할 수 있습니다.

## 주요 기능

- 실시간 포즈 인식
- 8방향 모션 인식 (↑, ↗, →, ↘, ↓, ↙, ←, ↖)
- 모바일 지원
- 반응형 디자인

## 기술 스택

- HTML5
- CSS3
- JavaScript
- TensorFlow.js
- MoveNet 모델

## 실행 방법

1. 저장소를 클론합니다:
```bash
git clone https://github.com/[your-username]/pump-game.git
```

2. 프로젝트 디렉토리로 이동:
```bash
cd pump-game
```

3. 로컬 서버를 실행합니다 (예: VS Code Live Server 또는 기타 HTTP 서버)

4. 웹 브라우저에서 `http://localhost:[port]`로 접속합니다.

## 게임 방법

1. 웹캠 권한을 허용합니다.
2. 화면에 나타나는 화살표 방향과 일치하는 포즈를 취합니다.
3. 타이밍에 맞춰 정확한 포즈를 취할수록 높은 점수를 획득할 수 있습니다.

## 주의사항

- 웹캠이 필요합니다
- 최신 버전의 Chrome, Firefox, Safari 브라우저를 권장합니다
- 충분한 조명과 공간이 필요합니다
