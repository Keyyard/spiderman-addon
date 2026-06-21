import { world, system, EntityDamageCause } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";
import { CheckItemValid } from "../Curios_Base/CuriosAPI.js";

export class BiteTheDustLogic extends CuriosEventBase {
    constructor() {
        super("curio:killer_queen_btd", "btd_logic");
        
        this.COOLDOWN_TICKS = 24000; // 1 Minecraft Day
        this.checkpoints = new Map(); // Store { loc, health, dimId }
        this.cooldowns = new Map();

        // Listen for damage to intercept death (Totem mechanic)
        world.beforeEvents.entityHurt.subscribe((ev) => {
            if (ev.hurtEntity.typeId !== "minecraft:player") return;
            
            const player = ev.hurtEntity;
            const healthComp = player.getComponent("minecraft:health");
            
            // Check if damage is fatal
            if (ev.damage >= healthComp.currentValue) {
                // Check if wearing relic (any valid slot)
                if (CheckItemValid(player, "Trinket", this.identifier) || CheckItemValid(player, "Charm", this.identifier)) {
                    const ready = this.triggerBiteTheDust(player, ev.damageSource);
                    if (ready) {
                        ev.damage = 0; // Cancel the fatal damage
                    }
                }
            }
        });
    }

    /**
     * Set Checkpoint: Shift + Right Click
     */
    onUse(player, itemStack) {
        if (!player.isSneaking) {
            player.onScreenDisplay.setActionBar("§7Sneak to set Checkpoint");
            return;
        }

        const health = player.getComponent("minecraft:health").currentValue;
        this.checkpoints.set(player.id, {
            loc: { x: player.location.x, y: player.location.y, z: player.location.z },
            health: health,
            dim: player.dimension.id
        });

        player.onScreenDisplay.setActionBar("§d✨ Timeline Anchor Set!");
        player.dimension.playSound("note.pling", player.location, { pitch: 2.0 });
    }

    /**
     * Rewind Logic
     */
    triggerBiteTheDust(player, damageSource) {
        const pid = player.id;
        const now = system.currentTick;

        // 1. Cooldown Check
        const lastUsed = this.cooldowns.get(pid) || 0;
        if (now - lastUsed < this.COOLDOWN_TICKS) return false;

        // 2. Check if a point is actually saved
        const data = this.checkpoints.get(pid);
        if (!data) return false;

        // 3. Activate Rewind
        this.cooldowns.set(pid, now);
        
        system.run(() => {
            player.sendMessage("§cKILLER QUEEN: BITE THE DUST!");
            
            // Teleport and Restore
            player.teleport(data.loc, { dimension: world.getDimension(data.dim) });
            const healthComp = player.getComponent("minecraft:health");
            healthComp.setCurrentValue(data.health);

            // Attacker Retribution (200 Damage)
            const attacker = damageSource.damagingEntity;
            if (attacker && attacker.isValid && attacker.typeId !== "minecraft:ender_dragon") {
                attacker.applyDamage(200, { cause: "entityExplosion", damagingEntity: player });
                attacker.dimension.spawnParticle("minecraft:huge_explosion_lab_misc_terrestrial_particle", attacker.location);
            }

            // Visuals
            player.dimension.playSound("ambient.weather.thunder", player.location);
            player.dimension.spawnParticle("minecraft:camera_shoot_explosion", player.location);
        });

        return true;
    }

    onTick(player) {
        // Simple UI for cooldown tracking
        if (system.currentTick % 100 === 0) {
            const lastUsed = this.cooldowns.get(player.id) || 0;
            const diff = system.currentTick - lastUsed;
            if (diff < this.COOLDOWN_TICKS) {
                const remaining = Math.ceil((this.COOLDOWN_TICKS - diff) / 1200);
                player.onScreenDisplay.setActionBar(`§8Bite the Dust charging: ${remaining}m`);
            }
        }
    }
}