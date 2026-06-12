//modified from NoveltyAPI: https://www.curseforge.com/minecraft-bedrock/addons/novelty

import { curiosDeathRegistry } from "./CuriosAPI.js";
import { curiosEquipRegistry, curiosUnequipRegistry, system } from "./CuriosAPI.js";

// Map to track timers by "PlayerID:SlotIndex"
const holyTimers = new Map();

// Register your function
curiosDeathRegistry["MyCustomEffect"] = (player, slot, damageSource) => {
    console.warn(`${player.name} died while wearing a special item in slot ${slot}!`);
    // Do something cool, like strike lightning or give a message
    player.dimension.spawnEntity("minecraft:lightning_bolt", player.location);
};



curiosEquipRegistry["HolyVoice"] = (player, slot) => {
    const key = `${player.id}:${slot}`;
    
    // Clear any dangling timers for this slot
    if (holyTimers.has(key)) system.clearRun(holyTimers.get(key));

    // Start 5-second timer (100 ticks)
    const id = system.runTimeout(() => {
        if (player.isValid) {
            // Send message only to that player
            player.sendMessage(`§b[Holy Voice]§r Hey §e${player.nameTag}§r, test holy voice.`);
        }
        holyTimers.delete(key);
    }, 100);

    holyTimers.set(key, id);
    player.onScreenDisplay.setActionBar("§7Divine connection established...");
};

//Event: Holy Voice Unequip
curiosUnequipRegistry["HolyVoice"] = (player, slot) => {
    const key = `${player.id}:${slot}`;

    if (holyTimers.has(key)) {
        system.clearRun(holyTimers.get(key));
        holyTimers.delete(key);
        player.sendMessage("§c[Holy Voice]§7 Connection lost.");
    }
};