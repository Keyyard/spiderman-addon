import { system, world, EquipmentSlot } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";

export class ReverseWatchLogic extends CuriosEventBase {
    constructor() {
        super("curio:reverse_watch", "reverse_logic");
        this.RECORD_TICKS = 100; // 5 Seconds total history
        this.RECORD_INTERVAL = 2; // Record every 2 ticks (Optimization)
        this.LERP_TICKS = 30;    // 1.5 Seconds travel time for the rewind
        this.COOLDOWN_TICKS = 200; // 10 Seconds cooldown

        this.history = new Map();   
        this.rewinding = new Map(); 
        this.cooldowns = new Map();
    }

    onTick(player) {
        const pid = player.id;

        // 1. If currently rewinding, handle the movement and stop recording
        if (this.rewinding.has(pid)) {
            this.handleRewind(player);
            return;
        }

        // 2. Optimization: Record every 2 ticks
        if (system.currentTick % this.RECORD_INTERVAL !== 0) return;

        let hist = this.history.get(pid) || [];
        hist.push({
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
            rot: player.getRotation() // Record head rotation for Tracer effect
        });

        // Limit history to 5 seconds (50 samples * 2 ticks = 100 ticks)
        const maxSamples = this.RECORD_TICKS / this.RECORD_INTERVAL;
        if (hist.length > maxSamples) hist.shift();
        
        this.history.set(pid, hist);
        
        // Visual feedback
        if (system.currentTick % 20 === 0) {
            player.onScreenDisplay.setActionBar(`§3● Timeline Recording...`);
        }
    }

    onUse(player, itemStack) {
        const pid = player.id;
        const now = system.currentTick;
        
        const lastUse = this.cooldowns.get(pid) || 0;
        if (now - lastUse < this.COOLDOWN_TICKS) {
            player.onScreenDisplay.setActionBar(`§cWatch Recharging...`);
            return;
        }

        const hist = this.history.get(pid);
        if (!hist || hist.length < 10) {
            player.onScreenDisplay.setActionBar(`§cNot enough data!`);
            return;
        }

        // Start Rewind Logic
        this.cooldowns.set(pid, now);
        this.rewinding.set(pid, {
            path: [...hist].reverse(), // Reverse the array to go backwards
            currentTick: 0
        });
        
        // Clear current history to prevent immediate re-rewinding to the same spot
        this.history.delete(pid);
        player.dimension.playSound("mob.endermen.portal", player.location, { pitch: 1.5 });
    }

    handleRewind(player) {
        const pid = player.id;
        const state = this.rewinding.get(pid);
        state.currentTick++;

        // Stop rewinding when animation is finished
        if (state.currentTick >= this.LERP_TICKS) {
            this.rewinding.delete(pid);
            player.onScreenDisplay.setActionBar(`§a§lTimeline Restored`);
            return;
        }

        // Calculate progress (0.0 to 1.0)
        const progress = state.currentTick / this.LERP_TICKS;
        const floatIndex = progress * (state.path.length - 1);
        const index1 = Math.floor(floatIndex);
        const index2 = Math.ceil(floatIndex);
        
        const p1 = state.path[index1];
        const p2 = state.path[index2];
        const localProgress = floatIndex - index1;
        
        // Linear Interpolation (Lerp) between recorded points for perfect smoothness
        const lerpedPos = {
            x: p1.x + (p2.x - p1.x) * localProgress,
            y: p1.y + (p2.y - p1.y) * localProgress,
            z: p1.z + (p2.z - p1.z) * localProgress
        };

        // Teleport the player
        player.teleport(lerpedPos, { rotation: p1.rot });
        
        // Tracer-like particles
        player.dimension.spawnParticle("minecraft:endrod", lerpedPos);
        if (state.currentTick % 3 === 0) {
            player.dimension.playSound("random.break", lerpedPos, { pitch: 2.0, volume: 0.2 });
        }
    }
}