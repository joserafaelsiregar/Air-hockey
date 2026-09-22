import { Vector2D } from './engine/Vector2D.js';
import { PhysicsEngine } from './engine/Physics.js';
import { ParticleSystem } from './engine/Particles.js';
import { Renderer } from './engine/Renderer.js';
import { SoundFX } from './audio/SoundFX.js';
import { Puck } from './entities/Puck.js';
import { Mallet } from './entities/Mallet.js';
import { AIController } from './systems/AIController.js';
import { TournamentManager, TOURNAMENT_STAGES } from './systems/Tournament.js';
import { ChallengeManager, CHALLENGE_LEVELS } from './systems/Challenges.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.sound = new SoundFX();
        this.particles = new ParticleSystem();
        this.renderer = new Renderer(this.canvas);
        this.tournament = new TournamentManager();
        this.challenges = new ChallengeManager();

        // Game Configuration & State
        this.state = 'MENU'; // 'MENU', 'COUNTDOWN', 'PLAYING', 'PAUSED', 'GOAL_CELEBRATION', 'GAME_OVER'
        this.mode = 'vs_ai'; // 'vs_ai', 'pvp', 'tournament', 'challenge'
        this.targetScore = 7;
        this.difficulty = 'medium';
        this.menuSelectedDifficulty = 'medium';
        this.selectedSkin = 'cyber-cyan';
        this.selectedArena = 'cyberpunk';

        // Table Setup
        this.table = {
            width: 900,
            height: 500,
            goalHeight: 160,
            goalY: 250,
            bounds: { left: 40, right: 940, top: 40, bottom: 540 }
        };

        this.physics = new PhysicsEngine(this.table);

        // Entities
        this.puck = new Puck(490, 290, 16);
        this.player1 = new Mallet(200, 290, 30, 'left', this.selectedSkin);
        this.player2 = new Mallet(780, 290, 30, 'right', 'crimson-fury');
        this.ai = new AIController(this.player2, this.difficulty);

        // Scores
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.lastScorer = null;
        this.goalCelebrationTimer = 0;

        // Input Tracking
        this.keys = {};
        this.activeTouches = new Map();
        this.lastTime = 0;

        // Slow motion control
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.setupEventListeners();
        this.setupUI();
        this.particles.initAirJets(this.canvas.width, this.canvas.height);

        // Start Loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    resizeCanvas() {
        const container = document.getElementById('canvas-wrapper');
        if (!container) return;
        const aspect = 980 / 580;
        let w = container.clientWidth || 980;
        let h = container.clientHeight || 580;

        if (w <= 0 || h <= 0) {
            w = 980;
            h = 580;
        }

        if (w / h > aspect) {
            w = h * aspect;
        } else {
            h = w / aspect;
        }

        // Set virtual resolution
        this.canvas.width = 980;
        this.canvas.height = 580;

        // Table dimensions inside canvas
        this.table.width = 900;
        this.table.height = 500;
        this.table.bounds = {
            left: 40,
            right: 940,
            top: 40,
            bottom: 540
        };
        this.table.goalY = 290;
        this.table.goalHeight = 160;

        this.player1.setBounds(this.table.bounds, this.table.width);
        this.player2.setBounds(this.table.bounds, this.table.width);
        this.ai.setHomePos(this.table.bounds.right - 90, this.table.goalY);
    }

    startMatch(mode, options = {}) {
        this.sound.resume();
        this.sound.startBGM();

        this.mode = mode;
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.timeScale = 1.0;

        if (mode === 'vs_ai') {
            this.difficulty = options.difficulty || this.menuSelectedDifficulty || 'medium';
            this.targetScore = options.targetScore || 7;
            this.ai.setDifficulty(this.difficulty);
            this.player2.isAI = true;
            this.player2.skin = 'crimson-fury';
            this.player1.skin = this.selectedSkin;
            this.renderer.setTheme(this.selectedArena);
            this.updateHUDTitles("PLAYER", `AI (${this.difficulty.toUpperCase()})`);
        } else if (mode === 'pvp') {
            this.targetScore = options.targetScore || 7;
            this.player2.isAI = false;
            this.player1.skin = this.selectedSkin;
            this.player2.skin = 'crimson-fury';
            this.renderer.setTheme(this.selectedArena);
            this.updateHUDTitles("PLAYER 1 (WASD/Touch)", "PLAYER 2 (Arrows/Touch)");
        } else if (mode === 'tournament') {
            const stage = this.tournament.getCurrentStage();
            this.targetScore = stage.targetScore;
            this.ai.setDifficulty(stage.difficulty);
            this.player2.isAI = true;
            this.player2.skin = stage.skin;
            this.player1.skin = this.selectedSkin;
            this.renderer.setTheme(stage.arena);
            this.updateHUDTitles("PLAYER", `${stage.rival} (${stage.title})`);
        } else if (mode === 'challenge') {
            const levelIdx = options.levelIndex || 0;
            this.challenges.startLevel(levelIdx, this.table.width, this.table.height, this.table.bounds);
            this.player2.isAI = false;
            this.player2.pos.set(2000, 2000); // place AI off-screen during single player challenge
            this.player1.skin = this.selectedSkin;
            this.renderer.setTheme(this.selectedArena);
            this.updateHUDTitles("CHALLENGE SCORE", "TIME LEFT");
        }

        this.resetPositions(0);
        this.updateHUDScore();
        this.showScreen('game-screen');
        this.resizeCanvas();
        this.startCountdown();
    }

    startCountdown() {
        this.state = 'COUNTDOWN';
        const overlay = document.getElementById('match-countdown');
        const textEl = document.getElementById('countdown-text');
        if (!overlay || !textEl) {
            this.state = 'PLAYING';
            return;
        }

        overlay.classList.add('active');
        let step = 3;
        textEl.textContent = step;
        textEl.className = 'countdown-text count-pop';
        this.sound.playBeep(false);

        const countInterval = setInterval(() => {
            step--;
            if (step > 0) {
                textEl.textContent = step;
                textEl.className = 'countdown-text';
                void textEl.offsetWidth; // Force CSS reflow
                textEl.className = 'countdown-text count-pop';
                this.sound.playBeep(false);
            } else if (step === 0) {
                textEl.textContent = 'GO!';
                textEl.className = 'countdown-text count-go';
                this.sound.playBeep(true);
            } else {
                clearInterval(countInterval);
                overlay.classList.remove('active');
                this.state = 'PLAYING';
            }
        }, 650);
    }

    resetPositions(serveDirection = 0) {
        const centerY = this.table.goalY;
        this.player1.pos.set(this.table.bounds.left + 120, centerY);
        this.player1.targetPos.copy(this.player1.pos);
        this.player1.vel.set(0, 0);

        if (this.mode !== 'challenge') {
            this.player2.pos.set(this.table.bounds.right - 120, centerY);
            this.player2.targetPos.copy(this.player2.pos);
            this.player2.vel.set(0, 0);
        }

        const centerX = this.table.bounds.left + this.table.width / 2;
        this.puck.reset(centerX, centerY, serveDirection);
    }

    setupEventListeners() {
        // Keyboard controls for 2-Player mode
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Mouse Controls
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state !== 'PLAYING' && this.state !== 'GOAL_CELEBRATION') return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            // Player 1 follows mouse if on left side or vs AI
            if (this.mode === 'vs_ai' || this.mode === 'tournament' || this.mode === 'challenge') {
                this.player1.setTarget(mouseX, mouseY);
            } else if (this.mode === 'pvp') {
                // In local PvP, mouse moves whoever is on that side
                if (mouseX < this.table.bounds.left + this.table.width / 2) {
                    this.player1.setTarget(mouseX, mouseY);
                } else {
                    this.player2.setTarget(mouseX, mouseY);
                }
            }
        });

        // Touch Controls (Supports Multi-Touch for 2-Player PvP)
        const handleTouch = (e) => {
            e.preventDefault();
            if (this.state !== 'PLAYING' && this.state !== 'GOAL_CELEBRATION') return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const tx = (touch.clientX - rect.left) * scaleX;
                const ty = (touch.clientY - rect.top) * scaleY;
                const midX = this.table.bounds.left + this.table.width / 2;

                if (tx < midX) {
                    this.player1.setTarget(tx, ty);
                } else if (this.mode === 'pvp') {
                    this.player2.setTarget(tx, ty);
                }
            }
        };

        this.canvas.addEventListener('touchstart', handleTouch, { passive: false });
        this.canvas.addEventListener('touchmove', handleTouch, { passive: false });
    }

    handleKeyboardInput() {
        const p1Speed = 14;
        const p2Speed = 14;

        // Player 1 WASD
        let p1X = this.player1.targetPos.x;
        let p1Y = this.player1.targetPos.y;

        if (this.keys['w'] || this.keys['W']) p1Y -= p1Speed;
        if (this.keys['s'] || this.keys['S']) p1Y += p1Speed;
        if (this.keys['a'] || this.keys['A']) p1X -= p1Speed;
        if (this.keys['d'] || this.keys['D']) p1X += p1Speed;
        if (this.keys['w'] || this.keys['W'] || this.keys['s'] || this.keys['S'] || this.keys['a'] || this.keys['A'] || this.keys['d'] || this.keys['D']) {
            this.player1.setTarget(p1X, p1Y);
        }

        // Player 2 Arrow Keys (PvP mode)
        if (this.mode === 'pvp' && !this.player2.isAI) {
            let p2X = this.player2.targetPos.x;
            let p2Y = this.player2.targetPos.y;

            if (this.keys['ArrowUp']) p2Y -= p2Speed;
            if (this.keys['ArrowDown']) p2Y += p2Speed;
            if (this.keys['ArrowLeft']) p2X -= p2Speed;
            if (this.keys['ArrowRight']) p2X += p2Speed;
            if (this.keys['ArrowUp'] || this.keys['ArrowDown'] || this.keys['ArrowLeft'] || this.keys['ArrowRight']) {
                this.player2.setTarget(p2X, p2Y);
            }
        }
    }

    update(dt) {
        this.particles.update();

        // Slow motion transition
        this.timeScale += (this.targetTimeScale - this.timeScale) * 0.1;
        const effectiveDt = dt * this.timeScale;

        if (this.state === 'PAUSED') return;

        if (this.state === 'COUNTDOWN') {
            this.handleKeyboardInput();
            this.player1.update();
            if (this.mode !== 'challenge') {
                this.player2.update();
            }
            return;
        }

        if (this.state === 'GOAL_CELEBRATION') {
            this.goalCelebrationTimer -= dt;
            if (this.goalCelebrationTimer <= 0) {
                this.targetTimeScale = 1.0;
                this.checkMatchEnd();
            }
            return;
        }

        if (this.state !== 'PLAYING') return;

        this.handleKeyboardInput();

        // Update Mallets
        this.player1.update();
        if (this.mode !== 'challenge') {
            if (this.player2.isAI) {
                this.ai.update(this.puck, this.table);
            }
            this.player2.update();
        }

        // Update Puck
        this.puck.update();

        // Physics Updates
        if (this.mode === 'challenge') {
            this.challenges.update(
                dt,
                this.puck,
                (target) => {
                    this.sound.playSmash();
                    this.particles.createHitSparks(target.x, target.y, 30, target.color, 1.2);
                    this.renderer.shake(8);
                },
                (score) => this.onChallengeWon(score),
                () => this.onChallengeFailed()
            );

            this.updateHUDChallenge(this.challenges.score, this.challenges.timeLeft);

            this.physics.update(
                this.puck,
                [this.player1],
                this.challenges.activeObstacles,
                (x, y, nx, ny, speedRatio) => {
                    this.sound.playWallBounce(speedRatio);
                    this.particles.createWallBounceSparks(x, y, nx, ny, '#00f0ff', speedRatio);
                },
                (x, y, intensity) => {
                    this.sound.playHit(intensity);
                    this.particles.createHitSparks(x, y, 20, '#00f0ff', intensity);
                    if (intensity > 0.7) {
                        this.sound.playSmash();
                        this.renderer.shake(intensity * 12);
                    }
                },
                null
            );
        } else {
            this.physics.update(
                this.puck,
                [this.player1, this.player2],
                [],
                (x, y, nx, ny, speedRatio) => {
                    this.sound.playWallBounce(speedRatio);
                    this.particles.createWallBounceSparks(x, y, nx, ny, '#00f0ff', speedRatio);
                },
                (x, y, intensity, mallet) => {
                    this.sound.playHit(intensity);
                    const sparkColor = mallet.side === 'left' ? '#00f0ff' : '#ff0055';
                    this.particles.createHitSparks(x, y, 20, sparkColor, intensity);
                    if (intensity > 0.7) {
                        this.sound.playSmash();
                        this.renderer.shake(intensity * 14);
                    }
                },
                (scorer) => this.onGoalScored(scorer)
            );
        }
    }

    onGoalScored(scorer) {
        this.lastScorer = scorer;
        this.state = 'GOAL_CELEBRATION';
        this.goalCelebrationTimer = 1.6;
        this.targetTimeScale = 0.25; // Dramatic slow motion

        if (scorer === 'player1') {
            this.scoreP1++;
            this.sound.playGoal(true);
            this.particles.createGoalCelebration(this.table.bounds.right, this.table.goalY, '#00f0ff');
            this.renderer.flash('#00f0ff', 0.6);
            this.showGoalBanner("GOAL! PLAYER 1 SCORED!", "#00f0ff");
        } else {
            this.scoreP2++;
            this.sound.playGoal(false);
            this.particles.createGoalCelebration(this.table.bounds.left, this.table.goalY, '#ff007f');
            this.renderer.flash('#ff007f', 0.6);
            const p2Name = this.mode === 'pvp' ? "PLAYER 2" : "OPPONENT";
            this.showGoalBanner(`GOAL! ${p2Name} SCORED!`, "#ff007f");
        }

        this.renderer.shake(20);
        this.updateHUDScore();
    }

    showGoalBanner(text, color) {
        const banner = document.getElementById('goal-banner');
        banner.textContent = text;
        banner.style.color = color;
        banner.style.textShadow = `0 0 25px ${color}`;
        banner.classList.add('show');
        setTimeout(() => {
            banner.classList.remove('show');
        }, 1400);
    }

    checkMatchEnd() {
        if (this.scoreP1 >= this.targetScore || this.scoreP2 >= this.targetScore) {
            this.state = 'GAME_OVER';
            const p1Won = this.scoreP1 >= this.targetScore;

            if (p1Won) {
                this.sound.playWin();
            } else {
                this.sound.playLose();
            }

            if (this.mode === 'tournament') {
                if (p1Won) {
                    const advanced = this.tournament.advanceStage();
                    this.showVictoryModal(true, advanced ? "STAGE CLEARED! NEXT RIVAL UNLOCKED!" : "CHAMPIONSHIP CONQUERED!");
                } else {
                    this.showVictoryModal(false, "DEFEATED IN TOURNAMENT MATCH");
                }
            } else {
                const winnerName = p1Won ? "PLAYER 1" : (this.mode === 'pvp' ? "PLAYER 2" : "AI OPPONENT");
                this.showVictoryModal(p1Won, `${winnerName} WINS THE MATCH!`);
            }
        } else {
            // Respawn puck toward the player who just got scored on
            const serveDir = this.lastScorer === 'player1' ? 1 : -1;
            this.resetPositions(serveDir);
            this.state = 'PLAYING';
        }
    }

    onChallengeWon(score) {
        this.sound.playWin();
        this.state = 'GAME_OVER';
        this.showVictoryModal(true, `CHALLENGE COMPLETE! SCORE: ${score}`);
    }

    onChallengeFailed() {
        this.sound.playLose();
        this.state = 'GAME_OVER';
        this.showVictoryModal(false, "TIME EXPIRED! CHALLENGE FAILED");
    }

    render() {
        // Clear background
        this.ctx.fillStyle = '#03060c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render Air table & rink lines
        this.renderer.renderTable(this.table);

        // Render Challenges / Targets / Obstacles
        if (this.mode === 'challenge') {
            this.challenges.render(this.ctx);
        }

        // Render Puck Trail & Puck
        this.puck.render(this.ctx);

        // Render Mallets
        this.player1.render(this.ctx);
        if (this.mode !== 'challenge') {
            this.player2.render(this.ctx);
        }

        // Render Particles & Shockwaves
        this.particles.render(this.ctx);
    }

    gameLoop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // UI and Navigation
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            if (screenId === 'game-screen') {
                this.resizeCanvas();
            }
        }
    }

    updateHUDTitles(p1Text, p2Text) {
        document.getElementById('hud-p1-name').textContent = p1Text;
        document.getElementById('hud-p2-name').textContent = p2Text;
    }

    updateHUDScore() {
        document.getElementById('hud-p1-score').textContent = this.scoreP1;
        document.getElementById('hud-p2-score').textContent = this.scoreP2;
    }

    updateHUDChallenge(score, timeLeft) {
        document.getElementById('hud-p1-score').textContent = score;
        document.getElementById('hud-p2-score').textContent = Math.ceil(timeLeft) + 's';
    }

    togglePause() {
        if (this.state === 'PLAYING' || this.state === 'COUNTDOWN') {
            this.state = 'PAUSED';
            document.getElementById('pause-modal').classList.add('active');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pause-modal').classList.remove('active');
        }
    }

    showVictoryModal(isWin, message) {
        const modal = document.getElementById('victory-modal');
        const title = document.getElementById('victory-title');
        const subtitle = document.getElementById('victory-subtitle');
        const p1Final = document.getElementById('victory-p1-score');
        const p2Final = document.getElementById('victory-p2-score');

        title.textContent = isWin ? "VICTORY!" : "DEFEAT";
        title.style.color = isWin ? '#00f0ff' : '#ff0055';
        title.style.textShadow = `0 0 30px ${isWin ? '#00f0ff' : '#ff0055'}`;
        subtitle.textContent = message;

        if (this.mode === 'challenge') {
            p1Final.textContent = `Score: ${this.challenges.score}`;
            p2Final.textContent = ``;
        } else {
            p1Final.textContent = `P1: ${this.scoreP1}`;
            p2Final.textContent = `P2: ${this.scoreP2}`;
        }

        modal.classList.add('active');
    }

    setupUI() {
        // Main Menu Difficulty Pills
        const diffPills = document.querySelectorAll('#menu-diff-pills .diff-pill');
        diffPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.stopPropagation();
                this.sound.playUiClick();
                diffPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.menuSelectedDifficulty = pill.dataset.diff;
                const radio = document.querySelector(`input[name="diff-option"][value="${this.menuSelectedDifficulty}"]`);
                if (radio) radio.checked = true;
            });
        });

        // Quick Match Direct Start
        document.getElementById('btn-quick-match').addEventListener('click', () => {
            this.sound.playUiClick();
            this.startMatch('vs_ai', { difficulty: this.menuSelectedDifficulty, targetScore: 7 });
        });

        // Custom Match Setup Screen Open
        const btnCustom = document.getElementById('btn-custom-match');
        if (btnCustom) {
            btnCustom.addEventListener('click', () => {
                this.sound.playUiClick();
                this.showScreen('quickmatch-screen');
            });
        }

        // HUD Quick Pause Button
        const btnHudPause = document.getElementById('btn-hud-pause');
        if (btnHudPause) {
            btnHudPause.addEventListener('click', () => {
                this.sound.playUiClick();
                this.togglePause();
            });
        }

        document.getElementById('btn-pvp-match').addEventListener('click', () => {
            this.sound.playUiClick();
            this.startMatch('pvp', { targetScore: 7 });
        });

        document.getElementById('btn-tournament').addEventListener('click', () => {
            this.sound.playUiClick();
            this.renderTournamentLadder();
            this.showScreen('tournament-screen');
        });

        document.getElementById('btn-challenges').addEventListener('click', () => {
            this.sound.playUiClick();
            this.renderChallengeList();
            this.showScreen('challenges-screen');
        });

        document.getElementById('btn-customization').addEventListener('click', () => {
            this.sound.playUiClick();
            this.showScreen('customization-screen');
        });

        // Custom Match Start
        document.getElementById('btn-start-quickmatch').addEventListener('click', () => {
            this.sound.playUiClick();
            const diff = document.querySelector('input[name="diff-option"]:checked').value;
            const score = parseInt(document.querySelector('input[name="score-option"]:checked').value, 10);
            this.startMatch('vs_ai', { difficulty: diff, targetScore: score });
        });

        // Radio change sync
        document.querySelectorAll('input[name="diff-option"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.menuSelectedDifficulty = e.target.value;
                diffPills.forEach(p => p.classList.toggle('active', p.dataset.diff === e.target.value));
            });
        });

        // Back Buttons
        document.querySelectorAll('.btn-back-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                this.sound.playUiClick();
                document.getElementById('victory-modal').classList.remove('active');
                document.getElementById('pause-modal').classList.remove('active');
                const overlay = document.getElementById('match-countdown');
                if (overlay) overlay.classList.remove('active');
                this.state = 'MENU';
                this.showScreen('main-menu-screen');
            });
        });

        // Pause Modal Controls
        document.getElementById('btn-resume').addEventListener('click', () => {
            this.sound.playUiClick();
            this.togglePause();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.sound.playUiClick();
            document.getElementById('pause-modal').classList.remove('active');
            document.getElementById('victory-modal').classList.remove('active');
            this.startMatch(this.mode, { difficulty: this.difficulty, targetScore: this.targetScore });
        });

        document.getElementById('btn-victory-restart').addEventListener('click', () => {
            this.sound.playUiClick();
            document.getElementById('victory-modal').classList.remove('active');
            this.startMatch(this.mode, { difficulty: this.difficulty, targetScore: this.targetScore });
        });

        // Audio & Music Toggles
        document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
            const on = this.sound.toggleSound();
            e.currentTarget.textContent = `Sound: ${on ? 'ON' : 'OFF'}`;
            e.currentTarget.classList.toggle('off', !on);
        });

        document.getElementById('btn-toggle-music').addEventListener('click', (e) => {
            const on = this.sound.toggleMusic();
            e.currentTarget.textContent = `Music: ${on ? 'ON' : 'OFF'}`;
            e.currentTarget.classList.toggle('off', !on);
        });

        // Skin Selectors in Locker
        document.querySelectorAll('.skin-card').forEach(card => {
            card.addEventListener('click', () => {
                this.sound.playUiClick();
                document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedSkin = card.dataset.skin;
                this.player1.skin = this.selectedSkin;
            });
        });

        // Arena Selectors in Locker
        document.querySelectorAll('.arena-card').forEach(card => {
            card.addEventListener('click', () => {
                this.sound.playUiClick();
                document.querySelectorAll('.arena-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedArena = card.dataset.arena;
                this.renderer.setTheme(this.selectedArena);
            });
        });
    }

    renderTournamentLadder() {
        const container = document.getElementById('tournament-stages-container');
        container.innerHTML = '';

        TOURNAMENT_STAGES.forEach((stage, idx) => {
            const isUnlocked = idx <= this.tournament.unlockedStageIndex;
            const isCurrent = idx === this.tournament.currentStageIndex;

            const card = document.createElement('div');
            card.className = `tournament-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="stage-avatar">${isUnlocked ? stage.avatar : '🔒'}</div>
                <div class="stage-info">
                    <div class="stage-title">${stage.name}</div>
                    <div class="stage-rival">${stage.rival} — <span>${stage.title}</span></div>
                    <div class="stage-meta">Difficulty: <strong>${stage.difficulty.toUpperCase()}</strong> | Target: <strong>${stage.targetScore} pts</strong></div>
                    <div class="stage-intro">"${stage.intro}"</div>
                </div>
                ${isUnlocked ? `<button class="btn btn-primary btn-play-stage" data-idx="${idx}">PLAY STAGE</button>` : `<div class="locked-badge">LOCKED</div>`}
            `;

            if (isUnlocked) {
                card.querySelector('.btn-play-stage').addEventListener('click', () => {
                    this.tournament.selectStage(idx);
                    this.startMatch('tournament');
                });
            }

            container.appendChild(card);
        });
    }

    renderChallengeList() {
        const container = document.getElementById('challenges-container');
        container.innerHTML = '';

        CHALLENGE_LEVELS.forEach((level, idx) => {
            const card = document.createElement('div');
            card.className = 'challenge-card';
            card.innerHTML = `
                <div class="challenge-num">0${level.id}</div>
                <div class="challenge-info">
                    <div class="challenge-title">${level.title}</div>
                    <div class="challenge-desc">${level.description}</div>
                    <div class="challenge-time">⏱ Time Limit: ${level.timeLimit}s</div>
                </div>
                <button class="btn btn-primary btn-play-challenge" data-idx="${idx}">START CHALLENGE</button>
            `;

            card.querySelector('.btn-play-challenge').addEventListener('click', () => {
                this.startMatch('challenge', { levelIndex: idx });
            });

            container.appendChild(card);
        });
    }
}

// Instantiate Game on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
