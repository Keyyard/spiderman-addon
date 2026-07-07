import { system, world, EquipmentSlot } from "@minecraft/server";

const mainHandCache = new Map();

// --- ANIMATION DEFINITIONS ---
const anims = {
    equipBracelet: "animation.player.FPS.equipBracelet",
    Test: "animation.default_player.patted_1",
};

// --- SCRIPT EVENT LISTENER ---
system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id } = event;
    if (id === 'script:Test') {
        console.warn("Ulala, a custom event"); 
    }
}, { namespaces: ["script"] });

// --- MAIN TICK LOOP ---
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) continue;

        const currentMainHand = equippable.getEquipment(EquipmentSlot.Mainhand);
        const currentTypeId = currentMainHand ? currentMainHand.typeId : "minecraft:air";
        const previousTypeId = mainHandCache.get(player.id) || "minecraft:air";

        if (currentTypeId !== previousTypeId) {
            mainHandCache.set(player.id, currentTypeId);
            onMainHandSwapped(player, currentTypeId);
        }
    }
}, 1);

// --- CLEANUP ---
world.afterEvents.playerLeave.subscribe((eventData) => {
    mainHandCache.delete(eventData.playerId);
});

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string} newMainHand
 */
function onMainHandSwapped(player, newMainHand) {
    switch (newMainHand) {
        case "curio:spider_bracelet":
            // --- NATIVE playAnimation METHOD ---
            player.playAnimation(anims.equipBracelet, {
                blendOutTime: 1.0,
                nextState: "default"
                //stopExpression: "!query.is_first_person" 
            });
            
            // Other logic
            player.runCommand(`scriptevent script:Test`);
            break;

        default:
            break;
    }
}