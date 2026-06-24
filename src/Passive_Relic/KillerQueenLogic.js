import { world, system } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";
import { CheckItemValid } from "../Curios_Base/CuriosAPI.js";

export class KillerQueenLogic extends CuriosEventBase {
    constructor() {
        super("curio:killer_queen", "kq_logic");
        this.EXPLOSION_RADIUS = 4;
        this.AOE_DAMAGE = 2;

        // Listen for projectile hits
        world.afterEvents.projectileHitBlock.subscribe((ev) => this.handleHit(ev));
        world.afterEvents.projectileHitEntity.subscribe((ev) => this.handleHit(ev));
    }

    handleHit(event) {
        const shooter = event.source;
        if (!shooter || shooter.typeId !== "minecraft:player") return;

        // Check if player is wearing the Killer Queen relic (Hand or Trinket slot)
        if (CheckItemValid(shooter, "Hand", this.identifier) || CheckItemValid(shooter, "Trinket", this.identifier)) {
            const loc = event.location;
            const dim = shooter.dimension;

            // 1. Visual/Sound Explosion (Does not break blocks)
            dim.createExplosion(loc, this.EXPLOSION_RADIUS, { breaksBlocks: false, causesFire: false });

            // 2. AOE Damage to nearby entities
            const targets = dim.getEntities({
                location: loc,
                maxDistance: this.EXPLOSION_RADIUS,
                excludeTypes: ["minecraft:player", "minecraft:item"] // Don't blow up self or loot
            });

            for (const entity of targets) {
                entity.applyDamage(this.AOE_DAMAGE, {
                    cause: "projectile",
                    damagingEntity: shooter
                });
            }
        }
    }
}