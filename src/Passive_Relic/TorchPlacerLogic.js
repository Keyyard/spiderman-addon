import { world, EquipmentSlot, ItemTypes } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";
import { CheckLightEvent, LightCondition } from "../Ults/LightInteract.js";

export class TorchPlacerLogic extends CuriosEventBase {
    constructor() {
        super("curio:torchplacer", "torch_logic");
        this.LIGHT_THRESHOLD = 2; // Hostile mobs spawn at 0 in modern MC
    }

    onTick(player) {
        // Only run check every 20 ticks to save performance
        if (world.getAbsoluteTime() % 20 !== 0) return;

        const isDark = CheckLightEvent(player, LightCondition.Less, this.LIGHT_THRESHOLD);
        if (!isDark) return;

        const block = player.dimension.getBlock(player.location);
        const blockBelow = player.dimension.getBlock({ x: player.location.x, y: player.location.y - 1, z: player.location.z });

        // Constraints: Must be in Air, and standing on a Solid block
        if (block && block.isAir && blockBelow && !blockBelow.isAir && !blockBelow.isLiquid) {
            this.tryPlaceTorch(player, block);
        }
    }

    tryPlaceTorch(player, targetBlock) {
        const inventory = player.getComponent("minecraft:inventory").container;
        
        // Scan Hotbar (Slots 0-8)
        for (let i = 0; i < 9; i++) {
            const item = inventory.getItem(i);
            if (item && (item.typeId === "minecraft:torch" || item.typeId === "minecraft:soul_torch")) {
                
                // Place the torch
                targetBlock.setPermutation(targetBlock.dimension.getBlock(targetBlock.location).permutation); 
                targetBlock.setType(item.typeId);
                
                // Consume 1 item
                if (item.amount > 1) {
                    item.amount -= 1;
                    inventory.setItem(i, item);
                } else {
                    inventory.setItem(i, undefined);
                }
                
                player.onScreenDisplay.setActionBar("§6Auto-Torch Placed");
                break;
            }
        }
    }
}