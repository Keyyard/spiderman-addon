import { world, system, EquipmentSlot } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";

export class EnderBeltLogic extends CuriosEventBase {
    constructor() {
        super("curio:enderbelt", "ender_logic");
        this.MAX_DISTANCE = 25;
    }

    onTick(player) {
        const equippable = player.getComponent("minecraft:equippable");
        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);

        // Show particles if holding a pearl
        if (mainhand.hasItem() && mainhand.typeId === "minecraft:ender_pearl") {
            player.dimension.spawnParticle("minecraft:portal_base_particle", player.location);
        }
    }

    // This is called by world.afterEvents.itemUse in CuriosEvent.js
    onUse(player, itemStack) {
        if (itemStack.typeId !== "minecraft:ender_pearl") return;

        // Perform Hitscan
        const raycast = player.getBlockFromViewDirection({ maxDistance: this.MAX_DISTANCE });

        if (raycast) {
            const hitBlock = raycast.block;
            const face = raycast.face;
            
            // Calculate teleport position (slightly offset from the face to avoid getting stuck)
            let tpPos = { x: hitBlock.x + 0.5, y: hitBlock.y, z: hitBlock.z + 0.5 };
            
            if (face === "Up") tpPos.y += 1;
            else if (face === "Down") tpPos.y -= 2;
            else if (face === "North") tpPos.z -= 0.5;
            else if (face === "South") tpPos.z += 0.5;
            else if (face === "West") tpPos.x -= 0.5;
            else if (face === "East") tpPos.x += 0.5;

            // Visual effects
            player.dimension.spawnParticle("minecraft:mobsidian_dust_particle", player.location);
            player.teleport(tpPos);
            player.dimension.playSound("mob.endermen.portal", tpPos);
            
            player.onScreenDisplay.setActionBar("§dHitscan Blink!§f");
        } else {
            player.sendMessage("§cToo far to blink!");
        }
    }
}