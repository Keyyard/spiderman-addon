import { world, system, Player } from "@minecraft/server";
import type { Vector3 } from "@minecraft/server";

// ─── Tunables ──────────────────────────────────────────────────────────────
const WEB_ITEM = "nvy:spider_bracelet"; // right-click this item to shoot a web
const MAX_WEB_DISTANCE = 50;            // how far a web can reach (blocks)
const RELEASE_DISTANCE = 2.5;           // auto-detach when this close to anchor
const SHOOT_COOLDOWN = 2;               // ticks between web shots (anti-spam)              

// Movement Constants
const KB_SCALE = 1.2;     // applyKnockback units per block/tick (raise/lower if it over/undershoots)
const MAX_STEP = 2.5;     // clamp per-tick velocity change (anti-jolt)
const DEADZONE = 0.02;    // skip tiny corrections (anti-jitter)

// ZIP Mode (Looking at anchor)
// Modes auto-switch by where you look relative to the anchor:
const ZIP_AIM_DEGREES = 15; // degrees from the anchor → ZIP, else SWING 
const ZIP_SPEED = 1.9;    // target travel speed (blocks/tick) — higher = faster
const ZIP_RESPONSE = 0.5; // 0..1 how quickly you reach ZIP_SPEED — lower = smoother/softer

// SWING Mode (The "Grapple Push" logic)
const LOOK_CONTROL = 0.65; //from look direction
const SWING_FORCE = 0.65;  // The constant push strength while swinging
const ROPE_STIFF = 0.8;    // How hard the rope pulls back when stretched taut
const SWING_MAX_DEGREE = 135; // Auto-cut if player swings this far past the anchor
const SWING_ANGLE_CAP = 90;   // Degrees: If look angle > this, force is clamped to tangent (circle)

const RELEASE_FLING = 1.5; // fling force when end grappling (sneak)
const SWING_FLING = 1.05;

// Visuals
const WEB_PARTICLE = "nvy:web_strand";
const STRAND_SPACING = 0.5; // blocks between strand particles
const STRAND_MAX = 64;      // cap particles per strand
// ───────────────────────────────────────────────────────────────────────────

interface Web {
    anchor: Vector3;
    ropeLen: number;
    initNormal: Vector3; // Vector from anchor to player at the start
}

const webs = new Map<string, Web>();
const lastShot = new Map<string, number>();

// Helpers
function len(v: Vector3): number {
    return Math.hypot(v.x, v.y, v.z);
}

function dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v: Vector3): Vector3 {
    const l = len(v);
    if (l === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function pushDelta(player: Player, dx: number, dy: number, dz: number): void {
    const m = Math.hypot(dx, dy, dz);
    if (m < DEADZONE) return;
    if (m > MAX_STEP) {
        const s = MAX_STEP / m;
        dx *= s; dy *= s; dz *= s;
    }
    player.applyKnockback({ x: dx * KB_SCALE, z: dz * KB_SCALE }, dy * KB_SCALE);
}

function wristPoint(player: Player): Vector3 {
    const head = player.getHeadLocation();
    const look = player.getViewDirection();
    const rl = Math.hypot(look.z, look.x) || 1;
    const right = { x: -look.z / rl, z: look.x / rl };
    return {
        x: head.x + look.x * 0.3 + right.x * 0.35,
        y: head.y - 0.35 + look.y * 0.3,
        z: head.z + look.z * 0.3 + right.z * 0.35,
    };
}

function drawWeb(player: Player, anchor: Vector3): void {
    const from = wristPoint(player);
    const d = { x: anchor.x - from.x, y: anchor.y - from.y, z: anchor.z - from.z };
    const dist = len(d);
    const steps = Math.min(STRAND_MAX, Math.max(2, Math.ceil(dist / STRAND_SPACING)));
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        try {
            player.dimension.spawnParticle(WEB_PARTICLE, {
                x: from.x + d.x * t, y: from.y + d.y * t, z: from.z + d.z * t,
            });
        } catch { break; }
    }
}

function shootWeb(player: Player): void {
    const now = system.currentTick;
    const last = lastShot.get(player.id) ?? -1000;
    if (now - last < SHOOT_COOLDOWN) 
    {
        const label = `§8✗ §7Wait ${SHOOT_COOLDOWN - (now - last)} more tick(s)`;
        player.onScreenDisplay.setActionBar(label);
        return;
    }
    lastShot.set(player.id, now);

    const hit = player.getBlockFromViewDirection({
        maxDistance: MAX_WEB_DISTANCE,
        includePassableBlocks: false,
        includeLiquidBlocks: false,
    });
    const head = player.getHeadLocation();

    if (!hit) {
        player.onScreenDisplay.setActionBar("§8✗ §7No Surface Found");
        player.dimension.playSound("random.bow", head, { volume: 0.3, pitch: 1.8 });
        return;
    }

    const b = hit.block.location;
    const f = hit.faceLocation;
    const anchor: Vector3 = { x: b.x + f.x, y: b.y + f.y, z: b.z + f.z };
    const ropeLen = len({ x: anchor.x - head.x, y: anchor.y - head.y, z: anchor.z - head.z });
    
    // Store the initial vector from anchor to player to use as the "forward" face
    const initNormal = normalize({ x: head.x - anchor.x, y: head.y - anchor.y, z: head.z - anchor.z });

    webs.set(player.id, { anchor, ropeLen, initNormal });
    player.dimension.playSound("mob.spider.say", head, { volume: 0.6, pitch: 1.7 });
}

function release(player: Player, fling: boolean, customDir?: Vector3): void {
    if (!webs.has(player.id)) return;
    webs.delete(player.id);
    if (fling) {
        const flingDir = customDir ?? player.getViewDirection();
        player.applyKnockback(
            { x: flingDir.x * RELEASE_FLING, z: flingDir.z * RELEASE_FLING },
            Math.max(flingDir.y, 0.3) * RELEASE_FLING,
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
    // Pre-calculate the threshold for degree comparison
    const zipThreshold = Math.cos(ZIP_AIM_DEGREES * (Math.PI / 180));
    const swingCutThreshold = Math.cos(SWING_MAX_DEGREE * (Math.PI / 180));
    const capThreshold = Math.cos(SWING_ANGLE_CAP * (Math.PI / 180));

    for (const [id, web] of webs) {
        const player = world.getEntity(id) as Player | undefined;
        if (!player || !player.isValid) { webs.delete(id); continue; }

        if (player.isSneaking) { release(player, true); continue; }
        if (!stillHoldingWeb(player)) { release(player, false); continue; }

        const head = player.getHeadLocation();
        const vel = player.getVelocity();

        // --- NEW: COLLISION & GROUND DETECTION ---
        if (len(vel) > 0.1) {
            const hit = player.dimension.getBlockFromRay(head, normalize(vel), { maxDistance: 1.2 });
            if (hit || player.isOnGround) {
                release(player, false);
                continue;
            }
        }

        const toAnchor: Vector3 = {
            x: web.anchor.x - head.x,
            y: web.anchor.y - head.y,
            z: web.anchor.z - head.z,
        };
        const dist = len(toAnchor);

        const n = normalize(toAnchor); // Unit vector toward anchor
        const look = player.getViewDirection(); 
        const aim = dot(look, n); 

        let label: string;

        if (aim > zipThreshold) 
        {
            // --- ZIP MODE AUTO-CUT ---
            if (dist < RELEASE_DISTANCE) {
                release(player, false);
                continue;
            }

            // ZIP: Smooth pull straight to anchor
            pushDelta(
                player,
                (n.x * ZIP_SPEED - vel.x) * ZIP_RESPONSE,
                (n.y * ZIP_SPEED - vel.y) * ZIP_RESPONSE,
                (n.z * ZIP_SPEED - vel.z) * ZIP_RESPONSE,
            );
            label = `§b»» ZIP §7${Math.round(dist)}m`;
        } else {
            // --- SWING MODE AUTO-CUT ---
            const currentToPlayer = normalize({ x: -toAnchor.x, y: -toAnchor.y, z: -toAnchor.z });
            const currentAngleDot = dot(web.initNormal, currentToPlayer);
            
            // Calculate current angle in degrees for the display
            const currentAngleDeg = Math.acos(Math.min(1, Math.max(-1, currentAngleDot))) * (180 / Math.PI);

            // --- ADJUSTED: GRAPPLE PUSH WITH ANGLE CAP ---
            let combinedPush: Vector3;
            if (aim < capThreshold) {
                // Angle is too wide: Cap at 90 degrees (Tangent rejection)
                const proj = dot(look, n);
                combinedPush = normalize({
                    x: look.x - proj * n.x,
                    y: look.y - proj * n.y,
                    z: look.z - proj * n.z
                });
            } else {
                // Angle is smaller than cap: Use standard steering logic
                combinedPush = normalize({
                    x: (n.x * (1 - LOOK_CONTROL)) + (look.x * LOOK_CONTROL),
                    y: (n.y * (1 - LOOK_CONTROL)) + (look.y * LOOK_CONTROL),
                    z: (n.z * (1 - LOOK_CONTROL)) + (look.z * LOOK_CONTROL)
                });
            }

            // Check Angle Cut OR Half Distance Cut
            if (currentAngleDot < swingCutThreshold || dist < (RELEASE_DISTANCE / 2)) 
            {
                const combinedPushFling = {
                    x: combinedPush.x * SWING_FLING,
                    y: combinedPush.y * SWING_FLING,
                    z: combinedPush.z * SWING_FLING
                };

                player.onScreenDisplay.setActionBar("Swing Fling !!");
                release(player, true, combinedPushFling);
                continue;
            }

            // --- SWING PHYSICS ---
            let dx = 0, dy = 0, dz = 0;

            // 1. ROPE PHYSICS (The tension that stops you from flying away)
            if (dist >= web.ropeLen) {
                const radial = dot(vel, n); 
                if (radial < 0) { // Moving away from anchor
                    dx = -radial * n.x * ROPE_STIFF;
                    dy = -radial * n.y * ROPE_STIFF;
                    dz = -radial * n.z * ROPE_STIFF;
                }
            }

            // 2. THE GRAPPLE PUSH VECTOR (Combined Look + Anchor with Cap)
            dx += combinedPush.x * SWING_FORCE;
            dy += combinedPush.y * SWING_FORCE;
            dz += combinedPush.z * SWING_FORCE;

            pushDelta(player, dx, dy, dz);
            label = `§e~ SWING §7${Math.round(currentAngleDeg)}° §8· sneak to fling`;
        }

        player.onScreenDisplay.setActionBar(label);
        drawWeb(player, web.anchor);
    }
}

// Wiring
world.afterEvents.itemUse.subscribe((e) => {
    if (e.itemStack?.typeId !== WEB_ITEM) return;
    shootWeb(e.source);
});

system.runInterval(swingTick, 1);