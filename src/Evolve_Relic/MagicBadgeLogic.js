import { CuriosEventEvolve } from "../Ults/CuriosEventEvolve.js";

export class MagicBadgeLogic extends CuriosEventEvolve {
    constructor() { 
        super("curio:evolve_badget_2", "magic_logic", "curio:evolve_badget_3"); 
    }

    /**
     * PASSIVE EFFECT
     * Speed 1 while worn in Trinket slot
     */
    onTick(player) { 
        player.addEffect("speed", 40, { amplifier: 0, showParticles: false }); 
    }

    /**
     * EVOLUTION QUEST
     * Requirement: Hold in Off-hand + Nether Star in Inventory for 20s
     */
    onEvolveTick(player, offhand) {
        const inv = player.getComponent("minecraft:inventory").container;
        let hasStar = false;
        let starSlot = -1;

        // 1. Scan inventory for a Nether Star
        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (item?.typeId === "minecraft:nether_star") {
                hasStar = true;
                starSlot = i;
                break;
            }
        }

        // 2. Timer Logic
        if (hasStar) {
            let timer = (player.getDynamicProperty("ev_t2") || 0) + 1;
            player.setDynamicProperty("ev_t2", timer);

            // Progress Whispers
            if (timer === 1) player.sendMessage("§b The star begins to glow on your hand...");
            if (timer === 5) player.sendMessage("§b The magic trying to reach the star");
            if (timer === 10) player.sendMessage("§b They fusing !!!");

            // Final Evolution
            if (timer >= 20) {
                const item = inv.getItem(starSlot);
                
                // Consume the Star
                if (item.amount > 1) {
                    item.amount--; 
                    inv.setItem(starSlot, item);
                } else {
                    inv.setItem(starSlot, undefined);
                }

                // Evolution Effect
                this.evolve(player, offhand, "And thats how a hero born");
                
                // Visuals
                const loc = player.location;
                player.dimension.spawnParticle("minecraft:enchanted_hit_particle", { x: loc.x, y: loc.y + 1, z: loc.z });
                player.dimension.playSound("random.orb", loc, { pitch: 0.5 });

                player.setDynamicProperty("ev_t2", 0);
            }
        } else {
            // Reset timer if the star is removed from inventory
            player.setDynamicProperty("ev_t2", 0);
        }
    }
}