import { world, system, Player } from "@minecraft/server";
import type { Vector3 } from "@minecraft/server";

// ─── Tunables ──────────────────────────────────────────────────────────────
const WEB_ITEM = "nvy:spider_bracelet"; // right-click this item to shoot a web
const MAX_WEB_DISTANCE = 40;            // how far a web can reach (blocks)
const RELEASE_DISTANCE = 2.5;           // auto-detach when this close to anchor
const SHOOT_COOLDOWN = 4;               // ticks between web shots (anti-spam)

// Movement is driven by applyKnockback (applyImpulse doesn't work on players).
// Modes auto-switch by where you look relative to the anchor:
const ZIP_AIM = 0.55;     // look within this dot of the anchor → ZIP, else SWING

// Movement uses velocity-targeting: each tick we ease the player's *velocity*
// toward a goal (smooth) instead of adding a fixed force (jittery).
const KB_SCALE = 1.2;     // applyKnockback units per block/tick (raise/lower if it over/undershoots)
const MAX_STEP = 2.5;     // clamp per-tick velocity change (anti-jolt)
const DEADZONE = 0.02;    // skip tiny corrections (anti-jitter)

// ZIP — ease velocity toward a straight pull to the anchor
const ZIP_SPEED = 1.9;     // target travel speed (blocks/tick) — higher = faster
const ZIP_RESPONSE = 0.5; // 0..1 how quickly you reach ZIP_SPEED — lower = smoother/softer

// SWING — pendulum: the rope cancels outward motion, gravity arcs you, look steers
const ROPE_STIFF = 0.7;    // how firmly the rope cancels outward velocity — lower = smoother
const SWING_THRUST = 0.13; // steer / pump speed with the look direction — higher = faster

const RELEASE_FLING = 1.0; // fling force when you let go (sneak)

// Web-line visual
const WEB_PARTICLE = "nvy:web_strand";
const STRAND_SPACING = 0.5; // blocks between strand particles
const STRAND_MAX = 64;      // cap particles per strand
// ───────────────────────────────────────────────────────────────────────────

interface Web {
    anchor: Vector3;
    ropeLen: number;
}

const webs = new Map<string, Web>();
const lastShot = new Map<string, number>();

function len(v: Vector3): number {
    return Math.hypot(v.x, v.y, v.z);
}

function dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Ease toward a velocity change: clamp big jolts, ignore tiny ones (anti-jitter).
function pushDelta(player: Player, dx: number, dy: number, dz: number): void {
    const m = Math.hypot(dx, dy, dz);
    if (m < DEADZONE) return;
    if (m > MAX_STEP) {
        const s = MAX_STEP / m;
        dx *= s;
        dy *= s;
        dz *= s;
    }
    player.applyKnockback({ x: dx * KB_SCALE, z: dz * KB_SCALE }, dy * KB_SCALE);
}

// Approximate the wrist: a bit forward, down, and to the right of the head.
function wristPoint(player: Player): Vector3 {
    const head = player.getHeadLocation();
    const look = player.getViewDirection();
    const rl = Math.hypot(look.z, look.x) || 1;
    const right = { x: -look.z / rl, z: look.x / rl }; // horizontal right of view
    return {
        x: head.x + look.x * 0.3 + right.x * 0.35,
        y: head.y - 0.35 + look.y * 0.3,
        z: head.z + look.z * 0.3 + right.z * 0.35,
    };
}

// Spawn a dotted strand of particles from the wrist to the anchor.
function drawWeb(player: Player, anchor: Vector3): void {
    const from = wristPoint(player);
    const d: Vector3 = { x: anchor.x - from.x, y: anchor.y - from.y, z: anchor.z - from.z };
    const dist = len(d);
    const steps = Math.min(STRAND_MAX, Math.max(2, Math.ceil(dist / STRAND_SPACING)));
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        try {
            player.dimension.spawnParticle(WEB_PARTICLE, {
                x: from.x + d.x * t,
                y: from.y + d.y * t,
                z: from.z + d.z * t,
            });
        } catch {
            // location unloaded — stop drawing this strand
            break;
        }
    }
}

function shootWeb(player: Player): void {
    const now = system.currentTick;
    const last = lastShot.get(player.id) ?? -1000;
    if (now - last < SHOOT_COOLDOWN) return;
    lastShot.set(player.id, now);

    const hit = player.getBlockFromViewDirection({
        maxDistance: MAX_WEB_DISTANCE,
        includePassableBlocks: false,
        includeLiquidBlocks: false,
    });
    const head = player.getHeadLocation();

    if (!hit) {
        player.onScreenDisplay.setActionBar("§8✗ §7no web — nothing in range");
        player.dimension.playSound("random.bow", head, { volume: 0.3, pitch: 1.8 });
        return;
    }

    // faceLocation is relative to the block, so add the block origin for a world point.
    const b = hit.block.location;
    const f = hit.faceLocation;
    const anchor: Vector3 = { x: b.x + f.x, y: b.y + f.y, z: b.z + f.z };
    const ropeLen = len({ x: anchor.x - head.x, y: anchor.y - head.y, z: anchor.z - head.z });

    webs.set(player.id, { anchor, ropeLen });
    player.dimension.playSound("mob.spider.say", head, { volume: 0.6, pitch: 1.7 });
}

function release(player: Player, fling: boolean): void {
    if (!webs.has(player.id)) return;
    webs.delete(player.id);
    if (fling) {
        const look = player.getViewDirection();
        player.applyKnockback(
            { x: look.x * RELEASE_FLING, z: look.z * RELEASE_FLING },
            Math.max(look.y, 0.3) * RELEASE_FLING,
        );
        player.onScreenDisplay.setActionBar("§7… released");
    } else {
        player.onScreenDisplay.setActionBar("");
    }
}

function stillHoldingWeb(player: Player): boolean {
    const eq = player.getComponent("minecraft:equippable");
    const main = eq?.getEquipment("Mainhand" as never);
    return main?.typeId === WEB_ITEM;
}

function swingTick(): void {
    for (const [id, web] of webs) {
        const player = world.getEntity(id) as Player | undefined;
        if (!player || !player.isValid) {
            webs.delete(id);
            continue;
        }

        // Let go: sneak, or no longer holding the web item.
        if (player.isSneaking) {
            release(player, true);
            continue;
        }
        if (!stillHoldingWeb(player)) {
            release(player, false);
            continue;
        }

        const head = player.getHeadLocation();
        const to: Vector3 = {
            x: web.anchor.x - head.x,
            y: web.anchor.y - head.y,
            z: web.anchor.z - head.z,
        };
        const dist = len(to);
        if (dist < RELEASE_DISTANCE) {
            release(player, false);
            continue;
        }

        const n: Vector3 = { x: to.x / dist, y: to.y / dist, z: to.z / dist }; // unit, toward anchor
        const look = player.getViewDirection(); // unit
        const aim = dot(look, n); // 1 = looking straight at the anchor
        const vel = player.getVelocity();

        let label: string;
        if (aim > ZIP_AIM) {
            // ZIP: ease velocity toward a straight pull at ZIP_SPEED.
            pushDelta(
                player,
                (n.x * ZIP_SPEED - vel.x) * ZIP_RESPONSE,
                (n.y * ZIP_SPEED - vel.y) * ZIP_RESPONSE,
                (n.z * ZIP_SPEED - vel.z) * ZIP_RESPONSE,
            );
            label = `§b»» ZIP §7${Math.round(dist)}m`;
        } else {
            // SWING: rope cancels outward (rope-stretching) velocity; gravity arcs you.
            let dx = 0;
            let dy = 0;
            let dz = 0;
            if (dist >= web.ropeLen) {
                const radial = dot(vel, n); // + toward anchor, - moving away (taut)
                if (radial < 0) {
                    dx = -radial * n.x * ROPE_STIFF;
                    dy = -radial * n.y * ROPE_STIFF;
                    dz = -radial * n.z * ROPE_STIFF;
                }
            }
            dx += look.x * SWING_THRUST; // steer
            dz += look.z * SWING_THRUST;
            pushDelta(player, dx, dy, dz);
            label = `§e~ SWING §7${Math.round(dist)}m §8· sneak to drop`;
        }

        player.onScreenDisplay.setActionBar(label);
        drawWeb(player, web.anchor);
    }
}

// ─── Wiring ────────────────────────────────────────────────────────────────
world.afterEvents.itemUse.subscribe((e) => {
    if (e.itemStack?.typeId !== WEB_ITEM) return;
    shootWeb(e.source);
});

system.runInterval(swingTick, 1);
