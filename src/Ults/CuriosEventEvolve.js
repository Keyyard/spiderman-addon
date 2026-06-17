import { CuriosEventBase } from "./CuriosEventBase.js";
import { ItemStack } from "@minecraft/server";

export class CuriosEventEvolve extends CuriosEventBase {
    constructor(identifier, eventKey, evolveToId = null) {
        super(identifier, eventKey);
        this.evolveToId = evolveToId;
    }

    /**
     * Called every tick while this item is in the OFF-HAND.
     * @param {Player} player 
     * @param {ContainerSlot} offhandSlot 
     * @param {ContainerSlot} mainhandSlot 
     */
    onEvolveTick(player, offhandSlot, mainhandSlot) {}

    /**
     * Called when the player dies while this item is in the OFF-HAND.
     */
    onEvolveDeath(player, damageSource, offhandSlot) {}

    /**
     * Helper to perform the evolution
     */
    evolve(player, offhandSlot) {
        if (!this.evolveToId) return;
        offhandSlot.setItem(new ItemStack(this.evolveToId));
        player.sendMessage(`§aYour §e${this.identifier}§a has evolved!`);
        player.dimension.playSound("random.levelup", player.location);
    }
}