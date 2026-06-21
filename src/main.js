import { world, system } from "@minecraft/server";
import {
    handleWorldLoad,
    handleLoadCuriosData,
    handleCuriosEvent,
    handlePlayerInteract,
    handleEntityDie,
    handlePlayerJoin,
    tickCleanupEntities,
    tickPlayerLoop,
    tickSyncPlayerTags,
    handlePlayerLeave,
    player_curios_in_mainhand,
    playerList
} from "./Curios_Base/CuriosAPI";
import "./Curios_Base/CuriosEvent";


world.afterEvents.worldLoad.subscribe(() => {
    handleWorldLoad();
    system.runInterval(() => {
        tickPlayerLoop();
        const tick = system.currentTick;

        if (tick % 10 == 0) {
            tickCleanupEntities();
        }

        if (tick % 5 == 0) {
            tickSyncPlayerTags();
        }
    })
});

world.afterEvents.playerHotbarSelectedSlotChange.subscribe(s => {
    const curiosInHand = s.itemStack?.typeId === "nvy:curios";
    const playerData = s.player;
    player_curios_in_mainhand[playerData.id] = curiosInHand;
    if (!curiosInHand) {
        const curios_id = playerData.getDynamicProperty("curios-id");
        if (curios_id != undefined) {
            const entity = world.getEntity(curios_id);
            system.runTimeout(() => { if (entity) entity.remove(); }, 1);
            playerData.setDynamicProperty("curios-id");
        }
    }
});

world.afterEvents.playerInteractWithEntity.subscribe(s => {
    handlePlayerInteract(s)
});

world.afterEvents.entityDie.subscribe(s => {
    handleEntityDie(s)
}, { entityTypes: ["minecraft:player"] });

world.afterEvents.playerSpawn.subscribe(s => {
    if (s.initialSpawn) {
        handlePlayerJoin(s)
    }
});

world.afterEvents.playerLeave.subscribe(s => {
    handlePlayerLeave(s);
})

system.afterEvents.scriptEventReceive.subscribe(s => {
    handleLoadCuriosData(s)
}, { namespaces: ["load_curios_data"] });

system.afterEvents.scriptEventReceive.subscribe(s => {
    handleCuriosEvent(s)
}, { namespaces: ["curios"] });






world.afterEvents.playerSpawn.subscribe((event) => {
  if (event.initialSpawn) {
    event.player.sendMessage("§aHello from your Relic Bedrock addon!");
  }
});

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === "hello:world") {
    world.sendMessage(`§eReceived: ${event.id}`);
  }
});
