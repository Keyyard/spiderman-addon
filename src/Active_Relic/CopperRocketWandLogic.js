import { system, world, EquipmentSlot } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";

export class CopperRocketWandLogic extends CuriosEventBase {
    constructor() {
        super("curio:copper_rocket_wand", "rocket_logic");
        this.DASH_FORCE = 1.8;
        this.ELYTRA_BOOST = 1.5;
        this.REPAIR_INTERVAL = 2 * 20; // 5 Seconds (20 ticks * 5)
    }

    onTick(player) {
        // Only run repair scan if held in hand and on the 5-second interval
        if (system.currentTick % this.REPAIR_INTERVAL !== 0) return;

        const eq = player.getComponent("minecraft:equippable");
        const main = eq.getEquipmentSlot(EquipmentSlot.Mainhand);
        
        if (main.hasItem() && main.typeId === this.identifier) {
            const item = main.getItem();
            const dur = item.getComponent("minecraft:durability");
            
            // If item is damaged, try to find a copper nugget
            if (dur && dur.damage > 0) {
                if (this.consumeNugget(player)) {
                    dur.damage = Math.max(0, dur.damage - 1);
                    main.setItem(item);
                    player.onScreenDisplay.setActionBar("§6⚙ Wand Repaired with Copper Nugget");
                    player.dimension.playSound("random.orb", player.location, { pitch: 0.8 });
                }
            }
        }
    }

    onUse(player, itemStack) {
        const eq = player.getComponent("minecraft:equippable");
        const chest = eq.getEquipmentSlot(EquipmentSlot.Chest);
        const main = eq.getEquipmentSlot(EquipmentSlot.Mainhand);
        
        const view = player.getViewDirection();

        // Physics Logic
        if (chest.hasItem() && chest.typeId === "minecraft:elytra" && player.isGliding) {
            player.applyImpulse({
                x: view.x * this.ELYTRA_BOOST,
                y: view.y * this.ELYTRA_BOOST,
                z: view.z * this.ELYTRA_BOOST
            });
            player.dimension.playSound("firework.blast", player.location, { pitch: 1.2 });
            player.onScreenDisplay.setActionBar("§b🚀 Elytra Boost!");
        } else {
            const force = this.DASH_FORCE;
            player.applyImpulse({
                x: view.x * force,
                y: (view.y * force) + 0.2,
                z: view.z * force
            });
            player.dimension.playSound("firework.launch", player.location, { pitch: 1.5 });
            player.onScreenDisplay.setActionBar("§e⚡ Kinetic Dash");
        }

        // FIX: Create Molang Map to provide the missing 'variable.velocity'
        const molang = new MolangVariableMap();
        molang.setVector3("variable.velocity", { x: 0, y: 0, z: 0 }); 
        
        player.dimension.spawnParticle("minecraft:explosion_particle", player.location, molang);

        // Durability Logic
        const dur = itemStack.getComponent("minecraft:durability");
        if (dur) {
            dur.damage += 1;
            if (dur.damage >= dur.maxDurability) {
                player.dimension.playSound("random.break", player.location);
                main.setItem(undefined);
            } else {
                main.setItem(itemStack);
            }
        }
    }

    consumeNugget(player) {
        const inv = player.getComponent("minecraft:inventory").container;
        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (item && item.typeId === "minecraft:copper_nugget") {
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