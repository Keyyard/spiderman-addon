import { world, system, Entity } from "@minecraft/server";

const activeGrapples = new Map(); 
const MAX_GRAPPLE_DISTANCE = 30;

/**
 * Custom Velocity Handler
 * @param {Entity} target - The player or entity to move (for ride entity)
 * @param {Object} direction - The {x, y, z} vector
 */
function setVel(target, direction) {
    if (target.typeId === "minecraft:player") {
        // Players use Impulse (Additive physics)
        // This allows them to maintain momentum after the grapple breaks.
        target.applyImpulse(direction);
    } else {
        // Non-player entities use setVelocity (Overwrites physics)
        // Note: Some entities require the "minecraft:physics" component to react well.
        try {
            target.setVelocity(direction);
        } catch (e) {
            // Fallback for entities that don't support absolute velocity
            target.applyImpulse(direction);
        }
    }
}

function tryStartGrapple(player) {
    const hit = player.getBlockFromViewDirection({ maxDistance: MAX_GRAPPLE_DISTANCE });

    if (hit) {
        activeGrapples.set(player.id, { 
            anchor: hit.faceLocation,
            isPlayer: true
        });
        player.onScreenDisplay.setActionBar("§bHooked!");
    }
}

function stopGrapple(player) {
    activeGrapples.delete(player.id);
    player.onScreenDisplay.setActionBar("§7Released");
}

function grappleTick() {
    for (const [playerId, data] of activeGrapples) {
        const player = world.getEntity(playerId);

        if (!player || !player.isValid || player.isSneaking) {
            if (player) stopGrapple(player);
            else activeGrapples.delete(playerId);
            continue;
        }

        const anchor = data.anchor;
        const pos = player.location;

        const dx = anchor.x - pos.x;
        const dy = anchor.y - (pos.y + 1); 
        const dz = anchor.z - pos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 1.8) {
            stopGrapple(player);
            continue;
        }

        const dir = { x: dx / distance, y: dy / distance, z: dz / distance };

        // Physics Constants
        const pullStrength = 0.22; 
        const swingForce = 0.12;
        const look = player.getViewDirection();

        // Calculate the vector
        const finalVector = {
            x: (dir.x * pullStrength) + (look.x * swingForce),
            y: (dir.y * pullStrength) + (look.y * swingForce) + 0.07,
            z: (dir.z * pullStrength) + (look.z * swingForce)
        };

        // Use the universal function
        setVel(player, finalVector);
    }
}

system.runInterval(grappleTick, 1);