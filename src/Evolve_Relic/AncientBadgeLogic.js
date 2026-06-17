import { CuriosEventEvolve } from "../Ults/CuriosEventEvolve.js";

export class AncientBadgeLogic extends CuriosEventEvolve {
    constructor() 
    { 
        super("curio:evolve_badget_1", "ancient_logic", "curio:evolve_badget_2"); 
    }

    onEvolveTick(player, offhand, mainhand) {
        if (mainhand.hasItem() && mainhand.typeId.includes("curio:")) {
            let timer = (player.getDynamicProperty("ev_t1") || 0) + 1;
            player.setDynamicProperty("ev_t1", timer);
            if (timer === 1) player.sendMessage("§e[Ancient]§7 Meditate for 20s...");
            
            if (timer >= 20) {
                mainhand.setItem(undefined); // Consume main hand
                this.evolve(player, offhand);
                player.setDynamicProperty("ev_t1", 0);
            }
        } else { player.setDynamicProperty("ev_t1", 0); }
    }
}