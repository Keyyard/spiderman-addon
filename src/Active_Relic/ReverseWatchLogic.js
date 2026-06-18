import { system, world, EquipmentSlot } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";

export class ReverseWatchLogic extends CuriosEventBase {
    constructor() {
        super("curio:reverse_watch", "reverse_logic");
        
        // Configurable Constants (By Seconds)
        const RECORD_TIME_SEC = 5;
        const COOLDOWN_SEC = 10;
        const LERP_TIME_SEC = 1.5;
        
        // Auto-calculate to Ticks (20 ticks per second)
        this.RECORD_TICKS = RECORD_TIME_SEC * 20;   // Buffer size
        this.COOLDOWN_TICKS = COOLDOWN_SEC * 20;
        this.LERP_TICKS = LERP_TIME_SEC * 20;
        
        // Player States
        this.history = new Map();   // { x, y, z, dim }
        this.cooldowns = new Map(); // Last timestamp
        this.rewinding = new Map(); // Current Rewind State
    }

    /**
     * @override
     * Handle Timeline Recording and Rewinding Lerp
     */
    onTick(player) {
        const pid = player.id;

        // 1. Check if the player is currently rewinding
        if (this.rewinding.has(pid)) {
            this.handleRewind(player);
            return; // Skip recording while time is traveling
        }

        // 2. Check if player is holding the watch
        const eq = player.getComponent("minecraft:equippable");
        const main = eq.getEquipmentSlot(EquipmentSlot.Mainhand);

        if (main.hasItem() && main.typeId === this.identifier) {
            let hist = this.history.get(pid) || [];
            
            // Record current position
            hist.push({
                x: player.location.x,
                y: player.location.y,
                z: player.location.z,
                dim: player.dimension.id
            });

            // Trim old positions to keep buffer at exact max memory limits (5 seconds)
            if (hist.length > this.RECORD_TICKS) {
                hist.shift(); 
            }

            this.history.set(pid, hist);
            
            // UI Indication
            if (system.currentTick % 20 === 0) {
                player.onScreenDisplay.setActionBar(`§3● Recording Timeline... (${(hist.length / 20).toFixed(1)}s)`);
            }
        } else {
            // "time count from the moment user hold the Clock" -> clear buffer if unequipped
            if (this.history.has(pid)) {
                this.history.delete(pid);
                player.onScreenDisplay.setActionBar(`§8○ Timeline Cleared`);
            }
        }
    }

    /**
     * @override
     * Trigger the Rewind
     */
    onUse(player, itemStack) {
        const pid = player.id;
        const now = system.currentTick;
        
        // Cooldown check
        const lastUse = this.cooldowns.get(pid) || 0;
        if (now - lastUse < this.COOLDOWN_TICKS) {
            const timeLeft = Math.ceil((this.COOLDOWN_TICKS - (now - lastUse)) / 20);
            player.onScreenDisplay.setActionBar(`§cWatch Recharge: ${timeLeft}s`);
            return;
        }

        const hist = this.history.get(pid);
        if (!hist || hist.length < 2) {
            player.onScreenDisplay.setActionBar(`§cNot enough timeline data to reverse!`);
            return;
        }

        // Set Cooldown
        this.cooldowns.set(pid, now);
        
        // Reverse array so [0] is current pos and [N] is the oldest position
        this.rewinding.set(pid, {
            path: [...hist].reverse(),
            currentTick: 0
        });
        
        // Wipe history so it resets immediately
        this.history.delete(pid);
        
        player.dimension.playSound("mob.endermen.portal", player.location);
    }

    /**
     * The Lerp Execution running via onTick
     */
    handleRewind(player) {
        const pid = player.id;
        const state = this.rewinding.get(pid);
        
        state.currentTick++;

        // Finalize Lerp
        if (state.currentTick >= this.LERP_TICKS) {
            this.rewinding.delete(pid);
            player.onScreenDisplay.setActionBar(`§aTimeline Restored`);
            player.dimension.playSound("random.levelup", player.location);
            return;
        }

        // Math: Map progress (0 -> 1) directly to the Array indices
        const progress = state.currentTick / this.LERP_TICKS;
        const floatIndex = progress * (state.path.length - 1);
        const index1 = Math.floor(floatIndex);
        const index2 = Math.ceil(floatIndex);
        
        const p1 = state.path[index1];
        const p2 = state.path[index2];
        
        // Sub-progress between the two array points
        const localProgress = floatIndex - index1;
        
        // Interpolate
        const lerpedPos = {
            x: p1.x + (p2.x - p1.x) * localProgress,
            y: p1.y + (p2.y - p1.y) * localProgress,
            z: p1.z + (p2.z - p1.z) * localProgress
        };

        // Collision Break-out (If blocked by solid blocks, abort rewind)
        try {
            const blockFeet = player.dimension.getBlock(lerpedPos);
            const blockHead = player.dimension.getBlock({ x: lerpedPos.x, y: lerpedPos.y + 1, z: lerpedPos.z });
            
            const isBlockedFeet = blockFeet && !blockFeet.isAir && !blockFeet.isLiquid;
            const isBlockedHead = blockHead && !blockHead.isAir && !blockHead.isLiquid;

            if (isBlockedFeet || isBlockedHead) {
                this.rewinding.delete(pid);
                player.onScreenDisplay.setActionBar(`§cTimeline Collision! Rewind Aborted.`);
                player.dimension.playSound("random.break", player.location);
                return;
            }
        } catch (e) {
            // Handled if lerp goes into an unloaded chunk
            this.rewinding.delete(pid);
            player.onScreenDisplay.setActionBar(`§cTimeline Broken! (Chunk unloaded)`);
            return;
        }

        // Teleport
        player.teleport(lerpedPos, { checkForBlocks: false });
        player.dimension.spawnParticle("minecraft:endrod", lerpedPos);
    }
}