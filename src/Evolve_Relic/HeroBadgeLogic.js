import { CuriosEventEvolve } from "../Ults/CuriosEventEvolve.js";

export class HeroBadgeLogic extends CuriosEventEvolve {
    // UPDATED: Added parameters to constructor
    constructor(id = "curio:evolve_badget_3", key = "hero_logic", evolveTo = "curio:evolve_badget_4") {
        super(id, key, evolveTo);
        this.purifyCooldown = new Map();
    }

    onTick(player) {
        const velocity = player.getVelocity();

        // --- ENHANCED SLOW FALLING (Raycast + Velocity) ---
        // 1. Check if the player is actually falling downwards
        if (velocity.y < -0.4) {
            
            // 2. Perform a raycast straight down from the player's feet
            // We check for 2.5 blocks below + a little extra based on current speed
            const rayDistance = 2.5 + Math.abs(velocity.y);
            
            const ray = player.dimension.getBlockFromRay(
                player.location, 
                { x: 0, y: -1, z: 0 }, 
                { maxDistance: rayDistance, includePassableBlocks: false }
            );

            // 3. If the ray finds a block, it means the player is close to the ground
            if (ray) {
                player.addEffect("slow_falling", 10, { showParticles: false });
            }
        }

        // Clear Debuff (20s CD)
        const lastPurify = this.purifyCooldown.get(player.id) || 0;
        if (Date.now() - lastPurify > 20000) {
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

    onEvolveDeath(player, damageSource) {
        if (damageSource.cause === "wither") {
            player.setDynamicProperty("pending_fallen", true);
            player.sendMessage("§8The wither rot consumes the Hero's spirit...");
        }
    }
}