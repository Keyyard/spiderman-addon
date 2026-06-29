import { system, world } from "@minecraft/server";

world.beforeEvents.entityHurt.subscribe((event) => {
  system.run(() => {
    const { hurtEntity, damageSource, damage } = event;
    if (hurtEntity.typeId != `artifacts:mimic`) return;

    event.cancel = true;

    const damagingEntity = damageSource.damagingEntity;
    const mimicHasRelic = hurtEntity.getDynamicProperty("hasRelic");

    const damageReduction = Math.min(90, 5 * mimicHasRelic) / 100;
    const damageToApply = damage * (1 - damageReduction);

    console.log(damageToApply, damageReduction);

    hurtEntity.applyDamage(damageToApply, {
      cause: "entityAttack",
      damagingEntity: damagingEntity,
    });
  });
});
