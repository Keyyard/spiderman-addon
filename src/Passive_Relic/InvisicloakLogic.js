import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";
import { CheckLightEvent, LightCondition } from "../Ults/LightInteract.js";

export class InvisicloakLogic extends CuriosEventBase {
    constructor() {
        super("curio:invisicloak", "invis_logic");
        this.THRESHOLD = 3;
    }

    onEquip(player, slot, isInitial) {
        if (!isInitial) player.sendMessage("§8Invisicloak Equipped!");
    }

    onUnequip(player) {
        player.sendMessage("§7Invisicloak Removed.");
        if (player.isValid) player.removeEffect("invisibility");
    }

    onTick(player) {
        const isDim = CheckLightEvent(player, LightCondition.Less, this.THRESHOLD);
        if (isDim) {
            player.addEffect("invisibility", 40, { amplifier: 1, showParticles: false });
            player.onScreenDisplay.setActionBar("§8● Shadow Stealth Active");
        } else {
            player.removeEffect("invisibility");
            player.onScreenDisplay.setActionBar("§e○ Revealed by Light!");
        }
    }
}