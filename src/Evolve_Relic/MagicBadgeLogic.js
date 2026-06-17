import { CuriosEventEvolve } from "../Ults/CuriosEventEvolve.js";

export class MagicBadgeLogic extends CuriosEventEvolve {
    constructor() { super("curio:evolve_badget_2", "magic_logic", "curio:evolve_badget_3"); }

    onTick(player) { player.addEffect("speed", 40, { amplifier: 0 }); }

    onEvolveTick(player, offhand) {
        const inv = player.getComponent("minecraft:inventory").container;
        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (item?.typeId === "minecraft:nether_star") {
                if (item.amount > 1) item.amount--; else inv.setItem(i, undefined);
                this.evolve(player, offhand);
                break;
            }
        }
    }
}