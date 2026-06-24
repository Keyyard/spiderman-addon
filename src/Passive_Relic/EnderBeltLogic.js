import { world, system, EquipmentSlot, MolangVariableMap } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";
import { CheckItemValid } from "../Curios_Base/CuriosAPI.js";

// --- Visual Constants (Spider-style) ---
const STRAND_SPACING = 0.5; // distance between particles
const STRAND_MAX = 64;      // max particles per line to prevent lag

export class EnderBeltLogic extends CuriosEventBase {
    constructor() {
        super("curio:enderbelt", "ender_logic");
        this.MAX_DISTANCE = 25;
        this.COOLDOWN_TICKS = 20;

        // Handle the teleport when pearl is used
        world.beforeEvents.itemUse.subscribe((ev) => {
            const player = ev.source;
            if (ev.itemStack.typeId === "minecraft:ender_pearl" && CheckItemValid(player, "Belt", this.identifier)) {
                if (player.getItemCooldown("minecraft:ender_pearl") > 0) return;
                
                system.run(() => this.executeBlink(player));
                ev.cancel = true; 
            }
        });
    }

    onTick(player) {
        // 1. Requirement Check: Belt + Sneaking + Holding Pearl
        if (!CheckItemValid(player, "Belt", this.identifier)) return;
        if (!player.isSneaking) return;

        const eq = player.getComponent("minecraft:equippable");
        const main = eq.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (!main.hasItem() || main.typeId !== "minecraft:ender_pearl") return;

        // 2. Cooldown check for visual ray (hide ray if not ready)
        if (player.getItemCooldown("minecraft:ender_pearl") > 0) return;

        // 3. Calculate Ray Points
        const head = player.getHeadLocation();
        const view = player.getViewDirection();
        const ray = player.getBlockFromViewDirection({ maxDistance: this.MAX_DISTANCE });

        let targetPos;
        if (ray) {
            targetPos = { x: ray.block.x + 0.5, y: ray.block.y + 0.5, z: ray.block.z + 0.5 };
        } else {
            targetPos = {
                x: head.x + view.x * this.MAX_DISTANCE,
                y: head.y + view.y * this.MAX_DISTANCE,
                z: head.z + view.z * this.MAX_DISTANCE
            };
        }

        // 4. Render the beam
        this.renderBeam(player, head, targetPos, "minecraft:portal_base_particle");
    }

    /**
     * Optimized beam rendering using spacing and capping
     */
    renderBeam(player, start, end, particleId) {
        const d = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z };
        const dist = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
        
        // Calculate steps based on distance and spacing
        const steps = Math.min(STRAND_MAX, Math.max(2, Math.ceil(dist / STRAND_SPACING)));

        // Setup Molang to avoid errors
        const molang = new MolangVariableMap();
        molang.setVector3("variable.direction", { x: d.x / dist, y: d.y / dist, z: d.z / dist });
        molang.setFloat("variable.distance", dist);
        molang.setFloat("variable.alpha", 0.6); // Slightly transparent for preview

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            try {
                player.dimension.spawnParticle(particleId, {
                    x: start.x + d.x * t,
                    y: start.y + d.y * t,
                    z: start.z + d.z * t,
                }, molang);
            } catch { break; }
        }
    }

    executeBlink(player) {
        const head = player.getHeadLocation();
        const view = player.getViewDirection();
        const ray = player.getBlockFromViewDirection({ maxDistance: this.MAX_DISTANCE });

        let tpPos;
        if (ray) {
            const face = ray.face;
            tpPos = { x: ray.block.x + 0.5, y: ray.block.y, z: ray.block.z + 0.5 };
            if (face === "Up") tpPos.y += 1;
            else if (face === "Down") tpPos.y -= 1.6;
            else if (face === "North") tpPos.z -= 0.7;
            else if (face === "South") tpPos.z += 0.7;
            else if (face === "West") tpPos.x -= 0.7;
            else if (face === "East") tpPos.x += 0.7;
        } else {
            tpPos = {
                x: head.x + view.x * this.MAX_DISTANCE,
                y: head.y + view.y * this.MAX_DISTANCE,
                z: head.z + view.z * this.MAX_DISTANCE
            };
        }

        // Draw a dense "Flash" beam on teleport
        this.renderBeam(player, head, tpPos, "minecraft:portal_reverse_particle");
        
        player.teleport(tpPos);
        player.dimension.playSound("mob.endermen.portal", tpPos);

        player.startItemCooldown("minecraft:ender_pearl", this.COOLDOWN_TICKS);

        // Consume Pearl
        const inv = player.getComponent("minecraft:inventory").container;
        const item = inv.getItem(player.selectedSlotIndex);
        if (item && item.amount > 1) { 
            item.amount -= 1; 
            inv.setItem(player.selectedSlotIndex, item); 
        } else { 
            inv.setItem(player.selectedSlotIndex, undefined); 
        }
    }
}