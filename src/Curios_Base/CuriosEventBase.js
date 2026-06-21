export class CuriosEventBase {
    constructor(identifier, eventKey) {
        this.identifier = identifier; // e.g., "curio:invisicloak"
        this.eventKey = eventKey;     // e.g., "invis_logic" (used in item tags)
    }

    // Called when item is put into the curio slot
    onEquip(player, slotIndex, isInitialLoad) {}

    // Called when item is removed
    onUnequip(player, slotIndex) {}

    // Called every tick (or interval) if the item is equipped
    onTick(player, slotIndex) {}

    // Called if the player dies while wearing this
    onDeath(player, slotIndex, damageSource) {}

    // Optional: For Active Relics (right-click logic)
    onUse(player, itemStack) {}
}