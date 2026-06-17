import { CuriosEventEvolve } from "../Ults/CuriosEventEvolve.js";

export class HeroBadgeLogic extends CuriosEventEvolve {
    constructor() {
        // Inherit Evolve logic (Evolves to Badge 4 - Fallen)
        super("curio:evolve_badget_3", "hero_logic", "curio:evolve_badget_4");
        this.purifyCooldown = new Map();
    }

    // --- PASSIVE ABILITIES (When worn as Curio) ---
    onTick(player) {
        // Slow Falling by Y velocity
        if (player.getVelocity().y < -0.4) {
            player.addEffect("slow_falling", 10, { showParticles: false });
        }

        // Clear Debuff (30s CD)
        const lastPurify = this.purifyCooldown.get(player.id) || 0;
        if (Date.now() - lastPurify > 30000) {
            const badEffects = ["poison", "wither", "weakness", "slowness", "nausea", "blindness"];
            let cleaned = false;
            badEffects.forEach(effect => {
                if (player.getEffect(effect)) {
                    player.removeEffect(effect);
                    cleaned = true;
                }
            });
            if (cleaned) {
                this.purifyCooldown.set(player.id, Date.now());
                player.sendMessage("§b[Hero]§7 Debuffs purified!");
            }
        }
    }

    // --- EVOLUTION QUEST (When held in hand) ---
    onEvolveDeath(player, damageSource) {
        // Requirement: Get killed by Wither effect
        if (damageSource.cause === "wither") {
            player.setDynamicProperty("pending_fallen", true);
            player.sendMessage("§8The wither rot consumes the Hero's spirit...");
        }
    }
}