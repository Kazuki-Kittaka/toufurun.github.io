const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiLayer = document.getElementById('uiLayer');
const titleScreen = document.getElementById('titleScreen');
const resultScreen = document.getElementById('resultScreen');
const resultMessage = document.getElementById('resultMessage');
const restartBtn = document.getElementById('restartBtn');
const nextBtn = document.getElementById('nextBtn');
const clearImage = document.getElementById('clearImage');

let gameState = 'TITLE'; 
let stage = 1;
let difficulty = 'NORMAL';
let frames = 0;
let distance = 0;
let gameSpeed = 5;
let nextObstacleFrame = 0;

const player = {
    x: 100, y: 300, width: 40, height: 40,
    dy: 0, jumpPower: -15, gravity: 0.8,
    grounded: false, color: '#F4D03F', type: '大豆'
};

let obstacles = [];
let floors = [];
let goal = null;

// ★花火用の変数
let particles = [];

// 定数
const GROUND_Y = 380; 

// イベントリスナー
document.addEventListener('keydown', (e) => { if (e.code === 'Space') jump(); });
document.addEventListener('touchstart', jump);
document.addEventListener('mousedown', jump);

function jump() {
    if (gameState === 'PLAYING' && player.grounded) {
        player.dy = player.jumpPower;
        player.grounded = false;
    }
}

// 難易度設定
const DIFFICULTY_SETTINGS = {
    'EASY':   { speedBase: 4,  spawnRateMin: 120, spawnRateMax: 180, gapChance: 0 },
    'NORMAL': { speedBase: 6,  spawnRateMin: 80,  spawnRateMax: 140, gapChance: 0 },
    'HARD':   { speedBase: 9,  spawnRateMin: 40,  spawnRateMax: 90,  gapChance: 0.4 }
};

// --- ゲーム制御関数 ---

function startGame(d) { 
    difficulty = d; 
    stage = 1; 
    resetStage(); 
}

function showTitle() {
    gameState = 'TITLE';
    uiLayer.style.background = 'rgba(0,0,0,0.4)';
    titleScreen.style.display = 'block';
    resultScreen.style.display = 'none';
    clearImage.style.display = 'none';
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#87CEEB'; ctx.fillRect(0,0,canvas.width,canvas.height);
}

function nextStage() { 
    stage++; 
    if (stage > 3) stage = 1; 
    resetStage(); 
}

function resetStage() {
    gameState = 'PLAYING';
    uiLayer.style.background = 'transparent';
    titleScreen.style.display = 'none';
    resultScreen.style.display = 'none';
    clearImage.style.display = 'none';

    frames = 0; distance = 0;
    obstacles = []; goal = null;
    particles = []; // 花火リセット
    
    // 床の初期化
    floors = [{ x: 0, y: GROUND_Y, width: canvas.width + 200 }];

    player.y = 300; player.dy = 0;
    
    const setting = DIFFICULTY_SETTINGS[difficulty];
    gameSpeed = setting.speedBase + (stage - 1);

    if (stage === 1) { 
        player.color = '#F4D03F'; player.type = '大豆';
        player.width = 40; player.height = 40; 
    }
    else if (stage === 2) { 
        player.color = '#F0F8FF'; player.type = '豆乳';
        player.width = 40; player.height = 40;
    }
    else if (stage === 3) { 
        player.color = '#FFFFFF'; player.type = '豆腐';
        player.width = 40; player.height = 40;
    }

    setNextObstacle();
    loop();
}

function setNextObstacle() {
    const setting = DIFFICULTY_SETTINGS[difficulty];
    const randomInterval = Math.floor(Math.random() * (setting.spawnRateMax - setting.spawnRateMin + 1)) + setting.spawnRateMin;
    nextObstacleFrame = frames + randomInterval;
}

function updateFloors() {
    if (floors[0].x + floors[0].width < 0) floors.shift();

    const lastFloor = floors[floors.length - 1];
    if (lastFloor.x + lastFloor.width < canvas.width + 100) {
        const setting = DIFFICULTY_SETTINGS[difficulty];
        let gap = 0;
        if (setting.gapChance > 0 && Math.random() < setting.gapChance && distance < 2000) {
            gap = Math.random() * 80 + 80;
        }
        const newWidth = Math.random() * 300 + 400;
        floors.push({
            x: lastFloor.x + lastFloor.width + gap,
            y: GROUND_Y,
            width: newWidth
        });
    }

    if (gameState !== 'CRUSHING') {
        for (let floor of floors) floor.x -= gameSpeed;
    }
}

function startCrush() {
    if (gameState === 'CRUSHING' || gameState === 'GAMEOVER') return;
    gameState = 'CRUSHING';
    player.dy = 0;
}

// メインループ
function loop() {
    if (gameState !== 'PLAYING' && gameState !== 'CRUSHING') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    updateFloors();
    ctx.fillStyle = '#654321';
    for (let floor of floors) ctx.fillRect(floor.x, floor.y, floor.width, 70);

    // プレイヤー処理
    if (gameState === 'CRUSHING') {
        if (player.height > 10) {
            player.height -= 4; 
            player.width += 4;  
            player.y += 4;      
            player.x -= 2;      
        } else {
            gameOver();
            return;
        }
    } else {
        player.dy += player.gravity;
        player.y += player.dy;

        let onGround = false;
        const footX = player.x + player.width / 2;
        const footY = player.y + player.height;

        for (let floor of floors) {
            if (footX > floor.x && footX < floor.x + floor.width) {
                if (footY >= floor.y && footY <= floor.y + 20) onGround = true;
            }
        }

        if (onGround && player.dy >= 0) {
            player.y = GROUND_Y - player.height;
            player.dy = 0;
            player.grounded = true;
        } else {
            player.grounded = false;
        }

        if (player.y > canvas.height) {
            gameOver();
            return;
        }
    }
    
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // 目の描画
    if (gameState === 'CRUSHING') {
        ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x + player.width - 15, player.y + 5);
        ctx.lineTo(player.x + player.width - 5, player.y + 15);
        ctx.moveTo(player.x + player.width - 5, player.y + 5);
        ctx.lineTo(player.x + player.width - 15, player.y + 15);
        ctx.stroke();
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(player.x + player.width - 10, player.y + 10, 5, 5);
    }

    // 障害物処理
    if (!goal && frames >= nextObstacleFrame && gameState !== 'CRUSHING') {
        const setting = DIFFICULTY_SETTINGS[difficulty];
        let obsY = GROUND_Y - 50;
        let obsH = 50;

        if (difficulty !== 'EASY') {
            if (Math.random() < 0.3) { obsY = GROUND_Y - 90; obsH = 40; }
            if (difficulty === 'HARD' && Math.random() < 0.5) obsY = GROUND_Y - 70;
        }

        obstacles.push({ x: canvas.width, y: obsY, width: 30, height: obsH, color: '#FF4500' });
        setNextObstacle();
    }

    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        if (gameState !== 'CRUSHING') obs.x -= gameSpeed;
        
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        if (gameState === 'PLAYING') {
            if (player.x < obs.x + obs.width && player.x + player.width > obs.x &&
                player.y < obs.y + obs.height && player.y + player.height > obs.y) {
                startCrush();
            }
        }
    }

    // ゴール処理
    if (!goal) {
        if (gameState !== 'CRUSHING') {
            distance += gameSpeed;
            if (distance > 2000 + (stage * 500)) {
                 goal = { x: canvas.width, y: 0, width: 30, height: canvas.height };
            }
        }
    } else {
        if (gameState !== 'CRUSHING') goal.x -= gameSpeed;
        
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial'; 
        ctx.fillText('FINISH LINE', goal.x - 140, canvas.height / 2);

        if (player.x < goal.x + goal.width && player.x + player.width > goal.x) {
            stageClear();
        }
    }

    ctx.fillStyle = 'black'; ctx.font = '20px Arial';
    ctx.fillText(`STAGE: ${stage} (${difficulty})`, 20, 40);

    frames++;
    requestAnimationFrame(loop);
}

function gameOver() {
    gameState = 'GAMEOVER';
    uiLayer.style.background = 'rgba(0,0,0,0.6)';
    resultScreen.style.display = 'block';
    resultMessage.innerText = "GAME OVER...";
    resultMessage.style.color = "#FF5252";
    restartBtn.style.display = 'inline-block';
    nextBtn.style.display = 'none';
}

function stageClear() {
    gameState = 'CLEAR_ANIMATION'; 
    uiLayer.style.background = 'rgba(0,0,0,0.7)';
    
    let imgSrc = '';
    if (stage === 1) imgSrc = 'img/shutterstock_644160322.jpg';
    else if (stage === 2) imgSrc = 'img/col_239.webp';
    else imgSrc = 'img/b0610bb2f743bef065d7c8bc8cab35d2_t.jpeg';
    
    clearImage.src = imgSrc;
    clearImage.style.display = 'block';

    setTimeout(() => {
        clearImage.style.display = 'none';
        showResultButtons();
    }, 3000);
}

function showResultButtons() {
    gameState = 'CLEAR';
    resultScreen.style.display = 'block';
    
    // ★重要：これまで文字が見えなかったのは、この行が抜けていたためです！
    resultMessage.style.display = 'block'; 
    
    // ステージ3（全クリ）の特別処理
    if (stage === 3) {
        // UIの背景を透明にして、花火をきれいに見せる
        uiLayer.style.background = 'transparent';

        // 感動のメッセージ
        resultMessage.innerHTML = "ゲームクリア！<br><span style='font-size:30px'>無事においしく食べられました。</span>";
        resultMessage.style.color = "#FFD700"; // 金色文字
        
        // ★最初はボタンを隠す（余韻を作るため）
        restartBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        
        // 花火ループ開始
        gameState = 'ALL_CLEAR'; 
        particles = []; 
        fireworksLoop();

        // ★5秒後(5000ミリ秒後)に「タイトルへ」ボタンをひょっこり表示
        setTimeout(() => {
             restartBtn.style.display = 'inline-block';
             restartBtn.innerText = "タイトルへ";
        }, 5000);

    } else {
        // 通常ステージのクリア処理（こちらはすぐボタンを出す）
        uiLayer.style.background = 'rgba(0,0,0,0.6)'; // 背景を少し暗く
        resultMessage.innerText = "STAGE CLEAR!";
        resultMessage.style.color = "#4CAF50";
        
        restartBtn.style.display = 'inline-block'; 
        restartBtn.innerText = "タイトルへ";
        nextBtn.style.display = 'inline-block';
    }
}

// ★花火アニメーション用ループ関数
function fireworksLoop() {
    if (gameState !== 'ALL_CLEAR') return;

    // 背景を少し残しながら塗りつぶす（残像効果）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 新しい花火をランダムに打ち上げ（確率で生成）
    if (Math.random() < 0.05) {
        createFirework(
            Math.random() * canvas.width, 
            Math.random() * canvas.height / 2
        );
    }

    // パーティクルの更新と描画
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // 重力
        p.alpha -= 0.01; // 徐々に消える

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // 消えたら削除
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
    ctx.globalAlpha = 1.0; // 透明度戻す

    requestAnimationFrame(fireworksLoop);
}

// ★花火の粒子を作る関数
function createFirework(x, y) {
    const particleCount = 50;
    const colors = ['#FF0000', '#FFD700', '#00FF00', '#00FFFF', '#FF00FF'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 1,
            color: color,
            alpha: 1.0
        });
    }
}

// 初期画面の背景描画
ctx.fillStyle = '#87CEEB'; 
ctx.fillRect(0, 0, canvas.width, canvas.height);