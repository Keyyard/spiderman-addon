import { world, BlockPermutation } from "@minecraft/server"
import { randomInt } from '../utils/functions.js'

//Estas direcciones estan basadas en las del mapa con brujula
/* 
const forward = { x: 0, y: 0, z: -1 }
const back = { x: 0, y: 0, z: 1 }
const left = { x: -1, y: 0, z: 0 }
const right = { x: 1, y: 0, z: 0 }

function vectorAdd(v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
}
 */

function spawnMimic(block) {
    const { dimension, location } = block
    block.setPermutation(BlockPermutation.resolve('minecraft:air'))
    dimension.spawnEntity('artifacts:mimic', block.center())
    //parece que hace una animacion de giro...
    //entity.teleport(block.center(), { facingLocation: vectorAdd(block.center(), left) })
}

world.beforeEvents.playerInteractWithBlock.subscribe(async ev => {
    const block = ev.block


    if (ev.isFirstEvent && block.typeId == 'artifacts:dummy_chest') {
        await null;
        spawnMimic(block)
    }
})

world.beforeEvents.playerBreakBlock.subscribe(async ev => {
    const block = ev.block;

    if (block.typeId == 'artifacts:dummy_chest') {
        await null;
        spawnMimic(block)
    }
});

world.afterEvents.blockExplode.subscribe(ev => {
    let block = ev.block
    let blockPermutation = ev.explodedBlockPermutation

    //world.sendMessage(`${blockPermutation.type.id}`)

    if (blockPermutation.type.id == 'artifacts:dummy_chest') {
        spawnMimic(block)
    }
})
