import { world, system, ItemStack } from "@minecraft/server";
import { curiosItem } from "./CuriosAPI";

system.afterEvents.scriptEventReceive.subscribe((event) => {
    // Listens specifically for /scriptevent curio:inventory
    if (event.id === "curio:inventory") {
        const player = event.sourceEntity;
        
        // Ensure the entity that triggered it is a player
        if (player && player.typeId === "minecraft:player") {
            handleCurioInventoryCommand(player);
        }
    }
});

/**
 * Logic to ensure the player has exactly one Curios menu item.
 */
function handleCurioInventoryCommand(player) {
    const inventoryComponent = player.getComponent("minecraft:inventory");
    if (!inventoryComponent || !inventoryComponent.container) return;
    
    const inventory = inventoryComponent.container;
    let foundIndices = [];
    let firstEmptySlot = -1;

    // Loop through the player's inventory slots
    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        
        if (!item) {
            if (firstEmptySlot === -1) firstEmptySlot = i;
            continue;
        }

        // Safe property check to avoid runtime crashes
        if (item.typeId === "nvy:curios") {
            foundIndices.push(i);
        }
    }

    // Process duplicate entries
    if (foundIndices.length > 1) {
        // Keep the first item found, delete the extra duplicates
        for (let j = 1; j < foundIndices.length; j++) {
            inventory.setItem(foundIndices[j], undefined);
        }
        player.sendMessage("§a[Curios] Found multiple menu items. Duplicates removed.");
    } 
    else if (foundIndices.length === 0) {
        if (firstEmptySlot !== -1) {
            // Ensure curiosItem is either an ItemStack or instantiate a new one here
            const itemToGive = curiosItem instanceof ItemStack ? curiosItem : new ItemStack("nvy:curios", 1);
            
            inventory.setItem(firstEmptySlot, itemToGive);
            player.sendMessage("§a[Curios] Curios inventory item restored to your inventory.");
        } else {
            player.sendMessage("§c[Curios] Your inventory is full! Please clear a slot first.");
        }
    } 
    else {
        player.sendMessage("§e[Curios] You already have the inventory menu item.");
    }
}