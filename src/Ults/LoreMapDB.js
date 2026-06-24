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
RegisterLore("curio:copper_rocket_wand", "§7§e§lRight-click§r §7to perform a dash or boost §b§lElytra§r§7.\\n§a+ §lAuto-repairs§r §7using §6§lCopper Nuggets§r §7every §e§l2 seconds§r");

// Enderbelt
RegisterLore("curio:enderbelt", "§7A forgotten belt containing enderman techniques.\\n§a+ §e§lSneak§r §7while using §d§lender pearls§r §7to §linstantly teleport§r");

// Evolve Badgets (Hero Badges)
RegisterLore("curio:evolve_badget_1", "§7I wonder what is §l§fhidden§r §7behind this...");
RegisterLore("curio:evolve_badget_2", "§7A relic containing §l§fRelic Power§r§7. I wonder what the §l§fPower§r §7for.");
RegisterLore("curio:evolve_badget_3", "§7A new §l§fhero§r §7ascended to strike down the worst §c§lcatastrophe§r§7.\\n§a+ §lImmune to fall damage§r");
RegisterLore("curio:evolve_badget_4", "§7Through glory and ashes, a divine path shall be revealed...\\n§c+ §lA hero fallen§r§c, cursed by §c§lwithered§r");

// Made in Heaven
RegisterLore("curio:made_in_heaven", "§l§fPeace for humanity.§r");

// Invisicloak
RegisterLore("curio:invisicloak", "§7Batman prototype item.\\n§a+ §lInvisible§r §7while §a§lin the dark§r");

// Killer Queen Items
RegisterLore("curio:killer_queen", "§7To keep an §l§fordinary life§r§7, we must §l§fdelete the problem§r §7in silence.\\n§a+ §b§lProjectiles§r §7turn to §b§lsilent bombs§r§7 that §l§fwon't§r§7 destroy items or blocks");
RegisterLore("curio:killer_queen_btd", "§c§lReturn by death§r §7and wake up at a comfy home.\\n§a+ §e§lSneak + Right Click§r §7to §lplace a §l§ftime anchor§r");

// Watches
RegisterLore("curio:ragewatch", "§7We don't have that much time, don't block my way.\\n§a+ §lGain Strength§r §7for §e§l5s§r §7when hit (stackable)");
RegisterLore("curio:reverse_watch", "§7A watch that can §l§ftwist§r §6§lSpace§r §7and §5§lTime§r§7?.\\n§a+ §e§lRight Click§r §7to §lReverse the time§r §e§l(max 5s)§r");

// Spider Bracelet
RegisterLore("curio:spider_bracelet", "§7Spooder man.\\n§a+ §e§lRight click + Look Direction§r §7to §lswing§r.\\n§a+ §lGet Spider Power§r §7while in §6§lCurios inventory§r §7!!!!");

// Torch Placer
RegisterLore("curio:torchplacer", "§7Scared of the dark? The §e§lTorch Placer 3000§r §7is here.\\n§a+ §7Fuel with §6§ltorches§r §7on §l§fhotbar§r §7to §lbye bye §5§ldarkness§r");