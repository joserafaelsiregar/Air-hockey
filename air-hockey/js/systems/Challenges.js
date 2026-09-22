/**
 * Trickshot & Target Challenge Missions
 */
export const CHALLENGE_LEVELS = [
    {
        id: 1,
        title: "Target Break: Fundamentals",
        description: "Smash the puck to break all 3 glowing targets within 30 seconds!",
        timeLimit: 30,
        targets: [
            { xRatio: 0.75, yRatio: 0.3, radius: 18, hit: false, points: 100 },
            { xRatio: 0.75, yRatio: 0.7, radius: 18, hit: false, points: 100 },
            { xRatio: 0.85, yRatio: 0.5, radius: 22, hit: false, points: 200 }
        ],
        obstacles: []
    },
    {
        id: 2,
        title: "Neon Bumper Pinball",
        description: "Hit the moving bumper cores to rack up combos and score into the goal!",
        timeLimit: 40,
        targets: [
            { xRatio: 0.96, yRatio: 0.5, radius: 28, hit: false, points: 500, isGoal: true }
        ],
        obstacles: [
            { type: 'circle', xRatio: 0.5, yRatio: 0.3, radius: 25, color: '#ff007f', speedY: 1.5, minRange: 0.2, maxRange: 0.8 },
            { type: 'circle', xRatio: 0.5, yRatio: 0.7, radius: 25, color: '#ff007f', speedY: -1.5, minRange: 0.2, maxRange: 0.8 },
            { type: 'circle', xRatio: 0.7, yRatio: 0.5, radius: 30, color: '#00f0ff', speedY: 0 }
        ]
    },
    {
        id: 3,
        title: "Laser Gate Ricochet",
        description: "Bank shot around impenetrable defensive barriers to hit the target orb!",
        timeLimit: 35,
        targets: [
            { xRatio: 0.9, yRatio: 0.5, radius: 20, hit: false, points: 1000 }
        ],
        obstacles: [
            { type: 'rect', xRatio: 0.65, yRatio: 0.5, width: 24, height: 180, color: '#ffe600' },
            { type: 'circle', xRatio: 0.35, yRatio: 0.25, radius: 20, color: '#ff0055' },
            { type: 'circle', xRatio: 0.35, yRatio: 0.75, radius: 20, color: '#ff0055' }
        ]
    }
];

export class ChallengeManager {
    constructor() {
        this.currentLevelIndex = 0;
        this.activeTargets = [];
        this.activeObstacles = [];
        this.timeLeft = 0;
        this.score = 0;
        this.isCompleted = false;
        this.isFailed = false;
    }

    startLevel(index, tableWidth, tableHeight, tableBounds) {
        this.currentLevelIndex = index;
        const level = CHALLENGE_LEVELS[index] || CHALLENGE_LEVELS[0];
        this.timeLeft = level.timeLimit;
        this.score = 0;
        this.isCompleted = false;
        this.isFailed = false;

        // Instantiate targets with absolute table coordinates
        this.activeTargets = level.targets.map(t => ({
            x: tableBounds.left + t.xRatio * tableWidth,
            y: tableBounds.top + t.yRatio * tableHeight,
            radius: t.radius,
            hit: false,
            points: t.points,
            isGoal: !!t.isGoal,
            color: t.isGoal ? '#00f0ff' : '#ffe600',
            pulse: Math.random() * Math.PI * 2
        }));

        // Instantiate obstacles
        this.activeObstacles = level.obstacles.map(o => {
            const obs = {
                type: o.type,
                x: tableBounds.left + o.xRatio * tableWidth,
                y: tableBounds.top + o.yRatio * tableHeight,
                color: o.color || '#ff007f',
                pulse: 0
            };
            if (o.type === 'circle') {
                obs.radius = o.radius;
                obs.speedY = o.speedY || 0;
                obs.minY = tableBounds.top + (o.minRange || 0.1) * tableHeight;
                obs.maxY = tableBounds.top + (o.maxRange || 0.9) * tableHeight;
            } else if (o.type === 'rect') {
                obs.width = o.width;
                obs.height = o.height;
            }
            return obs;
        });
    }

    update(dt, puck, onTargetHit, onLevelWin, onLevelFail) {
        if (this.isCompleted || this.isFailed) return;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.isFailed = true;
            if (onLevelFail) onLevelFail();
            return;
        }

        // Update moving obstacles
        for (const obs of this.activeObstacles) {
            obs.pulse += 0.05;
            if (obs.speedY) {
                obs.y += obs.speedY;
                if (obs.y < obs.minY || obs.y > obs.maxY) {
                    obs.speedY = -obs.speedY;
                }
            }
        }

        // Check target collisions
        let allHit = true;
        for (const target of this.activeTargets) {
            target.pulse += 0.08;
            if (!target.hit) {
                const distSq = (puck.pos.x - target.x) ** 2 + (puck.pos.y - target.y) ** 2;
                const minD = puck.radius + target.radius;
                if (distSq < minD * minD) {
                    target.hit = true;
                    this.score += target.points;
                    if (onTargetHit) onTargetHit(target);
                } else {
                    allHit = false;
                }
            }
        }

        if (allHit && !this.isCompleted) {
            this.isCompleted = true;
            if (onLevelWin) onLevelWin(this.score);
        }
    }

    render(ctx) {
        // Render obstacles
        for (const obs of this.activeObstacles) {
            ctx.save();
            ctx.shadowColor = obs.color;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = obs.color;
            ctx.lineWidth = 3;
            ctx.fillStyle = 'rgba(20, 20, 35, 0.85)';

            if (obs.type === 'circle') {
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Inner core
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = obs.color;
                ctx.fill();
            } else if (obs.type === 'rect') {
                const halfW = obs.width / 2;
                const halfH = obs.height / 2;
                ctx.beginPath();
                ctx.roundRect(obs.x - halfW, obs.y - halfH, obs.width, obs.height, 8);
                ctx.fill();
                ctx.stroke();

                // Laser hash lines inside
                ctx.strokeStyle = obs.color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let y = obs.y - halfH + 15; y < obs.y + halfH; y += 20) {
                    ctx.moveTo(obs.x - halfW + 4, y);
                    ctx.lineTo(obs.x + halfW - 4, y);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Render targets
        for (const t of this.activeTargets) {
            if (t.hit) continue;
            ctx.save();
            const scale = 1 + Math.sin(t.pulse) * 0.08;
            ctx.translate(t.x, t.y);
            ctx.scale(scale, scale);

            ctx.shadowColor = t.color;
            ctx.shadowBlur = 20;

            // Target ring
            ctx.beginPath();
            ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
            ctx.strokeStyle = t.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Inner bullseye
            ctx.beginPath();
            ctx.arc(0, 0, t.radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = t.color;
            ctx.fill();

            // Center glow
            ctx.beginPath();
            ctx.arc(0, 0, t.radius * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            ctx.restore();
        }
    }
}
