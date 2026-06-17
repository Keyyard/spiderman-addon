import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";
import { system } from "@minecraft/server";

export class HolyVoiceLogic extends CuriosEventBase {
    constructor() {
        super("curio:holy_voice", "HolyVoice");
        this.timers = new Map();
    }

    onEquip(player, slot, isInitial) {
        if (isInitial) return;
        
        const id = system.runTimeout(() => {
            if (player.isValid) player.sendMessage(`§b[Holy Voice]§r Welcome §e${player.nameTag}`);
        }, 100);
        
        this.timers.set(player.id, id);
        player.onScreenDisplay.setActionBar("§7Divine connection established...");
    }

    onUnequip(player) {
        if (this.timers.has(player.id)) {
            system.clearRun(this.timers.get(player.id));
            this.timers.delete(player.id);
        }
        player.sendMessage("§c[Holy Voice]§7 Connection lost.");
    }
}