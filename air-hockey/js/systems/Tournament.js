/**
 * Tournament Mode Ladder and Progression
 */
export const TOURNAMENT_STAGES = [
    {
        id: 1,
        name: "Stage 1: Neon Rookie",
        rival: "SPARK-01",
        title: "Arcade Novice",
        avatar: "⚡",
        difficulty: "easy",
        targetScore: 5,
        arena: "cyberpunk",
        skin: "cyber-cyan",
        intro: "Welcome to the circuit, kid. Let's see if you can handle basic table physics!",
        winQuote: "Beginner's luck... you won't last in the next bracket."
    },
    {
        id: 2,
        name: "Stage 2: Precision Master",
        rival: "COBALT VECTOR",
        title: "Bank Shot Specialist",
        avatar: "💠",
        difficulty: "medium",
        targetScore: 5,
        arena: "tokyo-neon",
        skin: "emerald-matrix",
        intro: "Every ricochet is calculated. You cannot defend against geometry.",
        winQuote: "My calculation failed... your reflexes are impressive."
    },
    {
        id: 3,
        name: "Stage 3: Crimson Striker",
        rival: "VIPER BLADE",
        title: "Offensive Heavyweight",
        avatar: "🔥",
        difficulty: "hard",
        targetScore: 7,
        arena: "lava-forge",
        skin: "crimson-fury",
        intro: "Hope you brought your helmet! I smash hard and I don't give second chances.",
        winQuote: "Argh! How did you deflect my ultimate smash?!"
    },
    {
        id: 4,
        name: "Stage 4: Cyber Synthesizer",
        rival: "AURA PROTOCOL",
        title: "AI Defense Core",
        avatar: "🔮",
        difficulty: "hard",
        targetScore: 7,
        arena: "synthwave",
        skin: "void-violet",
        intro: "Processing opponent velocity... defensive matrix initialized.",
        winQuote: "Critical anomaly detected. You have unlocked access to the Grand Champion."
    },
    {
        id: 5,
        name: "Grand Final: Championship",
        rival: "NEON VALKYRIE",
        title: "Cyber World Champion",
        avatar: "👑",
        difficulty: "insane",
        targetScore: 9,
        arena: "deep-cosmos",
        skin: "cyber-gold",
        intro: "Only the fastest hands and sharpest minds reach this table. Show me everything you've got!",
        winQuote: "Incredible match! You are the new Undisputed Neon Air Hockey Champion!"
    }
];

export class TournamentManager {
    constructor() {
        this.currentStageIndex = 0;
        this.unlockedStageIndex = 0;
        this.loadProgress();
    }

    getCurrentStage() {
        return TOURNAMENT_STAGES[this.currentStageIndex];
    }

    advanceStage() {
        if (this.currentStageIndex < TOURNAMENT_STAGES.length - 1) {
            this.currentStageIndex++;
            if (this.currentStageIndex > this.unlockedStageIndex) {
                this.unlockedStageIndex = this.currentStageIndex;
                this.saveProgress();
            }
            return true;
        }
        return false;
    }

    selectStage(index) {
        if (index <= this.unlockedStageIndex && index >= 0 && index < TOURNAMENT_STAGES.length) {
            this.currentStageIndex = index;
            return true;
        }
        return false;
    }

    saveProgress() {
        try {
            localStorage.setItem('neon_airhockey_tournament_stage', this.unlockedStageIndex.toString());
        } catch (e) {}
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('neon_airhockey_tournament_stage');
            if (saved !== null) {
                this.unlockedStageIndex = parseInt(saved, 10) || 0;
            }
        } catch (e) {}
    }

    resetProgress() {
        this.unlockedStageIndex = 0;
        this.currentStageIndex = 0;
        this.saveProgress();
    }
}
