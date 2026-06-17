import { world, system, EquipmentSlot } from "@minecraft/server";
import { curiosDeathRegistry, curiosEquipRegistry, curiosUnequipRegistry } from "./CuriosAPI.js";
import { Relics } from "./CuriosDatabase.js"; // Note: Adjust name if yours is CuriosDatabase.js

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

// Right-click logic
world.afterEvents.itemUse.subscribe((e) => {
    const relic = Relics.find(r => r.identifier === e.itemStack.typeId);
    if (relic) relic.onUse(e.source, e.itemStack);
});




//Please remove this part if you don't want to use the Evolve System. 
//It is not required for the Curios system to work, but it is required for the Evolve relics to work.

//--------------- Evolve System ---------------//
import { CuriosEventEvolve } from "../Ults/CuriosEventEvolve.js";

// Evolution Tick Logic
system.runInterval(() => {
    const tick = system.currentTick;
    
    for (const player of world.getAllPlayers()) {
        const pid = player.id;
        
        // 1. CURIOS PASSIVE TICK (Items in Curio Slots)
        for (const relic of Relics) {
            if (activeRegistry.get(relic.eventKey)?.has(pid)) {
                relic.onTick(player);
            }
        }

        // 2. EVOLUTION QUEST TICK (Items in Hands)
        // Optimization: We check quests every 20 ticks (1 second) instead of every tick
        if (tick % 20 === 0) {
            const equipComp = player.getComponent("minecraft:equippable");
            const offhand = equipComp.getEquipmentSlot(EquipmentSlot.Offhand);
            const mainhand = equipComp.getEquipmentSlot(EquipmentSlot.Mainhand);

            if (offhand.hasItem()) {
                const relic = Relics.find(r => r.identifier === offhand.typeId);
                // Check if this relic is an instance of the Evolution class
                if (relic instanceof CuriosEventEvolve) {
                    relic.onEvolveTick(player, offhand, mainhand);
                }
            }
        }
    }
}, 1);

// Evolution Death Logic (Required for Hero Badge -> Fallen quest)
world.afterEvents.entityDie.subscribe((ev) => {
    const player = ev.deadEntity;
    const offhand = player.getComponent("minecraft:equippable")?.getEquipmentSlot(EquipmentSlot.Offhand);
    
    if (offhand?.hasItem()) {
        const relic = Relics.find(r => r.identifier === offhand.typeId);
        if (relic instanceof CuriosEventEvolve) {
            relic.onEvolveDeath(player, ev.damageSource, offhand);
        }
    }
}, { entityTypes: ["minecraft:player"] });

//---------------------------------------------//







initRelicEngine();