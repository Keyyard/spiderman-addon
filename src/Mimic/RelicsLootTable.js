export class RelicsLootTable {
  // Add as many items as you want here.
  // Weight represents the chance. Higher weight = more common.
  static lootPool = [
    { typeId: "curio:evolve_badget_1", weight: 1 },    // Extremely Rare
    { typeId: "curio:killer_queen", weight: 2 },        // Extremely Rare
    { typeId: "curio:invisicloak", weight: 3 },        // Very Rare
    { typeId: "curio:ragewatch", weight: 4 },          // Very Rare
    { typeId: "curio:reverse_watch", weight: 6 },       // Rare
    { typeId: "curio:enderbelt", weight: 10 },         // Uncommon
    { typeId: "curio:spider_bracelet", weight: 12 },   // Uncommon
    { typeId: "curio:copper_rocket_wand", weight: 15 },// Common
    { typeId: "curio:torchplacer", weight: 20 },       // Very Common
  ];

  /**
   * Calculates total weight and returns a random item typeId
   */
  static getRandomRelic() {
    const totalWeight = this.lootPool.reduce((sum, entry) => sum + entry.weight, 0);
    let random = Math.random() * totalWeight;

    for (const entry of this.lootPool) {
      if (random < entry.weight) {
        return entry.typeId;
      }
      random -= entry.weight;
    }
    return this.lootPool[0].typeId; // Fallback
  }
}