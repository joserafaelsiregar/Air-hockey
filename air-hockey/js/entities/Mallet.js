import { Vector2D } from '../engine/Vector2D.js';

/**
 * Mallet / Striker Entity
 */
export class Mallet {
    constructor(x, y, radius = 30, side = 'left', skin = 'cyber-cyan') {
        this.pos = new Vector2D(x, y);
        this.prevPos = new Vector2D(x, y);
        this.targetPos = new Vector2D(x, y);
        this.vel = new Vector2D(0, 0);
        this.radius = radius;
        this.side = side; // 'left' or 'right'
        this.skin = skin;
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        this.isAI = false;
        this.lerpSpeed = 0.65; // Responsive interpolation
    }

    setBounds(tableBounds, tableWidth) {
        const halfWidth = tableWidth / 2;
        const r = this.radius;

        if (this.side === 'left') {
            this.bounds = {
                minX: tableBounds.left + r,
                maxX: tableBounds.left + halfWidth - r - 2,
                minY: tableBounds.top + r,
                maxY: tableBounds.bottom - r
            };
        } else {
            this.bounds = {
                minX: tableBounds.left + halfWidth + r + 2,
                maxX: tableBounds.right - r,
                minY: tableBounds.top + r,
                maxY: tableBounds.bottom - r
            };
        }
    }

    setTarget(x, y) {
        // Clamp to allowed half
        const clampedX = Math.max(this.bounds.minX, Math.min(x, this.bounds.maxX));
        const clampedY = Math.max(this.bounds.minY, Math.min(y, this.bounds.maxY));
        this.targetPos.set(clampedX, clampedY);
    }

    update() {
        this.prevPos.copy(this.pos);

        // Smoothly move towards target
        this.pos.lerp(this.targetPos, this.lerpSpeed);

        // Clamp actual position
        this.pos.x = Math.max(this.bounds.minX, Math.min(this.pos.x, this.bounds.maxX));
        this.pos.y = Math.max(this.bounds.minY, Math.min(this.pos.y, this.bounds.maxY));

        // Calculate velocity vector from position change
        this.vel.set(this.pos.x - this.prevPos.x, this.pos.y - this.prevPos.y);
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        const skinStyles = {
            'cyber-cyan': { primary: '#00f0ff', secondary: '#0066aa', accent: '#ffffff', glow: '#00f0ff' },
            'crimson-fury': { primary: '#ff0055', secondary: '#990033', accent: '#ffe6eb', glow: '#ff0055' },
            'cyber-gold': { primary: '#ffe600', secondary: '#b39500', accent: '#ffffff', glow: '#ffe600' },
            'void-violet': { primary: '#b800ff', secondary: '#62008f', accent: '#ffd6ff', glow: '#b800ff' },
            'emerald-matrix': { primary: '#00ff66', secondary: '#008a36', accent: '#e6fff0', glow: '#00ff66' },
            'laser-flame': { primary: '#ff6600', secondary: '#b34700', accent: '#fff0e6', glow: '#ff6600' }
        };

        const theme = skinStyles[this.skin] || skinStyles['cyber-cyan'];

        // Outer soft glow
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 18;

        // Base Outer Ring
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f121e';
        ctx.fill();

        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // High-tech circular groove
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.78, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, 0.25)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner Dome Gradient
        const domeGrad = ctx.createRadialGradient(
            -this.radius * 0.2, -this.radius * 0.2, 2,
            0, 0, this.radius * 0.65
        );
        domeGrad.addColorStop(0, theme.accent);
        domeGrad.addColorStop(0.35, theme.primary);
        domeGrad.addColorStop(0.9, theme.secondary);
        domeGrad.addColorStop(1, '#080a10');

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = domeGrad;
        ctx.fill();

        // Handle Knob
        const knobGrad = ctx.createRadialGradient(
            -this.radius * 0.1, -this.radius * 0.1, 1,
            0, 0, this.radius * 0.32
        );
        knobGrad.addColorStop(0, '#ffffff');
        knobGrad.addColorStop(0.5, theme.primary);
        knobGrad.addColorStop(1, '#05070c');

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = knobGrad;
        ctx.fill();
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}
