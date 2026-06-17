import { HeroBadgeLogic } from "./HeroBadgeLogic.js";

export class MadeInHeavenLogic extends HeroBadgeLogic {
    constructor() {
        super("curio:evolve_badget_5", "mih_logic");
    }
    onTick(player) {
        super.onTick(player); // Hero's Slow Fall & Purify
        player.addEffect("speed", 40, { amplifier: 4, showParticles: false }); // Speed 5
        player.addEffect("haste", 40, { amplifier: 2, showParticles: false });  // Haste 3
    }

    onEvolveTick() { return; }
    onEvolveDeath() { return; }
}