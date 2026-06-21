import { system, world, EquipmentSlot } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";

export class CopperRocketWandLogic extends CuriosEventBase {
    constructor() {
        super("curio:copper_rocket_wand", "rocket_logic");
        
        // Constants
        this.DASH_FORCE = 2.5;     // Ground/Air dash strength
        this.ELYTRA_BOOST = 1.2;    // Multiplier for Elytra flight (Vanila Rocket lvl 1 is approx 2.0)
    }

    /**
     * @override
     * Passive repair logic: Scans for copper ingots while the wand is held.
     */
    onTick(player) {
        if (system.currentTick % 10 !== 0) return;

        const eq = player.getComponent("minecraft:equippable");
        const main = eq.getEquipmentSlot(EquipmentSlot.Mainhand);
        
        if (main.hasItem() && main.typeId === this.identifier) {
            const item = main.getItem();
            const dur = item.getComponent("minecraft:durability");
            
            // If the item is damaged, attempt to repair using 1 copper ingot
            if (dur && dur.damage > 0) {
                if (this.consumeCopper(player)) {
                    dur.damage -= 1;
                    main.setItem(item);
                    player.onScreenDisplay.setActionBar("§6⚙ Rocket Wand Repaired");
                    player.dimension.playSound("random.anvil_use", player.location, { pitch: 1.5, volume: 0.4 });
                }
            }
        }
    }

    /**
     * @override
     * Handle the Active Dash / Elytra Boost
     */
    onUse(player, itemStack) {
        const eq = player.getComponent("minecraft:equippable");
        const main = eq.getEquipmentSlot(EquipmentSlot.Mainhand);
        const chest = eq.getEquipmentSlot(EquipmentSlot.Chest);
        
        if (!main.hasItem() || main.typeId !== this.identifier) return;

        const view = player.getViewDirection();

        // Check if player is using an Elytra and currently gliding
        if (chest.hasItem() && chest.typeId === "minecraft:elytra" && player.isGliding) {
            // ELYTRA MODE: Apply impulse velocity (Mimics half-power rocket)
            player.applyImpulse({
                x: view.x * this.ELYTRA_BOOST,
                y: view.y * this.ELYTRA_BOOST,
                z: view.z * this.ELYTRA_BOOST
            });
            player.dimension.playSound("firework.blast", player.location, { pitch: 1.2 });
            player.onScreenDisplay.setActionBar("§b🚀 Elytra Boost Engaged");
        } 
        else {
            // DASH MODE: Use applyKnockback based on view vector
            // applyKnockback parameters: (dirX, dirZ, horizontalForce, verticalForce)
            player.applyKnockback(view.x, view.z, this.DASH_FORCE, view.y * (this.DASH_FORCE * 0.5));
            player.dimension.playSound("firework.launch", player.location);
            player.onScreenDisplay.setActionBar("§e⚡ Kinetic Dash");
        }

        // Particle effect for both modes
        player.dimension.spawnParticle("minecraft:basic_smoke_particle", player.location);

        // Handle Durability (Max 6)
        const item = main.getItem();
        const dur = item.getComponent("minecraft:durability");

        if (dur) {
            dur.damage += 1;
            
            // If it "breaks" (reaches 6), reset it to durability 1 (Emergency mode)
            if (dur.damage >= dur.maxDurability) {
                // To set durability to 1, we set damage to max - 1
                dur.damage = dur.maxDurability - 1;
                player.onScreenDisplay.setActionBar("§c⚠ Wand Depleted: Emergency Reserve Active");
                player.dimension.playSound("random.break", player.location);
            }
            
            main.setItem(item);
        }
    }

    /**
     * Finds and removes one copper ingot from the player's inventory
     */
    consumeCopper(player) {
        const inv = player.getComponent("minecraft:inventory").container;
        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (item && item.typeId === "minecraft:copper_ingot") {
                if (item.amount > 1) {
                    item.amount -= 1;
                    inv.setItem(i, item);
                } else {
                    inv.setItem(i, undefined);
                }
                return true;
            }
        }
        return false;
    }
}