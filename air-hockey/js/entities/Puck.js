import { Vector2D } from '../engine/Vector2D.js';

/**
 * Puck Entity with speed trail buffer and glowing aesthetics
 */
export class Puck {
    constructor(x, y, radius = 16) {
        this.pos = new Vector2D(x, y);
        this.vel = new Vector2D(0, 0);
        this.radius = radius;
        this.trail = [];
        this.maxTrail = 16;
        this.color = '#00f0ff';
        this.glowColor = '#00f0ff';
        this.isRespawning = false;
        this.respawnTimer = 0;
        this.scale = 1.0;
    }

    reset(x, y, serveDirection = 0) {
        this.pos.set(x, y);
        this.vel.set(serveDirection * (Math.random() * 2 + 3), (Math.random() - 0.5) * 4);
        this.trail = [];
        this.isRespawning = true;
        this.respawnTimer = 1.0;
        this.scale = 0.2;
    }

    update() {
        if (this.isRespawning) {
            this.respawnTimer -= 0.05;
            this.scale = Math.min(1.0, this.scale + 0.08);
            if (this.respawnTimer <= 0) {
                this.isRespawning = false;
                this.scale = 1.0;
            }
        }

        // Add position to trail buffer
        this.trail.unshift({
            x: this.pos.x,
            y: this.pos.y,
            speed: this.vel.mag()
        });

        if (this.trail.length > this.maxTrail) {
            this.trail.pop();
        }
    }

    render(ctx) {
        const speed = this.vel.mag();

        // 1. Render glowing comet motion trail
        if (this.trail.length > 1 && speed > 2) {
            ctx.save();
            for (let i = this.trail.length - 1; i >= 1; i--) {
                const p1 = this.trail[i];
                const p0 = this.trail[i - 1];
                const alpha = (1 - i / this.trail.length) * Math.min(1.0, speed / 12);
                const width = (this.radius * 2) * (1 - i / this.trail.length) * 0.85;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p0.x, p0.y);
                ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.7})`;
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 10 * alpha;
                ctx.stroke();
            }
            ctx.restore();
        }

        // 2. Render Puck Body
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.scale(this.scale, this.scale);

        // Ambient glow around puck
        ctx.shadowColor = speed > 18 ? '#ff007f' : this.glowColor;
        ctx.shadowBlur = 14 + Math.min(20, speed);

        // Outer rim
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0d18';
        ctx.fill();

        const strokeColor = speed > 18 ? '#ff007f' : this.color;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner glowing core
        const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, this.radius * 0.75);
        if (speed > 18) {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.5, '#ff007f');
            grad.addColorStop(1, '#7a0038');
        } else {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, this.color);
            grad.addColorStop(1, '#004c80');
        }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Center dot
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
    }
}
