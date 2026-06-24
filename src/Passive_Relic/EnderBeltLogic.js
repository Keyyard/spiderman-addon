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

        // Subtle ambient particles while holding pearl
        if (mainhand.hasItem() && mainhand.typeId === "minecraft:ender_pearl") {
            player.dimension.spawnParticle("minecraft:portal_base_particle", player.location);
        }
    }

    onUse(player, itemStack) {
        if (itemStack.typeId !== "minecraft:ender_pearl") return;

        // Perform Hitscan
        const raycast = player.getBlockFromViewDirection({ maxDistance: this.MAX_DISTANCE });

        if (raycast) {
            const hitBlock = raycast.block;
            const face = raycast.face;
            const startPos = player.getHeadLocation();
            
            // Calculate teleport destination (offset from face)
            let tpPos = { x: hitBlock.x + 0.5, y: hitBlock.y, z: hitBlock.z + 0.5 };
            if (face === "Up") tpPos.y += 1;
            else if (face === "Down") tpPos.y -= 1;
            else if (face === "North") tpPos.z -= 0.5;
            else if (face === "South") tpPos.z += 0.5;
            else if (face === "West") tpPos.x -= 0.5;
            else if (face === "East") tpPos.x += 0.5;

            // --- 1. Draw Particle Ray ---
            this.drawRayEffect(player.dimension, startPos, tpPos);

            // --- 2. Spawn End Rod effect at destination ---
            player.dimension.spawnParticle("minecraft:end_rod", tpPos);

            // --- 3. Teleport and Sound ---
            player.dimension.spawnParticle("minecraft:mobsidian_dust_particle", player.location);
            player.teleport(tpPos);
            player.dimension.playSound("mob.endermen.portal", tpPos);
            
            player.onScreenDisplay.setActionBar("§d✧ Blink ✧§f");
        } else {
            player.sendMessage("§cToo far to blink!");
        }
    }

    /**
     * Draws a line of particles from start to end
     */
    drawRayEffect(dimension, start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dz = end.z - start.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Number of particles (roughly one every 0.5 blocks)
        const steps = Math.floor(distance * 2); 
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const particlePos = {
                x: start.x + dx * progress,
                y: start.y + dy * progress,
                z: start.z + dz * progress
            };
            
            // Enderman-style portal particles
            dimension.spawnParticle("minecraft:portal_reverse_particle", particlePos);
        }
    }
}