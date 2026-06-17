import { CuriosEventEvolve } from "../Ults/CuriosEventEvolve.js";
import { system } from "@minecraft/server";

export class FallenBeliefLogic extends CuriosEventEvolve {
    constructor() {
        // ID: Badge 4, Key: fallen_logic, Evolves to: Badge 5 (Made in Heaven)
        super("curio:evolve_badget_4", "fallen_logic", "curio:evolve_badget_5");
    }

    /**
     * PASSIVE EFFECTS (When worn in Curio slot)
     * Requirement: Give player perma Slowness 1 and Weakness 1
     */
    onTick(player) {
        player.addEffect("slowness", 40, { amplifier: 0, showParticles: true });
        player.addEffect("weakness", 40, { amplifier: 0, showParticles: true });
    }

    /**
     * EVOLUTION QUEST (When held in Off-hand)
     * Requirement: 1 hour wait -> Target Coords (1k-2k away, Y200) -> 20 min limit
     */
    onEvolveTick(player, offhandSlot) {
        let state = player.getDynamicProperty("mih_state") || "waiting";
        let timer = player.getDynamicProperty("mih_timer") || 0;

        if (state === "waiting") {
            timer++;
            // 3600 seconds = 1 hour
            if (timer >= 3600) {
                // Generate random coordinate between 1000 and 2000 blocks away
                const range = () => (Math.random() * 1000 + 1000) * (Math.random() < 0.5 ? -1 : 1);
                const tx = player.location.x + range();
                const tz = player.location.z + range();

                player.setDynamicProperty("mih_tx", tx);
                player.setDynamicProperty("mih_tz", tz);
                player.setDynamicProperty("mih_state", "travel");
                player.setDynamicProperty("mih_timer", 1200); // 1200s = 20 minutes

                player.sendMessage("§d[Whisper]§f The position is set. Reach the heavens.");
                player.sendMessage(`§d[Coords]§e X: ${Math.round(tx)}, Y: 200, Z: ${Math.round(tz)} §f(20 minutes remaining)`);
            } else {
                player.setDynamicProperty("mih_timer", timer);
            }
        } 
        else if (state === "travel") {
            timer--;
            player.setDynamicProperty("mih_timer", timer);

            // Check if time ran out
            if (timer <= 0) {
                player.setDynamicProperty("mih_state", "waiting");
                player.setDynamicProperty("mih_timer", 0);
                player.sendMessage("§c[Quest]§7 You were too slow. The alignment has passed. Wait 1 hour.");
                return;
            }

            // Target Detection
            const targetX = player.getDynamicProperty("mih_tx");
            const targetZ = player.getDynamicProperty("mih_tz");
            
            const distXZ = Math.hypot(player.location.x - targetX, player.location.z - targetZ);
            const distY = Math.abs(player.location.y - 200);

            // 3x3x3 Detection range (approx dist < 2)
            if (distXZ < 2 && distY < 2) {
                player.setDynamicProperty("mih_state", "ascended");
                this.startAscension(player, offhandSlot);
            }

            // Optional: Action bar reminder every few seconds
            if (timer % 10 === 0) {
                player.onScreenDisplay.setActionBar(`§dTarget: §f${Math.round(targetX)}, 200, ${Math.round(targetZ)} §7| §e${Math.floor(timer/60)}m left`);
            }
        }
    }

    /**
     * The Final Ritual
     * Requirement: Levitation 40s -> Fall 5s -> Made in Heaven
     */
    startAscension(player, offhandSlot) {
        player.sendMessage("§dThe ritual has begun. Do not look down.");
        
        // 1. Levitation for 40 seconds (800 ticks)
        player.addEffect("levitation", 800, { amplifier: 1 });

        // 2. Evolution sequence
        // Wait 800 ticks (levitation ends) + 100 ticks (5 seconds freefall)
        system.runTimeout(() => {
            if (!player.isValid) return;

            // Trigger the badge change
            this.evolve(player, offhandSlot);

            // Requirement: Give Slow Falling for 1 min after the fall
            player.addEffect("slow_falling", 1200, { amplifier: 0 });
            
            // Final message
            player.sendMessage("§b§lMADE IN HEAVEN");
            player.setDynamicProperty("mih_state", "idle");
            player.setDynamicProperty("mih_timer", 0);
        }, 900); 
    }
}