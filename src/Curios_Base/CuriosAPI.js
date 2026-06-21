//modified from NoveltyAPI: https://www.curseforge.com/minecraft-bedrock/addons/novelty

import { world, system, EquipmentSlot, ItemStack, ItemTypes } from "@minecraft/server";
import { Vector } from "../Vector3";

export const ACCESORIES_SLOT_INT = [
    "Face", "Hat", "Necklace", "Bracelet", "Back", "Bracelet", "Hand", "Belt",
    "Hand", "Foot", "Foot", "Spellbook", "Trinket", "Trinket", "Trinket", "Trinket",
    "Trinket", "Trinket", "Trinket", "Trinket", "Trinket", "Trinket", "Charm", "Charm"
];

export const ALL_SLOT_LIST = [
    "Face", "Hat", "Necklace", "Bracelet", "Back", "Hand", "Belt", "Foot", "Spellbook", "Trinket", "Charm"
];

export const ACCESSORIES_LENGTH = 24;

export const AccesoriesSlotInt = {
    Hat: [1],
    Belt: [7],
    Face: [0],
    Hand: [6, 8],
    Bracelet: [3, 5],
    Trinket: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    Back: [4],
    Necklace: [2],
    Foot: [9, 10],
    Spellbook: [11],
    Charm: [22, 23]
};

export const TagToRegister = {
    "curios:is_hat": "Hat",
    "curios:is_belt": "Belt",
    "curios:is_face": "Face",
    "curios:is_hand": "Hand",
    "curios:is_bracelet": "Bracelet",
    "curios:is_trinket": "Trinket",
    "curios:is_back": "Back",
    "curios:is_necklace": "Necklace",
    "curios:is_neckless": "Necklace",
    "curios:is_foot": "Foot",
    "curios:is_spellbook": "Spellbook",
    "curios:is_charm": "Charm",
    "curios:is_special": "Special",

    "curios:EventEquip": "EventEquip",
    "curios:EventUnequip": "EventUnequip",
    "curios:EventDeath": "EventDeath",
    "curios:ForceSoulbind": "ForceSoulbind"
};

// Map to store function callbacks from other scripts
// bind those event at the update/event 
export const curiosDeathRegistry = {}; 
export const curiosEquipRegistry = {}; 
export const curiosUnequipRegistry = {}; 

export let player_curios_equip_events = {};
export let player_curios_unequip_events = {};
export let player_curios_death_events = {};

export let item_category = {};

export let curios_database = {
    register: {
        Hat: ["minecraft:air"],
        Belt: ["minecraft:air"],
        Face: ["minecraft:air"],
        Hand: ["minecraft:air"],
        Bracelet: ["minecraft:air"],
        Trinket: ["minecraft:air"],
        Back: ["minecraft:air"],
        Necklace: ["minecraft:air"],
        Foot: ["minecraft:air"],
        Spellbook: ["minecraft:air"],
        Charm: ["minecraft:air"]
    },
    maxItemSlot: {}
};

export let playerList = [];

export function registerItem(identifier, slot) {
    if (!curios_database.register[slot]) return;
    if (!curios_database.register[slot].includes(identifier)) {
        curios_database.register[slot].push(identifier);
    }
    if (item_category[identifier] == undefined) {
        item_category[identifier] = [slot];
    } else if (!item_category[identifier].includes(slot)) {
        item_category[identifier].push(slot);
    }
}

export function registerItemFromTag(tag, slot) {
    if (!curios_database.register[slot]) return;
    ItemTypes.getAll().forEach(id => {
        let item = new ItemStack(id);
        if (item.getTags().includes(tag)) {
            registerItem(id.id, slot);
        }
    });
}

export function scanItemTags() {
    ItemTypes.getAll().forEach(id => {
        let item = new ItemStack(id);
        item.getTags().forEach(tag => {
            if (TagToRegister[tag] != undefined) {
                let key = TagToRegister[tag];
                curios_database.register[key].push(id.id);
                if (item_category[id.id] == undefined) {
                    item_category[id.id] = [key];
                } else {
                    item_category[id.id].push(key);
                }
            }
        });
    });
}

/** @type {import("@minecraft/server").StructureManager | null} */
export let structure_manager = null;

/** @type {import("@minecraft/server").Dimension[] | null} */
export let Dimensions = null;

/** @type {import("@minecraft/server").ItemStack | null} */
export let curiosItem = null;

/** @type {import("@minecraft/server").ItemStack | null} */
export let curiosItemLocked = null;

export let curios_container = {};
export let curios_is_used = {};
export let player_curios_data = {};
export let player_curios_is_keep_on_death = {};
export let player_curios_in_mainhand = {};

let player_index_select = {};
let player_list_id = [];
let player_curios_list_item_name = {};
let saved_tag_list_per_slot = {};
let compiled_data = {};
let cached_slot_max_tag_list = [];
let player_has_curios = {};
let player_has_curios_temp = {};
let player_has_curios_in_cursor = {};

export function updateAccessories(id, slot = -1) {
    const player = world.getEntity(id);
    if (!player) return;

    const location = { x: Math.round(player.location.x + Math.random() * 32 - 16), y: 0, z: Math.round(player.location.z + Math.random() * 32 - 16) };
    if (player.dimension.getBlock(location) == undefined) {
        system.runTimeout(() => { updateAccessories(id, slot); }, 1);
        return;
    }

    const item_list = player_curios_data[id] ?? [];
    const item_list_is_keep_on_death = player_curios_is_keep_on_death[id] ?? [];
    
    // Initialize Event Arrays
    if (!player_curios_death_events[id]) player_curios_death_events[id] = new Array(ACCESSORIES_LENGTH).fill(undefined);
    if (!player_curios_equip_events[id]) player_curios_equip_events[id] = new Array(ACCESSORIES_LENGTH).fill(undefined);
    if (!player_curios_unequip_events[id]) player_curios_unequip_events[id] = new Array(ACCESSORIES_LENGTH).fill(undefined);

    const range = slot == -1 ? Array.from({ length: ACCESSORIES_LENGTH }, (_, i) => i) : [slot];

    for (const i of range) {
        const structure = structure_manager.get("mystructure:nvy" + i + player.id);
        if (structure != undefined) {
            structure_manager.place(structure, player.dimension, location, { includeEntities: true, includeBlocks: false });
            const item_entity = player.dimension.getEntities({
                type: "minecraft:item",
                location: { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 },
                tags: ["nvy:item_buffer"]
            })[0];

            if (item_entity) {
                const item_temp = item_entity.getComponent("minecraft:item").itemStack;
                const tags = item_temp.getTags();

                // Soulbind
                if (tags.includes("curios:ForceSoulbind")) item_temp.keepOnDeath = true;

                // Scan Event Tags
                const deathTag = tags.find(t => t.startsWith("curios:EventDeath:"));
                const equipTag = tags.find(t => t.startsWith("curios:EventEquip:"));
                const unequipTag = tags.find(t => t.startsWith("curios:EventUnequip:"));

                player_curios_death_events[id][i] = deathTag ? deathTag.split(":")[2] : undefined;
                player_curios_equip_events[id][i] = equipTag ? equipTag.split(":")[2] : undefined;
                player_curios_unequip_events[id][i] = unequipTag ? unequipTag.split(":")[2] : undefined;

                item_list[i] = item_temp.typeId;
                item_list_is_keep_on_death[i] = item_temp.keepOnDeath;
                if (curios_container[id]) curios_container[id].setItem(Number(i), item_temp);
                item_entity.remove();
            }
        } else {
            item_list[i] = undefined;
            item_list_is_keep_on_death[i] = false;
            player_curios_death_events[id][i] = undefined;
            player_curios_equip_events[id][i] = undefined;
            player_curios_unequip_events[id][i] = undefined;
        }
    }
    player_curios_data[id] = item_list;
    player_curios_is_keep_on_death[id] = item_list_is_keep_on_death;
}

export function handleWorldLoad() {
    structure_manager = world.structureManager;
    Dimensions = [
        world.getDimension("minecraft:overworld"),
        world.getDimension("minecraft:nether"),
        world.getDimension("minecraft:the_end")
    ];
    curiosItem = new ItemStack("nvy:curios");
    curiosItem.keepOnDeath = true;
    curiosItem.lockMode = "inventory";
    curiosItemLocked = new ItemStack("nvy:curios");
    curiosItemLocked.keepOnDeath = true;
    curiosItemLocked.lockMode = "slot";

    scanItemTags();
    playerList = world.getAllPlayers();
    playerList.forEach(s => {
        const mainhand = s.getComponent("minecraft:equippable").getEquipmentSlot(EquipmentSlot.Mainhand);
        player_curios_in_mainhand[s.id] = mainhand.isValid && mainhand.hasItem() && mainhand.typeId == "nvy:curios";
        updateAccessories(s.id);
    });
}

export function handleLoadCuriosData(s) {
    if (compiled_data[s.id]) {
        compiled_data[s.id] += s.message;
    } else {
        compiled_data[s.id] = s.message;
    }
    try {
        let data = JSON.parse(compiled_data[s.id]);
        Object.keys(data.register).forEach(key => {
            if (data.register[key].length > 0) {
                curios_database.register[key] = curios_database.register[key].concat(data.register[key]);
                for (let item of data.register[key]) {
                    if (item_category[item] == undefined) {
                        item_category[item] = [key];
                    } else {
                        item_category[item].push(key);
                    }
                }
            }
        });
        Object.keys(data.maxItemSlot).forEach(key => {
            curios_database.maxItemSlot[key] = data.maxItemSlot[key];
            if (data.maxItemSlot[key].slot == undefined) {
                curios_database.maxItemSlot[key].slot = [...ALL_SLOT_LIST];
            }
        });
        delete compiled_data[s.id];
        cached_slot_max_tag_list = Object.keys(curios_database.maxItemSlot);
        console.log("[curiosDatabase] Successful add data to database");
    } catch (error) {
        console.log("[curiosDatabase] Compiling data...");
    }
}

export function handleCuriosEvent(s) {
    if (s.id === "curios:update") {
        system.run(() => updateAccessories(s.message));
    } else if (s.id === "curios:update_item") {
        let data = s.message.split(' ');
        system.run(() => updateAccessories(data[1], Number(data[0])));
    } else if (s.id === "curios:register") {
        let parts = s.message.split(' ');
        if (parts.length < 2) return;
        registerItem(parts[0], parts[1]);
    } else if (s.id === "curios:register_tag") {
        let parts = s.message.split(' ');
        if (parts.length < 2) return;
        registerItemFromTag(parts[0], parts[1]);
    }
}

export function handlePlayerInteract(s) {
    if (s.target.typeId != "nvy:curios_inventory") return;

    player_index_select[s.player.id] = s.player.selectedSlotIndex;
    curios_is_used[s.player.id] = s.target;

    const pid0 = s.player.id;
    if (!player_curios_list_item_name[pid0] || player_curios_list_item_name[pid0].length === 0) {
        player_curios_list_item_name[pid0] = player_curios_data[pid0]
            ? [...player_curios_data[pid0]]
            : new Array(ACCESSORIES_LENGTH).fill(undefined);
    }
    let dimension = s.player.dimension;
    let duration = 20;
    let run_id = system.runInterval(() => {
        if (duration <= 0) system.clearRun(run_id);
        curios_is_used[s.player.id] = s.target;
        duration--;
    });
    let inventory = s.target.getComponent("minecraft:inventory");
    let location = Vector.round(s.player.location);
    location.y = 0;
    let container = inventory.container;
    for (let i = 0; i < ACCESSORIES_LENGTH; i++) {
        let structure = structure_manager.get("mystructure:nvy" + i + s.player.id);
        if (structure == undefined) {
            container.setItem(i);
            continue;
        } else {
            structure_manager.place(structure, dimension, location, {
                includeEntities: true,
                includeBlocks: false
            });
            let item = dimension.getEntities({
                type: "minecraft:item",
                location: {
                    x: location.x + 0.5,
                    y: location.y + 0.5,
                    z: location.z + 0.5
                },
                tags: ["nvy:item_buffer"]
            })[0];
            if (item) {
                container.setItem(i, item.getComponent("minecraft:item").itemStack);
                item.remove();
            }
        }
    }
    s.player.getComponent("minecraft:equippable").setEquipment(EquipmentSlot.Mainhand, curiosItemLocked);
}

export function handleEntityDie(s) {
    const player = s.deadEntity;
    if (world.gameRules.keepInventory) return;

    let dimension = player.dimension;
    let location = player.location;
    let keep_on_death = player_curios_is_keep_on_death[player.id];
    let death_events = player_curios_death_events[player.id];

    for (let i = 0; i < ACCESSORIES_LENGTH; i++) {
        // 1. Check for EventDeath callbacks
        if (death_events && death_events[i]) {
            const funcName = death_events[i];
            if (curiosDeathRegistry[funcName]) {
                // Call the external function: pass player, slot index, and damage source
                try {
                    curiosDeathRegistry[funcName](player, i, s.damageSource);
                } catch (err) {
                    console.error(`[curiosAPI] Error in DeathEvent ${funcName}: ${err}`);
                }
            }
        }

        // 2. Handle Item Popping/Dropping
        // If keep_on_death is true (ForceSoulbind), we skip this block so it doesn't pop out
        if (keep_on_death && keep_on_death[i]) continue;

        let structure = structure_manager.get("mystructure:nvy" + i + player.id);
        if (structure != undefined) {
            try {
                structure_manager.place(structure, dimension, location, {
                    includeEntities: true,
                    includeBlocks: false
                });
            } catch (err) { }
            // Remove from structure so it's gone from inventory
            structure_manager.delete("mystructure:nvy" + i + player.id);
        }
    }
    
    // Refresh accessories to ensure soulbound items are still registered
    updateAccessories(player.id);
}

export function handlePlayerJoin(s) {
    let player = s.player;
    const playerId = player.id;
    updateAccessories(playerId);

    if (!player.getDynamicProperty("has_curios")) {
        player.setDynamicProperty("has_curios", true);
        let inventory = player.getComponent("minecraft:inventory").container;
        if (inventory.getItem(8) != undefined) {
            inventory.addItem(curiosItem);
        } else {
            inventory.setItem(8, curiosItem);
        }
    }

    let equipable = player.getComponent("minecraft:equippable");
    let mainhand = equipable.getEquipmentSlot(EquipmentSlot.Mainhand);
    if (mainhand.hasItem() && mainhand.typeId == "nvy:curios" && mainhand.lockMode == "slot") {
        equipable.setEquipment(EquipmentSlot.Mainhand, curiosItem);
    }
    player_curios_in_mainhand[player.id] = mainhand.isValid && mainhand.hasItem() && mainhand.typeId == "nvy:curios";

    playerList = world.getAllPlayers();

    // --- ADDED: Re-trigger Equip Events on Join ---
    // We wait 20 ticks (1 second) to ensure structures and player data are fully loaded
    system.runTimeout(() => {
        if (!player.isValid) return;
        const equipEvents = player_curios_equip_events[playerId];
        if (equipEvents) {
            equipEvents.forEach((funcName, index) => {
                if (funcName && curiosEquipRegistry[funcName]) {
                    try { 
                        // Pass true because this IS an initial load on join
                        curiosEquipRegistry[funcName](player, index, true); 
                    } catch (e) { }
                }
            });
        }
    }, 20);
}

export function handlePlayerLeave(s) {
    playerList = world.getAllPlayers();
}

export function tickCleanupEntities() {
    Dimensions.forEach(dimension => {
        dimension.getEntities({
            type: "nvy:curios_inventory"
        }).forEach(entity => {
            if (!player_list_id.includes(entity.getDynamicProperty("curios-source-id"))) entity.remove();
        });
    });
}

export function tickPlayerLoop() {
    player_list_id = [];

    for (const playerData of playerList) {
        const pid = playerData.id;
        const dimension = playerData.dimension;

        // --- SECTION 1: CURSOR ITEM PROTECTION ---
        let cursor = playerData.getComponent("minecraft:cursor_inventory");
        if (cursor.item == undefined || cursor.item.typeId != "nvy:curios") {
            player_has_curios_in_cursor[pid] = false;
        } else {
            player_has_curios_in_cursor[pid] = true;
            player_has_curios_temp[pid] = true;
        }

        if (player_curios_list_item_name[pid] == undefined) player_curios_list_item_name[pid] = [];

        // --- SECTION 2: INVENTORY MAINTENANCE ---
        try {
            let part = system.currentTick % 6; 
            let inventory = playerData.getComponent("minecraft:inventory").container;
            let insert_curios = false;

            if (inventory.emptySlotsCount == 36) {
                if (!player_has_curios_in_cursor[pid]) {
                    inventory.addItem(curiosItem);
                    insert_curios = true;
                }
            } else {
                if (part == 0 && player_has_curios[pid] != undefined && player_has_curios[pid] === false && inventory.emptySlotsCount > 0 && !player_has_curios_in_cursor[pid]) {
                    inventory.addItem(curiosItem);
                    insert_curios = true;
                }
            }

            if (part == 0) {
                player_has_curios[pid] = insert_curios ? true : player_has_curios_temp[pid];
                player_has_curios_temp[pid] = false;
            }

            // --- SECTION 3: DYNAMIC LORE ---
            for (let i = 0; i < 6; i++) {
                let item = inventory.getSlot(i + part * 6);
                if (item.hasItem() && item != undefined && item_category[item.typeId] != undefined) {
                    let lores = item.getLore();
                    if (!lores.some(l => l.startsWith("§r§6Slot:§e "))) {
                        let slot_name = "§r§6Slot:§e " + item_category[item.typeId].join(" ");
                        lores.unshift(slot_name);
                        item.setLore(lores);
                    }
                }
                if (item.hasItem() && item.typeId == "nvy:curios") {
                    if (player_has_curios_temp[pid]) { inventory.setItem(i + part * 6); } 
                    else { player_has_curios_temp[pid] = true; }
                }
            }
        } catch (error) { }

        player_list_id.push(pid);

        // --- SECTION 4: MENU ENTITY ---
        const force_remove = !player_curios_in_mainhand[pid];
        if (player_curios_in_mainhand[pid]) {
            const curios_id = playerData.getDynamicProperty("curios-id");
            if (curios_id == undefined) {
                const entity = dimension.spawnEntity("nvy:curios_inventory", playerData.getHeadLocation());
                entity.nameTag = "Curios Inventory";
                entity.getComponent("minecraft:tameable").tame(playerData);
                entity.setDynamicProperty("curios-source-id", pid);
                playerData.setDynamicProperty("curios-id", entity.id);
            } else {
                const entity = world.getEntity(curios_id);
                if (entity) {
                    entity.teleport(Vector.add(playerData.getHeadLocation(), Vector.multiply(playerData.getViewDirection(), 0.5)));
                } else {
                    playerData.setDynamicProperty("curios-id");
                }
            }
        }

        // --- SECTION 5 & 6: CONTAINER INTERACTION & REWRITTEN LOGIC ---
        if (curios_is_used[pid] != undefined) {
            const used_entity = curios_is_used[pid];
            const used_entity_valid = used_entity.isValid;
            curios_container[pid] = used_entity_valid ? used_entity.getComponent("minecraft:inventory")?.container : undefined;
            
            if (!used_entity_valid || !used_entity.getProperty("nvy:open_inv") || force_remove) {
                if (used_entity_valid && (!used_entity.getProperty("nvy:open_inv") || force_remove)) {
                    const container = used_entity.getComponent("minecraft:inventory").container;
                    for (let i = 0; i < ACCESSORIES_LENGTH; i++) {
                        const item = container.getItem(i);
                        player_curios_data[pid][i] = item?.typeId;
                        player_curios_is_keep_on_death[pid][i] = item?.keepOnDeath ?? false;
                    }
                    used_entity.runCommand("scriptevent curios:update " + pid);
                    playerData.getComponent("minecraft:inventory").container.setItem(player_index_select[pid], curiosItem);
                }
                curios_is_used[pid] = undefined;
                curios_container[pid] = undefined;
                delete saved_tag_list_per_slot[pid];
            } else {
                // --- THE REWRITTEN LOOP ---
                const location = Vector.round(playerData.location);
                location.y = 0;
                let inventory = used_entity.getComponent("minecraft:inventory");
                let container = inventory.container;

                let tag_list_per_slot = { "Face": {}, "Hat": {}, "Necklace": {}, "Bracelet": {}, "Back": {}, "Hand": {}, "Belt": {}, "Foot": {}, "Spellbook": {}, "Trinket": {}, "Charm": {} };
                if (saved_tag_list_per_slot[pid] == undefined) saved_tag_list_per_slot[pid] = { ...tag_list_per_slot };

                for (let i = 0; i < ACCESSORIES_LENGTH; i++) {
                    let item = container.getItem(i);
                    const oldItemId = player_curios_list_item_name[pid][i];
                    let isItemValid = true;

                    // 1. VALIDATION: CATEGORY CHECK
                    if (item != undefined && !curios_database.register[ACCESORIES_SLOT_INT[i]].includes(item.typeId)) {
                        let swaped = false;
                        const categories = item_category[item.typeId];
                        if (categories != undefined) {
                            for (const category of categories) {
                                for (const slot of AccesoriesSlotInt[category]) {
                                    if (container.getItem(slot) == undefined) {
                                        container.swapItems(i, slot, container);
                                        swaped = true;
                                        break;
                                    }
                                }
                                if (swaped) break;
                            }
                        }
                        if (!swaped) { dimension.spawnItem(item, playerData.location); }
                        container.setItem(i); // Clear the wrong slot
                        item = undefined;     // Prevent events from firing
                        isItemValid = false;
                    }

                    // 2. VALIDATION: MAX ITEM LIMIT
                    if (item != undefined && oldItemId !== item.typeId) {
                        let tags = item.getTags();
                        for (const tag_selected of cached_slot_max_tag_list) {
                            if (tags.includes(tag_selected)) {
                                const tagData = curios_database.maxItemSlot[tag_selected];
                                let total_tag = 0;
                                tagData.slot.forEach(slot => {
                                    if (saved_tag_list_per_slot[pid][slot][tag_selected] != undefined) {
                                        total_tag += saved_tag_list_per_slot[pid][slot][tag_selected];
                                    }
                                });
                                if (total_tag >= tagData.amount) {
                                    container.setItem(i);
                                    dimension.spawnItem(item, playerData.location);
                                    item = undefined;
                                    isItemValid = false;
                                    break;
                                }
                            }
                        }
                    }

                    // 3. EVENTS AND PERSISTENCE (Only if changed and valid)
                    if (isItemValid && item?.typeId !== oldItemId) {
                        
                        // UNEQUIP OLD
                        const unequipFuncName = player_curios_unequip_events[pid]?.[i];
                        if (unequipFuncName && curiosUnequipRegistry[unequipFuncName]) {
                            try { curiosUnequipRegistry[unequipFuncName](playerData, i); } catch (e) { }
                        }

                        // EQUIP NEW
                        if (item != undefined) {
                            const tags = item.getTags();
                            const equipTag = tags.find(t => t.startsWith("curios:EventEquip:"));
                            const unequipTag = tags.find(t => t.startsWith("curios:EventUnequip:"));
                            const deathTag = tags.find(t => t.startsWith("curios:EventDeath:"));

                            if (!player_curios_equip_events[pid]) player_curios_equip_events[pid] = [];
                            if (!player_curios_unequip_events[pid]) player_curios_unequip_events[pid] = [];
                            if (!player_curios_death_events[pid]) player_curios_death_events[pid] = [];

                            const newEquipFunc = equipTag ? equipTag.split(":")[2] : undefined;
                            player_curios_equip_events[pid][i] = newEquipFunc;
                            player_curios_unequip_events[pid][i] = unequipTag ? unequipTag.split(":")[2] : undefined;
                            player_curios_death_events[pid][i] = deathTag ? deathTag.split(":")[2] : undefined;

                            if (newEquipFunc && curiosEquipRegistry[newEquipFunc]) 
                            {
                                try { 
                                    // Pass false because this is a manual equip, not a join load
                                    curiosEquipRegistry[newEquipFunc](playerData, i, false); 
                                } catch (e) { }
                            }
                        } else {
                            if (player_curios_equip_events[pid]) player_curios_equip_events[pid][i] = undefined;
                            if (player_curios_unequip_events[pid]) player_curios_unequip_events[pid][i] = undefined;
                            if (player_curios_death_events[pid]) player_curios_death_events[pid][i] = undefined;
                        }

                        // PERSISTENCE
                        structure_manager.delete("mystructure:nvy" + i + pid);
                        if (item != undefined) {
                            let item_entity = dimension.spawnItem(item, { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 });
                            item_entity.addTag("nvy:item_buffer");
                            structure_manager.createFromWorld("mystructure:nvy" + i + pid, dimension, location, Vector.add(location, { x: 1, y: 1, z: 1 }), { includeEntities: true, includeBlocks: false });
                            item_entity.remove();

                            let tags = item.getTags();
                            tags.forEach(tag => {
                                if (tag_list_per_slot[ACCESORIES_SLOT_INT[i]][tag] == undefined) {
                                    tag_list_per_slot[ACCESORIES_SLOT_INT[i]][tag] = 1;
                                } else {
                                    tag_list_per_slot[ACCESORIES_SLOT_INT[i]][tag] += 1;
                                }
                            });
                        }
                        player_curios_list_item_name[pid][i] = item?.typeId;

                    } else if (item != undefined) {
                        // MAINTAIN EXISTING TAG DATA
                        const savedSlot = saved_tag_list_per_slot[pid][ACCESORIES_SLOT_INT[i]];
                        if (savedSlot) {
                            Object.keys(savedSlot).forEach(tag => {
                                if (tag_list_per_slot[ACCESORIES_SLOT_INT[i]][tag] == undefined) {
                                    tag_list_per_slot[ACCESORIES_SLOT_INT[i]][tag] = savedSlot[tag];
                                } else {
                                    tag_list_per_slot[ACCESORIES_SLOT_INT[i]][tag] += savedSlot[tag];
                                }
                            });
                        }
                    }
                }
                saved_tag_list_per_slot[pid] = tag_list_per_slot;
            }
        }
    }
}

export function tickSyncPlayerTags() {
    for (const playerData of playerList) {
        const pid = playerData.id;
        const data = player_curios_data[pid];
        const register_id = [];
        playerData.getTags().forEach(tag => {
            if (tag.startsWith("curios:")) {
                const item_name = tag.substr(8);
                if (!data.includes(item_name) || item_name == "undefined") {
                    playerData.removeTag(tag);
                } else {
                    register_id.push(item_name);
                }
            }
        });
        data.forEach(item => {
            if (!register_id.includes(item) && item != undefined) {
                playerData.addTag("curios:" + item);
            }
        });
    }
}

/**
 * Checks if a player has a specific item equipped in a specific Curio slot category.
 * @param {Player} player The player to check
 * @param {string} slotType The category (e.g., "Bracelet", "Trinket") or Tag (e.g., "curios:is_bracelet")
 * @param {string} itemID The item identifier (e.g., "nvy:spider_bracelet")
 * @returns {boolean}
 */
export function CheckItemValid(player, slotType, itemID) {
    const pid = player.id;
    const data = player_curios_data[pid];
    if (!data) return false;

    // Convert tag (curios:is_bracelet) to internal name (Bracelet) if necessary
    let category = TagToRegister[slotType] ?? slotType;

    const indices = AccesoriesSlotInt[category];
    if (!indices) return false;

    // Check all valid slots for this category (e.g., slots 3 and 5 for Bracelet)
    for (const index of indices) {
        if (data[index] === itemID) return true;
    }

    return false;
}
