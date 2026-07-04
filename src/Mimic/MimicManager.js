import { world, system, ItemStack } from "@minecraft/server";
import { RelicsLootTable } from "./RelicsLootTable.js";

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
const MIMIC_ID = "artifacts:mimic";

export class MimicManager {
  // --- 1. SUMMONING (Called from main.js) ---
  static onInteract(player, block, itemStack) {
    if (!itemStack || itemStack.typeId !== REQUIRED_ITEM) return;

    const inv = block.getComponent("inventory");
    if (!inv?.container) return;

    const container = inv.container;
    let relicCount = 0;
    let occupiedSlots = 0;
    
    // Base recipe check variables
    let hasDiamondBlock = false;
    let hasGoldBlock = false;
    let hasLapisBlock = false;
    let diamondBlockAmount = 0;
    let goldBlockAmount = 0;
    let lapisBlockAmount = 0;

    // Scan inventory
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (!item) continue;

      occupiedSlots++;

      // Count Relics
      if (RELICS.includes(item.typeId)) {
        relicCount += item.amount; 
      }
      
      // Track Base Recipe Ingredients
      if (item.typeId === "minecraft:diamond_block") diamondBlockAmount += item.amount;
      if (item.typeId === "minecraft:gold_block") goldBlockAmount += item.amount;
      if (item.typeId === "minecraft:lapis_block") lapisBlockAmount += item.amount;
    }

    // STRICT BASE RECIPE: Exactly 3 occupied slots, and exactly 1 of each required block
    const isBaseRecipe = (
      occupiedSlots === 3 && 
      diamondBlockAmount === 1 && 
      goldBlockAmount === 1 && 
      lapisBlockAmount === 1
    );

    // If no relics AND no base recipe, do nothing
    if (relicCount === 0 && !isBaseRecipe) return;

    // Spawn Entity
    const location = block.location;
    location.y += 1; // Spawn above the block
    const entity = player.dimension.spawnEntity(MIMIC_ID, location);

    // Scale Health
    const health = entity.getComponent("health");
    if (health) {
      health.setCurrentValue(20 + relicCount * 10);
    }

    // Save data for later
    entity.setDynamicProperty("hasRelic", relicCount);

    // Calculate predicted drops using your consume logic
    const predictedDrops = relicCount === 0 ? 1 : relicCount <= 2 ? 2 : relicCount === 3 ? 3 : Math.max(1, relicCount - Math.ceil((relicCount - 2) / 2));

    world.sendMessage(`§eMimic ${relicCount} relics! ${20 + relicCount * 10} HP, ${Math.min(90, 5 * relicCount)}% damage reduction, will drop ${predictedDrops} relics!`);

    // Clear the chest inventory so items don't drop on the ground
    for (let i = 0; i < container.size; i++) {
        container.setItem(i, undefined);
    }

    // Remove chest
    block.setType("minecraft:air");

    // Clean up relics on the floor
    system.runTimeout(() => {
      for (const ent of player.dimension.getEntities({
        location: block.location,
        maxDistance: 4,
      })) {
        const itemComp = ent.getComponent("minecraft:item");
        if (itemComp && RELICS.includes(itemComp.itemStack?.typeId)) {
          ent.remove();
        }
      }
    }, 1);
  }

  // --- 2. LOOT DROP (Called from main.js) ---
  static onKill(deadEntity) {
      if (deadEntity.typeId !== MIMIC_ID) return;
      
      // Get how many relics were used to summon it
      const inputCount = deadEntity.getDynamicProperty("hasRelic") || 0;
      let dropCount = 1;

      // Diminishing returns logic
      if (inputCount === 0) {
        dropCount = 1;
      } else if (inputCount <= 2) {
        dropCount = 2; 
      } else if (inputCount === 3) {
        dropCount = 3; 
      } else {
        const reduction = Math.ceil((inputCount - 2) / 2);
        dropCount = Math.max(1, inputCount - reduction);
      }

      const { dimension, location } = deadEntity;

      // Loop through the drops
      for (let i = 0; i < dropCount; i++) {
        try {
          const lootId = RelicsLootTable.getRandomRelic();
          
          // Spawn the item at the mimic's death location
          const item = dimension.spawnItem(new ItemStack(lootId, 1), {
              x: location.x,
              y: location.y + 0.5, // Spawn slightly above feet
              z: location.z
          });

          // Apply "fountain" effect: random horizontal directions, strong upward pop
          item.applyImpulse({
              x: (Math.random() - 0.5) * 0.25, // Random spread
              y: 0.15,                          // Upward force
              z: (Math.random() - 0.5) * 0.25  // Random spread
          });

        } catch (e) {
          console.warn(`Failed to drop loot: ${e}`);
        }
      }
      
      console.log(`Mimic Defeated! Input: ${inputCount} | Drops: ${dropCount}`);
    }
}

// --- 3. DAMAGE REDUCTION ---
world.beforeEvents.entityHurt.subscribe((event) => {
  const { hurtEntity, damageSource, damage } = event;
  if (hurtEntity.typeId !== MIMIC_ID) return;

  // IMPORTANT: If damage is coming from "magic" (script), don't reduce it again
  if (damageSource.cause === "magic") return;

  const count = hurtEntity.getDynamicProperty("hasRelic") || 0;
  if (count === 0) return;

  // Cancel original damage
  event.cancel = true;

  // Calculate reduced damage
  const reduction = Math.min(90, 5 * count) / 100;
  const finalDamage = Math.max(1, damage * (1 - reduction)); // Minimum 1 damage

  // Apply damage in next tick as "magic" to avoid loops
  system.run(() => {
    hurtEntity.applyDamage(finalDamage, {
      cause: "magic", // Using magic cause to bypass this listener next time
      damagingEntity: damageSource.damagingEntity,
    });
  });
});

// --- 4. SPAWNER DROP (Internal) ---
world.afterEvents.playerBreakBlock.subscribe((event) => {
  if (event.brokenBlockPermutation.type.typeId === "minecraft:mob_spawner") {
    if (Math.random() < 0.4) {
      const item = event.dimension.spawnItem(new ItemStack(SPAWNER_BAR, 1), {
        x: event.block.location.x + 0.5,
        y: event.block.location.y + 0.5,
        z: event.block.location.z + 0.5
      });
      
      // Apply random horizontal force and a strong upward force
      item.applyImpulse({
        x: (Math.random() - 0.5) * 0.2, // Random X
        y: 0.4,                       // Upward pop
        z: (Math.random() - 0.5) * 0.2  // Random Z
      });
    }
  }
});