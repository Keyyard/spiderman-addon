// LoreMapDB.js

/** @type {Map<string, string[]>} */
const _loreDatabase = new Map();

/**
 * Registers a specific item's lore.
 * @param {string} itemTypeId - The ID (e.g., 'curio:spider_bracelet')
 * @param {string} lore - The full description string (supports \n for new lines)
 */
export function RegisterLore(itemTypeId, lore) {
    // Split the string by the literal '\n' found in lang files 
    // into an array of strings for Minecraft Tooltips
    const formattedLines = lore.split('\\n');
    _loreDatabase.set(itemTypeId, formattedLines);
}

/**
 * Gets the lore array for an item.
 * @param {string} itemTypeId 
 * @returns {string[] | undefined}
 */
export function GetLoreById(itemTypeId) {
    return _loreDatabase.get(itemTypeId);
}

// --- INITIALIZATION CALLS ---

// Copper Rocket Wand
RegisterLore("curio:copper_rocket_wand", "§7§eRight-click§7 to perform a §eDash/Boosts Elytra§7.\\n§a⚙ Auto-repairs§7 with §6Copper Nuggets§7 each 2 seconds");

// Enderbelt
RegisterLore("curio:enderbelt", "§7A forgotten belt that contain §l§fenderman secret technique§7.\\n§eSneak§7 while use §6ender pearl§7 will §ainstantly teleport§7 player 25 blocks");

// Evolve Badgets
RegisterLore("curio:evolve_badget_1", "§7I wonder what is §l§fhidden§7 behind this...");
RegisterLore("curio:evolve_badget_2", "§7A relic that contain §l§fRelic Power§7, I wonder what Relics are for.");
RegisterLore("curio:evolve_badget_3", "§7A new hero ascended, strike down the §l§fworst Catastrophe§7.\\n§a+ Immune to fall damage");
RegisterLore("curio:evolve_badget_4", "§7Through §l§fglory and ashes§7, A Divine path shall be revealed...\\n§c§lA hero fallen, cursed by evil");

// Made in Heaven
RegisterLore("curio:made_in_heaven", "§7Peace for §l§fhumanity§7.");

// Invisicloak
RegisterLore("curio:invisicloak", "§7Batman prototype item.\\n§aInvisible§7 while in the dark");

// Killer Queen Items
RegisterLore("curio:killer_queen", "§7To keep an §l§fordinary life§7, we need to §l§fdelete the problem§7 in silent.\\n§aEvery projectile§7 now turns to a §asilent bomb§7, §adestroying items or blocks");
RegisterLore("curio:killer_queen_btd", "§7Return by §l§fDeath§7, back to ordinary life.\\n§eSneak + Right Click§7 to §aplace time anchor");

// Watches
RegisterLore("curio:ragewatch", "§7We don't have that much time, §l§fdont block my way§7.\\n§7When hit, §again Strength effect§7 for 5 secs (Stackable)");
RegisterLore("curio:reverse_watch", "§7A watch that contains §l§fspace and time§7? Too OP.\\n§7Keep on hotbar, §eRight Click§7 to §aReverse the time");

// Spider Bracelet
RegisterLore("curio:spider_bracelet", "§7§l§fSpooder man§7.\\n§eRight click§7 to §aswing§7.\\n§7Hold in curios inventory to §aget Spider Power !!!!");

// Torch Placer
RegisterLore("curio:torchplacer", "§7Scared of the dark? Don't worry, Torch Placer 3000 is here.\\n§a⚙ Fuel§7 with §6torches§7 on hotbar and §abye bye darkness");