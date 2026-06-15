import { world, system } from "@minecraft/server";
import { curiosDeathRegistry, CheckItemValid } from "./CuriosAPI.js";
import { curiosEquipRegistry, curiosUnequipRegistry } from "./CuriosAPI.js";

// --- SPIDER BRACELET LOGIC ---
const activeSpiders = new Set();

curiosEquipRegistry["spider_logic"] = (player, slotIndex, isInitialLoad) => {
    
    // Only send message if the player manually put it in (not on join)
    if (isInitialLoad === false) {
        player.sendMessage("§bSpider Bracelet Equipped!");
    }
    
    // Always add to the set so the effect loop works
    activeSpiders.add(player.id);
};

curiosUnequipRegistry["spider_logic"] = (player, slotIndex) => {
    player.sendMessage("§cI rejected to be the spider, back to hooman.");
    activeSpiders.delete(player.id);
    if (player.isValid) player.removeEffect("jump_boost");
};

// This uses "system" and "world", so it NEEDS the import at the top
system.runInterval(() => {
    for (const playerId of activeSpiders) {
        const player = world.getEntity(playerId);
        if (!player || !player.isValid) {
            activeSpiders.delete(playerId);
            continue;
        }
        player.addEffect("jump_boost", 100, { 
            amplifier: 1, 
            showParticles: true 
        });
    }
}, 2);


// --- HOLY VOICE LOGIC ---
const holyTimers = new Map();

// Do the same for Holy Voice if you want to hide its message too
curiosEquipRegistry["HolyVoice"] = (player, slot, isInitialLoad) => {
    const key = `${player.id}:${slot}`;
    if (holyTimers.has(key)) system.clearRun(holyTimers.get(key));

    const id = system.runTimeout(() => {
        if (player.isValid) {
            player.sendMessage(`§b[Holy Voice]§r Hey §e${player.nameTag}§r, test holy voice.`);
        }
        holyTimers.delete(key);
    }, 100);

    holyTimers.set(key, id);

    if (isInitialLoad === false) {
        player.onScreenDisplay.setActionBar("§7Divine connection established...");
    }
};

curiosUnequipRegistry["HolyVoice"] = (player, slot) => {
    const key = `${player.id}:${slot}`;
    if (holyTimers.has(key)) {
        system.clearRun(holyTimers.get(key));
        holyTimers.delete(key);
        player.sendMessage("§c[Holy Voice]§7 Connection lost.");
    }
};

// --- DEATH LOGIC ---
curiosDeathRegistry["MyCustomEffect"] = (player, slot, damageSource) => {
    console.warn(`${player.name} died while wearing a special item in slot ${slot}!`);
    player.dimension.spawnEntity("minecraft:lightning_bolt", player.location);
};