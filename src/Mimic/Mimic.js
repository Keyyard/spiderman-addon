export class MimicKill {
  static onKill(deadEntity) {
    if (deadEntity.typeId != `artifacts:mimic`) return;
    const hasRelic = deadEntity.getDynamicProperty("hasRelic");

    console.log(hasRelic);
  }
}
