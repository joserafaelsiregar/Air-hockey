import { Vector2D } from './Vector2D.js';

/**
 * Continuous Physics & Collision Engine for Air Hockey
 */
export class PhysicsEngine {
    constructor(table) {
        this.table = table;
        this.subSteps = 8; // High-precision sub-stepping to prevent tunneling
        this.friction = 0.9982; // Realistic air table friction
        this.restitution = 0.94; // Elastic bounce retention
        this.malletRestitution = 1.15; // Bounce multiplier when hitting mallet for juicy smashes
        this.maxPuckSpeed = 38;
        this.minPuckSpeed = 0.05;
    }

    update(puck, mallets, obstacles = [], onWallBounce, onMalletHit, onGoal) {
        const dt = 1.0 / this.subSteps;

        for (let step = 0; step < this.subSteps; step++) {
            // Apply slight air friction per substep
            puck.vel.mult(Math.pow(this.friction, dt));

            // Clamp max speed
            const speed = puck.vel.mag();
            if (speed > this.maxPuckSpeed) {
                puck.vel.normalize().mult(this.maxPuckSpeed);
            }

            // Move puck incrementally
            puck.pos.x += puck.vel.x * dt;
            puck.pos.y += puck.vel.y * dt;

            // Check Obstacles (for Trickshot/Challenge mode)
            if (obstacles && obstacles.length > 0) {
                this.handleObstacleCollisions(puck, obstacles, onWallBounce);
            }

            // Mallet-Puck Collisions
            for (const mallet of mallets) {
                this.handleMalletPuckCollision(mallet, puck, dt, onMalletHit);
            }

            // Table Wall & Goal Collisions
            const goalScored = this.handleTableCollisions(puck, onWallBounce);
            if (goalScored) {
                if (onGoal) onGoal(goalScored);
                return; // Stop substepping on goal
            }
        }

        // Very low speed dampening
        if (puck.vel.magSq() < this.minPuckSpeed * this.minPuckSpeed) {
            puck.vel.set(0, 0);
        }
    }

    handleMalletPuckCollision(mallet, puck, dt, onMalletHit) {
        const distSq = mallet.pos.distSq(puck.pos);
        const minDist = mallet.radius + puck.radius;

        if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            const normal = new Vector2D(
                (puck.pos.x - mallet.pos.x) / dist,
                (puck.pos.y - mallet.pos.y) / dist
            );

            // Separate overlapping bodies immediately
            const overlap = minDist - dist;
            puck.pos.x += normal.x * overlap;
            puck.pos.y += normal.y * overlap;

            // Calculate relative velocity
            const relVel = new Vector2D(
                puck.vel.x - mallet.vel.x,
                puck.vel.y - mallet.vel.y
            );

            const velAlongNormal = relVel.dot(normal);

            // Only resolve if moving towards each other
            if (velAlongNormal < 0) {
                const impulse = -(1 + this.malletRestitution) * velAlongNormal;
                
                // Add impulse along normal
                puck.vel.x += normal.x * impulse;
                puck.vel.y += normal.y * impulse;

                // Add mallet momentum slice / spin bonus
                puck.vel.x += mallet.vel.x * 0.7;
                puck.vel.y += mallet.vel.y * 0.7;

                // Clamp speed
                if (puck.vel.mag() > this.maxPuckSpeed) {
                    puck.vel.normalize().mult(this.maxPuckSpeed);
                }

                // Trigger hit callback & calculate impact intensity
                const hitSpeed = puck.vel.mag();
                const intensity = Math.min(1.0, hitSpeed / 20.0);
                if (onMalletHit) {
                    onMalletHit(puck.pos.x, puck.pos.y, intensity, mallet);
                }
            }
        }
    }

    handleTableCollisions(puck, onWallBounce) {
        const t = this.table;
        const r = puck.radius;
        const goalTop = t.goalY - t.goalHeight / 2;
        const goalBottom = t.goalY + t.goalHeight / 2;

        let bounced = false;
        let normalX = 0;
        let normalY = 0;

        // Top and Bottom Rails
        if (puck.pos.y - r < t.bounds.top) {
            puck.pos.y = t.bounds.top + r;
            puck.vel.y = -puck.vel.y * this.restitution;
            bounced = true;
            normalY = 1;
        } else if (puck.pos.y + r > t.bounds.bottom) {
            puck.pos.y = t.bounds.bottom - r;
            puck.vel.y = -puck.vel.y * this.restitution;
            bounced = true;
            normalY = -1;
        }

        // Left Endline (Player 1 / AI goal)
        if (puck.pos.x < t.bounds.left) {
            // Is it within goal vertical span?
            if (puck.pos.y >= goalTop && puck.pos.y <= goalBottom) {
                return 'player2'; // Player 2 scored on Player 1's goal
            } else {
                // Hit the left wall
                puck.pos.x = t.bounds.left + r;
                puck.vel.x = -puck.vel.x * this.restitution;
                bounced = true;
                normalX = 1;
            }
        }

        // Right Endline (Player 2 / Player goal)
        if (puck.pos.x > t.bounds.right) {
            // Is it within goal vertical span?
            if (puck.pos.y >= goalTop && puck.pos.y <= goalBottom) {
                return 'player1'; // Player 1 scored on Player 2's goal
            } else {
                // Hit the right wall
                puck.pos.x = t.bounds.right - r;
                puck.vel.x = -puck.vel.x * this.restitution;
                bounced = true;
                normalX = -1;
            }
        }

        // Goal Post circular collision corners
        const posts = [
            { x: t.bounds.left, y: goalTop },
            { x: t.bounds.left, y: goalBottom },
            { x: t.bounds.right, y: goalTop },
            { x: t.bounds.right, y: goalBottom }
        ];

        const postRadius = 6;
        for (const post of posts) {
            const dx = puck.pos.x - post.x;
            const dy = puck.pos.y - post.y;
            const distSq = dx * dx + dy * dy;
            const minD = r + postRadius;

            if (distSq < minD * minD) {
                const dist = Math.sqrt(distSq) || 0.001;
                const nx = dx / dist;
                const ny = dy / dist;

                puck.pos.x = post.x + nx * minD;
                puck.pos.y = post.y + ny * minD;

                const dot = puck.vel.x * nx + puck.vel.y * ny;
                if (dot < 0) {
                    puck.vel.x = (puck.vel.x - 2 * dot * nx) * this.restitution;
                    puck.vel.y = (puck.vel.y - 2 * dot * ny) * this.restitution;
                    bounced = true;
                    normalX = nx;
                    normalY = ny;
                }
            }
        }

        if (bounced && onWallBounce) {
            const speedRatio = Math.min(1.0, puck.vel.mag() / 22.0);
            onWallBounce(puck.pos.x, puck.pos.y, normalX, normalY, speedRatio);
        }

        return null;
    }

    handleObstacleCollisions(puck, obstacles, onWallBounce) {
        for (const obs of obstacles) {
            if (obs.type === 'circle') {
                const dx = puck.pos.x - obs.x;
                const dy = puck.pos.y - obs.y;
                const distSq = dx * dx + dy * dy;
                const minD = puck.radius + obs.radius;

                if (distSq < minD * minD) {
                    const dist = Math.sqrt(distSq) || 0.001;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    puck.pos.x = obs.x + nx * minD;
                    puck.pos.y = obs.y + ny * minD;

                    const dot = puck.vel.x * nx + puck.vel.y * ny;
                    if (dot < 0) {
                        puck.vel.x = (puck.vel.x - 2 * dot * nx) * 1.1; // Extra bumper bounce
                        puck.vel.y = (puck.vel.y - 2 * dot * ny) * 1.1;
                        if (obs.onHit) obs.onHit();
                        if (onWallBounce) onWallBounce(puck.pos.x, puck.pos.y, nx, ny, 1.0);
                    }
                }
            } else if (obs.type === 'rect') {
                // Box collider
                const halfW = obs.width / 2;
                const halfH = obs.height / 2;
                const closestX = Math.max(obs.x - halfW, Math.min(puck.pos.x, obs.x + halfW));
                const closestY = Math.max(obs.y - halfH, Math.min(puck.pos.y, obs.y + halfH));
                const dx = puck.pos.x - closestX;
                const dy = puck.pos.y - closestY;
                const distSq = dx * dx + dy * dy;

                if (distSq < puck.radius * puck.radius) {
                    const dist = Math.sqrt(distSq) || 0.001;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    puck.pos.x = closestX + nx * puck.radius;
                    puck.pos.y = closestY + ny * puck.radius;

                    const dot = puck.vel.x * nx + puck.vel.y * ny;
                    if (dot < 0) {
                        puck.vel.x = (puck.vel.x - 2 * dot * nx) * 1.05;
                        puck.vel.y = (puck.vel.y - 2 * dot * ny) * 1.05;
                        if (obs.onHit) obs.onHit();
                        if (onWallBounce) onWallBounce(puck.pos.x, puck.pos.y, nx, ny, 0.9);
                    }
                }
            }
        }
    }
}
