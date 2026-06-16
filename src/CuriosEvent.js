import { world, system } from "@minecraft/server";
import { curiosDeathRegistry, CheckItemValid, curiosEquipRegistry, curiosUnequipRegistry } from "./CuriosAPI.js";

// Explicitly use .js extension to fix build errors
import { CheckLightEvent, LightCondition } from "./LightInteract.js";

// ─── SPIDER BRACELET ───────────────────────────────────────────────────────
//#region
const activeSpiders = new Set();

curiosEquipRegistry["spider_logic"] = (player, slotIndex, isInitialLoad) => {
    if (isInitialLoad === false) {
        player.sendMessage("§bSpider Bracelet Equipped!");
    }
    activeSpiders.add(player.id);
};

curiosUnequipRegistry["spider_logic"] = (player, slotIndex) => {
    player.sendMessage("§cI rejected to be the spider, back to hooman.");
    activeSpiders.delete(player.id);
    if (player.isValid) player.removeEffect("jump_boost");
};

system.runInterval(() => {
    for (const playerId of activeSpiders) {
        const player = world.getEntity(playerId);
        if (!player || !player.isValid) { activeSpiders.delete(playerId); continue; }
        player.addEffect("jump_boost", 100, { amplifier: 1, showParticles: true });
    }
}, 2);
//#endregion

// ─── HOLY VOICE ────────────────────────────────────────────────────────────
//#region
const holyTimers = new Map();

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
//#endregion 

// ─── INVISICLOAK ──────────────────────────────────────────────────────────
//#region
const activeCloaks = new Set();
const CLOAK_LIGHT_THRESHOLD = 3;

curiosEquipRegistry["invis_logic"] = (player, slotIndex, isInitialLoad) => {
    if (isInitialLoad === false) player.sendMessage("§8Invisicloak Equipped!");
    activeCloaks.add(player.id);
};

curiosUnequipRegistry["invis_logic"] = (player, slotIndex) => {
    player.sendMessage("§7Invisicloak Removed.");
    activeCloaks.delete(player.id);
    if (player.isValid) player.removeEffect("invisibility");
};

// Independent loop for Cloak logic (Light Sensing)
system.runInterval(() => {
    for (const playerId of activeCloaks) {
        const player = world.getEntity(playerId);
        if (!player || !player.isValid) { activeCloaks.delete(playerId); continue; }

        // Checks light level at the player's feet
        const isDimEnough = CheckLightEvent(player, LightCondition.Less, CLOAK_LIGHT_THRESHOLD);

        if (isDimEnough) {
            player.addEffect("invisibility", 40, { amplifier: 1, showParticles: false });
            player.onScreenDisplay.setActionBar("§8● Shadow Stealth Active");
        } else {
            player.removeEffect("invisibility");
            player.onScreenDisplay.setActionBar("§e○ Revealed by Light!");
        }
    }
}, 2);
//#endregion

// ─── DEATH LOGIC TEST ─────────────────────────────────────────────────────
//#region
curiosDeathRegistry["MyCustomEffect"] = (player, slot, damageSource) => {
    console.warn(`${player.name} died while wearing a special item in slot ${slot}!`);
    player.dimension.spawnEntity("minecraft:lightning_bolt", player.location);
};
//#endregion