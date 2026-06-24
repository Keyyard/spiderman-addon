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
// This registers all items from your list using the RegisterLore function.
RegisterLore("curio:copper_rocket_wand", "§7Right-click to perform a §e Dash/Boosts §bElytra§7.\\n§6⚙ Auto-repairs with Copper Nuggets each 2 seconds");
RegisterLore("curio:enderbelt", "§7A forgotten belt that contain enderman secret technique§7.\\n§6 Sneak while use ender pearl will instantly teleport player 25 blocks straight");
RegisterLore("curio:evolve_badget_1", "§7I wonder what the hidden behind this§7.");
RegisterLore("curio:evolve_badget_2", "§7A relic that contain Relic Power, I wonder what Relics actually for §7.");
RegisterLore("curio:evolve_badget_3", "§7A new hero ascended, strike down the worst Catastrophe§7.\\n§6+ Immune to fall damage");
RegisterLore("curio:evolve_badget_4", "§7Through glory and ashes, A Divine path shall revealed§7.\\n§6Ahero fallen, cursed by evil");
RegisterLore("curio:made_in_heaven", "§7Peace for humanity§7.");
RegisterLore("curio:invisicloak", "§7Batman prototype item§7.\\n§6Invisible while in the dark");
RegisterLore("curio:killer_queen", "§7To keep an ordinary life, we need to delete the problem in silent§7.\\n§6Every projectile now turn to a silent bomb, destroy items or blocks");
RegisterLore("curio:killer_queen_btd", "§7Killer Queen third bomb§7.\\n§6Ignore the Death and wake up at comfy home\\n§6Sneak + Right Click to place the time anchor");
RegisterLore("curio:ragewatch", "§7We dont have that much time, dont block my way§7.\\n§6Player when get hitted will gain Strength effect for 5 secs, stackable");
RegisterLore("curio:reverse_watch", "§7A watch that contain space and time ? too OP §7.\\n§6 Keep on hotbar, Right Click to Reverse the time");
RegisterLore("curio:spider_bracelet", "§7Spooder man§7.\\n§6Right click to swing\\n§6Hold it in curios inventory to get Spider Power !!!!");
RegisterLore("curio:torchplacer", "§7Scare of the dark ? dont worry, Torch placer 3000 is here§7.\\n§6⚙ have torch on ur hotbar and bye bye darkness");