import { Vector2D } from '../engine/Vector2D.js';

/**
 * Smart Predictive AI for Neon Air Hockey
 */
export class AIController {
    constructor(mallet, difficulty = 'medium') {
        this.mallet = mallet;
        this.difficulty = difficulty;
        this.target = new Vector2D(mallet.pos.x, mallet.pos.y);
        this.homePos = new Vector2D(mallet.pos.x, mallet.pos.y);
        this.lastPredictionTime = 0;
        this.predictedPuckPos = new Vector2D(0, 0);
        this.reactionDelay = 0;
        this.reactionTimer = 0;
        this.aggressiveness = 0.5;
        this.setDifficulty(difficulty);
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        switch (diff) {
            case 'easy':
                this.speed = 3.5;
                this.reactionDelay = 8;
                this.aggressiveness = 0.2;
                this.predictSteps = 10;
                break;
            case 'medium':
                this.speed = 7.0;
                this.reactionDelay = 4;
                this.aggressiveness = 0.55;
                this.predictSteps = 25;
                break;
            case 'hard':
                this.speed = 12.0;
                this.reactionDelay = 1;
                this.aggressiveness = 0.85;
                this.predictSteps = 45;
                break;
            case 'insane':
                this.speed = 18.0;
                this.reactionDelay = 0;
                this.aggressiveness = 1.0;
                this.predictSteps = 60;
                break;
        }
    }

    setHomePos(x, y) {
        this.homePos.set(x, y);
    }

    update(puck, table) {
        const isLeft = this.mallet.side === 'left';
        const puckInMyHalf = isLeft ? 
            (puck.pos.x < table.bounds.left + table.width / 2) : 
            (puck.pos.x > table.bounds.left + table.width / 2);

        const puckHeadingTowardsMe = isLeft ? (puck.vel.x < -0.5) : (puck.vel.x > 0.5);

        this.reactionTimer++;
        if (this.reactionTimer >= this.reactionDelay) {
            this.reactionTimer = 0;
            this.calculatePredictedPosition(puck, table);
        }

        // Decision Logic
        if (puckInMyHalf) {
            // Offensive / Intercept state
            if (this.difficulty === 'easy') {
                // Just track puck y with slow response
                this.target.y = puck.pos.y;
                this.target.x = this.homePos.x + (puck.pos.x - this.homePos.x) * 0.3;
            } else {
                // Position behind the puck to smash towards opponent goal
                const targetGoalX = isLeft ? table.bounds.right : table.bounds.left;
                const targetGoalY = table.goalY + (Math.random() - 0.5) * (table.goalHeight * 0.5);

                const dirToGoal = new Vector2D(targetGoalX - puck.pos.x, targetGoalY - puck.pos.y).normalize();
                
                // Attack offset behind puck
                const attackDist = this.mallet.radius + puck.radius + 6;
                let attackX = puck.pos.x - dirToGoal.x * attackDist;
                let attackY = puck.pos.y - dirToGoal.y * attackDist;

                // If puck is behind AI mallet, rush back to goal defense
                const isBehind = isLeft ? (puck.pos.x < this.mallet.pos.x) : (puck.pos.x > this.mallet.pos.x);
                if (isBehind) {
                    attackX = this.homePos.x;
                    attackY = puck.pos.y;
                } else if (Math.random() < this.aggressiveness) {
                    // Strike forward through the puck
                    attackX = puck.pos.x + (isLeft ? 15 : -15);
                    attackY = puck.pos.y;
                }

                this.target.set(attackX, attackY);
            }
        } else {
            // Defensive / Return to post state
            if (puckHeadingTowardsMe && (this.difficulty === 'hard' || this.difficulty === 'insane')) {
                // Move in advance to predicted intercept point
                this.target.x = this.homePos.x;
                this.target.y = Math.max(table.bounds.top + 50, Math.min(this.predictedPuckPos.y, table.bounds.bottom - 50));
            } else {
                // Guard goal center with subtle tracking
                this.target.x = this.homePos.x;
                this.target.y = this.homePos.y + (puck.pos.y - table.goalY) * 0.45;
            }
        }

        // Apply movement speed
        const currentTarget = this.mallet.targetPos;
        const diff = Vector2D.sub(this.target, currentTarget);
        if (diff.mag() > this.speed) {
            diff.normalize().mult(this.speed);
            this.mallet.setTarget(currentTarget.x + diff.x, currentTarget.y + diff.y);
        } else {
            this.mallet.setTarget(this.target.x, this.target.y);
        }
    }

    calculatePredictedPosition(puck, table) {
        let simX = puck.pos.x;
        let simY = puck.pos.y;
        let simVx = puck.vel.x;
        let simVy = puck.vel.y;

        for (let i = 0; i < this.predictSteps; i++) {
            simX += simVx;
            simY += simVy;

            // Bounce off top & bottom rails in simulation
            if (simY - puck.radius < table.bounds.top) {
                simY = table.bounds.top + puck.radius;
                simVy = -simVy;
            } else if (simY + puck.radius > table.bounds.bottom) {
                simY = table.bounds.bottom - puck.radius;
                simVy = -simVy;
            }
        }

        this.predictedPuckPos.set(simX, simY);
    }
}
