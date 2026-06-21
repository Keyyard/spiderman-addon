import { world } from "@minecraft/server";

// LightCondition "Enum"
export const LightCondition = {
    Greater: "GREATER",
    Equal: "EQUAL",
    Less: "LESS"
};

/**
 * Checks the light level at the player's location against a threshold and condition.
 */
export function CheckLightEvent(player, condition, threshold) {
    if (!player || !player.isValid) return false;

    // Get the block at the player's location (feet level)
    const block = player.dimension.getBlock(player.location);
    if (!block) return false;

    /**
     * FIX: In the reference code (Line 307 & 321), light is accessed via methods.
     * .getLightLevel() returns the total light (Block + Sky).
     * .getSkyLightLevel() returns only light from the sun/moon.
     */
    const currentLight = block.getLightLevel(); 

    // DEBUG: This will now show a number (0-15)
    // player.sendMessage("Block Light Level: " + currentLight);

    switch (condition) {
        case LightCondition.Greater:
            return currentLight > threshold;
        case LightCondition.Equal:
            return currentLight === threshold;
        case LightCondition.Less:
            return currentLight < threshold;
        default:
            return false;
    }
}