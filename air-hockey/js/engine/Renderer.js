/**
 * Canvas Renderer with Arena Themes, Dynamic Lighting, and Visual Shaders
 */
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.theme = 'cyberpunk';
        this.shakeAmount = 0;
        this.flashAlpha = 0;
        this.flashColor = '#ffffff';
        this.ledOffset = 0;
    }

    setTheme(themeName) {
        this.theme = themeName;
    }

    shake(amount = 10) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    }

    flash(color = '#ffffff', alpha = 0.5) {
        this.flashColor = color;
        this.flashAlpha = alpha;
    }

    getThemeColors() {
        switch (this.theme) {
            case 'synthwave':
                return {
                    tableBgStart: '#140c24',
                    tableBgEnd: '#090412',
                    border: '#ff007f',
                    centerLine: '#ff007f',
                    centerCircle: '#ffe600',
                    crease: '#a855f7',
                    puckGlow: '#ffe600',
                    goals: '#ff007f',
                    grid: 'rgba(255, 0, 127, 0.08)'
                };
            case 'tokyo-neon':
                return {
                    tableBgStart: '#081a15',
                    tableBgEnd: '#020b08',
                    border: '#00ff88',
                    centerLine: '#00ff88',
                    centerCircle: '#00f0ff',
                    crease: '#00ff88',
                    puckGlow: '#00ff88',
                    goals: '#00ff88',
                    grid: 'rgba(0, 255, 136, 0.08)'
                };
            case 'lava-forge':
                return {
                    tableBgStart: '#200d08',
                    tableBgEnd: '#0d0402',
                    border: '#ff4400',
                    centerLine: '#ff4400',
                    centerCircle: '#ffe600',
                    crease: '#ff2200',
                    puckGlow: '#ff5500',
                    goals: '#ff3300',
                    grid: 'rgba(255, 68, 0, 0.09)'
                };
            case 'deep-cosmos':
                return {
                    tableBgStart: '#0b0c26',
                    tableBgEnd: '#030310',
                    border: '#b800ff',
                    centerLine: '#b800ff',
                    centerCircle: '#00f0ff',
                    crease: '#7b00ff',
                    puckGlow: '#00f0ff',
                    goals: '#b800ff',
                    grid: 'rgba(184, 0, 255, 0.08)'
                };
            case 'cyberpunk':
            default:
                return {
                    tableBgStart: '#0c1626',
                    tableBgEnd: '#040913',
                    border: '#00f0ff',
                    centerLine: '#00f0ff',
                    centerCircle: '#ff007f',
                    crease: '#00f0ff',
                    puckGlow: '#00f0ff',
                    goals: '#ff007f',
                    grid: 'rgba(0, 240, 255, 0.08)'
                };
        }
    }

    renderTable(table) {
        const ctx = this.ctx;
        const w = table.width;
        const h = table.height;
        const colors = this.getThemeColors();
        const b = table.bounds;

        this.ledOffset = (this.ledOffset + 0.5) % 40;

        // Apply screen shake
        ctx.save();
        if (this.shakeAmount > 0) {
            const sx = (Math.random() - 0.5) * this.shakeAmount;
            const sy = (Math.random() - 0.5) * this.shakeAmount;
            ctx.translate(sx, sy);
            this.shakeAmount *= 0.9;
            if (this.shakeAmount < 0.2) this.shakeAmount = 0;
        }

        // 1. Table Outer Frame & Bevel
        ctx.save();
        ctx.fillStyle = '#06080e';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.roundRect(b.left - 24, b.top - 24, w + 48, h + 48, 28);
        ctx.fill();

        // Metallic rail texture border
        ctx.strokeStyle = '#1a2233';
        ctx.lineWidth = 14;
        ctx.stroke();

        // High-tech LED running lights along top and bottom rails
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([12, 12]);
        ctx.lineDashOffset = -this.ledOffset;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 2. Main Playfield Surface
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(b.left, b.top, w, h, 16);
        ctx.clip();

        const tableGrad = ctx.createLinearGradient(b.left, b.top, b.left, b.bottom);
        tableGrad.addColorStop(0, colors.tableBgStart);
        tableGrad.addColorStop(0.5, colors.tableBgEnd);
        tableGrad.addColorStop(1, colors.tableBgStart);
        ctx.fillStyle = tableGrad;
        ctx.fill();

        // Futuristic Grid Overlay
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        const gridSize = 40;
        ctx.beginPath();
        for (let x = b.left; x <= b.right; x += gridSize) {
            ctx.moveTo(x, b.top);
            ctx.lineTo(x, b.bottom);
        }
        for (let y = b.top; y <= b.bottom; y += gridSize) {
            ctx.moveTo(b.left, y);
            ctx.lineTo(b.right, y);
        }
        ctx.stroke();

        // Glass Reflection Sheen
        const sheenGrad = ctx.createLinearGradient(b.left, b.top, b.right, b.bottom);
        sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        sheenGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.01)');
        sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
        sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = sheenGrad;
        ctx.fill();

        // 3. Neon Rink Markings
        const centerX = b.left + w / 2;
        const centerY = b.top + h / 2;

        // Center Line (Dashed neon)
        ctx.save();
        ctx.strokeStyle = colors.centerLine;
        ctx.lineWidth = 3;
        ctx.shadowColor = colors.centerLine;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.setLineDash([16, 12]);
        ctx.moveTo(centerX, b.top);
        ctx.lineTo(centerX, b.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Center Circle & Face-off Point
        ctx.save();
        ctx.shadowColor = colors.centerCircle;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = colors.centerCircle;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
        ctx.stroke();

        // Inner center ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
        ctx.fillStyle = colors.centerCircle;
        ctx.fill();
        ctx.restore();

        // Goal Crease Arcs (Left and Right)
        const creaseRadius = 110;
        ctx.save();
        ctx.strokeStyle = colors.crease;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = colors.crease;
        ctx.shadowBlur = 10;

        // Left Crease
        ctx.beginPath();
        ctx.arc(b.left, centerY, creaseRadius, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Right Crease
        ctx.beginPath();
        ctx.arc(b.right, centerY, creaseRadius, Math.PI / 2, -Math.PI / 2);
        ctx.stroke();
        ctx.restore();

        // 4. Goal Pockets & Flashing Lights
        const goalH = table.goalHeight;
        const goalTop = centerY - goalH / 2;

        // Left Goal Pocket
        ctx.save();
        const leftGoalGrad = ctx.createLinearGradient(b.left, centerY, b.left - 30, centerY);
        leftGoalGrad.addColorStop(0, 'rgba(255, 0, 127, 0.4)');
        leftGoalGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = leftGoalGrad;
        ctx.fillRect(b.left - 20, goalTop, 20, goalH);

        // Right Goal Pocket
        const rightGoalGrad = ctx.createLinearGradient(b.right, centerY, b.right + 30, centerY);
        rightGoalGrad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
        rightGoalGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = rightGoalGrad;
        ctx.fillRect(b.right, goalTop, 20, goalH);
        ctx.restore();

        // Outer Inner Border Line Glow
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3;
        ctx.shadowColor = colors.border;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(b.left, b.top, w, h, 16);
        ctx.stroke();

        ctx.restore(); // end clip

        // Flash overlay on goal
        if (this.flashAlpha > 0) {
            ctx.save();
            ctx.fillStyle = this.flashColor;
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillRect(b.left - 20, b.top - 20, w + 40, h + 40);
            ctx.restore();
            this.flashAlpha *= 0.88;
            if (this.flashAlpha < 0.02) this.flashAlpha = 0;
        }

        ctx.restore(); // end shake
    }
}
