import { world, system, EquipmentSlot } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";
import { CheckItemValid } from "../Curios_Base/CuriosAPI.js";

export class EnderBeltLogic extends CuriosEventBase {
    constructor() {
        super("curio:enderbelt", "ender_logic");
        this.MAX_DISTANCE = 25;

        world.beforeEvents.itemUse.subscribe((ev) => {
            if (ev.itemStack.typeId === "minecraft:ender_pearl" && CheckItemValid(ev.source, "Belt", this.identifier)) {
                system.run(() => this.executeBlink(ev.source));
                ev.cancel = true;
            }
        });
    }

    onTick(player) {
        if (!CheckItemValid(player, "Belt", this.identifier)) return;
        const eq = player.getComponent("minecraft:equippable");
        const main = eq.getEquipmentSlot(EquipmentSlot.Mainhand);

        if (player.isSneaking && main.hasItem() && main.typeId === "minecraft:ender_pearl") {
            const ray = player.getBlockFromViewDirection({ maxDistance: this.MAX_DISTANCE });
            if (ray) this.drawRay(player.dimension, player.getHeadLocation(), ray.block.location, "minecraft:portal_base_particle", 1);
        }
    }

    executeBlink(player) {
        const ray = player.getBlockFromViewDirection({ maxDistance: this.MAX_DISTANCE });
        if (!ray) return;

        const startPos = player.getHeadLocation();
        const face = ray.face;
        let tpPos = { x: ray.block.x + 0.5, y: ray.block.y, z: ray.block.z + 0.5 };
        
        if (face === "Up") tpPos.y += 1;
        else if (face === "Down") tpPos.y -= 1.6;
        else if (face === "North") tpPos.z -= 0.7;
        else if (face === "South") tpPos.z += 0.7;
        else if (face === "West") tpPos.x -= 0.7;
        else if (face === "East") tpPos.x += 0.7;

        this.drawRay(player.dimension, startPos, tpPos, "minecraft:portal_reverse_particle", 2);
        player.teleport(tpPos);
        player.dimension.playSound("mob.endermen.portal", tpPos);

        // Consume Pearl
        const inv = player.getComponent("minecraft:inventory").container;
        const item = inv.getItem(player.selectedSlotIndex);
        if (item.amount > 1) { item.amount -= 1; inv.setItem(player.selectedSlotIndex, item); }
        else { inv.setItem(player.selectedSlotIndex, undefined); }
    }

    drawRay(dimension, start, end, particleId, density) {
        const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const steps = Math.floor(dist * density);

        // FIX: If steps is 0 (too close), don't run the loop to avoid NaN errors
        if (steps <= 2) return; 

        for (let i = 0; i <= steps; i++) {
            const p = i / steps;
            dimension.spawnParticle(particleId, { 
                x: start.x + dx * p, 
                y: start.y + dy * p, 
                z: start.z + dz * p 
            });
        }
    }
}