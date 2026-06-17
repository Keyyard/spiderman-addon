import { world, system } from "@minecraft/server";
import { curiosDeathRegistry, curiosEquipRegistry, curiosUnequipRegistry } from "./CuriosAPI.js";
import { Relics } from "./CuriosDatabase.js";

const activeRegistry = new Map();

export function initRelicEngine() {
    for (const relic of Relics) {
        activeRegistry.set(relic.eventKey, new Set());

        curiosEquipRegistry[relic.eventKey] = (player, slot, isInitial) => {
            activeRegistry.get(relic.eventKey).add(player.id);
            relic.onEquip(player, slot, isInitial);
        };

        curiosUnequipRegistry[relic.eventKey] = (player, slot) => {
            activeRegistry.get(relic.eventKey).delete(player.id);
            relic.onUnequip(player, slot);
        };

        curiosDeathRegistry[relic.eventKey] = (player, slot, source) => {
            relic.onDeath(player, slot, source);
        };
    }
}

system.runInterval(() => {
    for (const relic of Relics) {
        const playerIds = activeRegistry.get(relic.eventKey);
        if (!playerIds) continue;
        for (const pid of playerIds) {
            const player = world.getEntity(pid);
            if (!player || !player.isValid) { playerIds.delete(pid); continue; }
            relic.onTick(player);
        }
    }
}, 1); // Run at 1 tick for smooth grappling physics

world.afterEvents.itemUse.subscribe((e) => {
    const relic = Relics.find(r => r.identifier === e.itemStack.typeId);
    if (relic) relic.onUse(e.source, e.itemStack);
});

initRelicEngine();