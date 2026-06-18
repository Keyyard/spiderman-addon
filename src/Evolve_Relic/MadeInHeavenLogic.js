import { HeroBadgeLogic } from "./HeroBadgeLogic.js";

export class MadeInHeavenLogic extends HeroBadgeLogic {
    constructor() {
        super("curio:made_in_heaven", "mih_logic", null);
    }
    onTick(player) {
        super.onTick(player); // Hero's Slow Fall & Purify
        player.addEffect("speed", 40, { amplifier: 14, showParticles: false }); // Speed
        player.addEffect("haste", 40, { amplifier: 4, showParticles: false });  // Haste
        player.addEffect("strength", 40, { amplifier: 3, showParticles: false }); // Strength
    }

    onEvolveTick() { return; }
    onEvolveDeath() { return; }
}