import { BlockComponentTypes, system } from "@minecraft/server";

const RELICS = [
  "curio:made_in_heaven",
  "curio:copper_rocket_wand",
  "curio:enderbelt",
  "curio:evolve_badget_1",
  "curio:evolve_badget_2",
  "curio:evolve_badget_3",
  "curio:evolve_badget_4",
  "curio:invisicloak",
  "curio:killer_queen_btd",
  "curio:killer_queen",
  "curio:ragewatch",
  "curio:reverse_watch",
  "curio:spider_bracelet",
  "curio:torchplacer",
];

const REQUIRED_ITEM = "curio:mimic_dust";
const SPAWNER_BAR = "curio:spawner_bar";
const SPAWNER_DROP_CHANCE = 0.4;

// --- 1. HANDLE SPAWNER DROP ---
world.afterEvents.playerBreakBlock.subscribe((event) => {
    const { block, dimension, brokenBlockPermutation } = event;
    if (brokenBlockPermutation.type.typeId === "minecraft:mob_spawner") {
        if (Math.random() < SPAWNER_DROP_CHANCE) {
            dimension.spawnItem(new ItemStack(SPAWNER_BAR, 1), block.location);
        }
    }
});

// --- 2. SUMMON AND SCALE MIMIC ---
export class SummonMimic {
  static onInteract(player, block, itemStack) {
    if (!itemStack || itemStack.typeId !== REQUIRED_ITEM) return;

    const inv = block.getComponent(BlockComponentTypes.Inventory);
    if (!inv?.container) return;

    const container = inv.container;

    let hasRelic = 0;

    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);

      if (item && RELICS.includes(item.typeId)) {
        hasRelic++;
      }
    }

    if (hasRelic == 0) return;

    const entity = player.dimension.spawnEntity(
      "artifacts:mimic",
      block.location,
    );
    entity.setDynamicProperty("hasRelic", hasRelic);

    block.setType("minecraft:air");

    system.runTimeout(() => {
      for (const entity of player.dimension.getEntities({
        location: block.location,
        maxDistance: 4,
      })) {
        const itemComp = entity.getComponent("minecraft:item");
        if (!itemComp) continue;

        const typeId = itemComp.itemStack?.typeId;

        if (typeId && RELICS.includes(typeId)) {
          entity.remove();
        }
      }
    }, 1);
  }
}
