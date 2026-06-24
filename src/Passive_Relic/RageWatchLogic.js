import { world } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";
import { CheckItemValid } from "../Curios_Base/CuriosAPI.js"; // Helper to check if item is worn

export class RageWatchLogic extends CuriosEventBase {
    constructor() {
        super("curio:ragewatch", "rage_logic");
        
        // Listen for damage globally
        world.afterEvents.entityHurt.subscribe((event) => 
        {
            const player = event.hurtEntity;
            
            // Ensure it's a player and they are wearing the Rage Watch
            if (player.typeId === "minecraft:player" && CheckItemValid(player, "Bracelet", this.identifier)) 
            {
                this.applyRage(player);
            }
        });
    }

    applyRage(player) {
        const currentEffect = player.getEffect("strength");
        let newAmplifier = 1; // Base is Strength II (Amplifier 1)

        if (currentEffect) {
            // If they already have strength, increment the level
            newAmplifier = currentEffect.amplifier + 1;
        }

        player.addEffect("strength", 60, { amplifier: newAmplifier, showParticles: true });
        player.onScreenDisplay.setActionBar(`§c怒 RAGE LEVEL ${newAmplifier + 1} §f`);
    }

    onEquip(player) {
        player.sendMessage("§cRage Watch Syncronized. Take damage to power up.");
    }
}