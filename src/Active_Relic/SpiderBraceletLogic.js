import { world, system, MolangVariableMap } from "@minecraft/server";
import { CuriosEventBase } from "../Curios_Base/CuriosEventBase.js";

// ─── Tunables (PRESERVED FROM GRAPPLE.TS) ──────────────────────────────────
const WEB_ITEM = "curio:spider_bracelet"; // right-click this item to shoot a web
const MAX_WEB_DISTANCE = 80;            // how far a web can reach (blocks)
const RELEASE_DISTANCE = 2.5;           // auto-detach when this close to anchor
const SHOOT_COOLDOWN = 1;               // ticks between web shots (anti-spam)              

// Hook Support
const WALL_CHECK_DIST = 1.5;   // Sphere cast radius for shooting

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
const SWING_FORCE = 0.7;  // The constant push strength while swinging
const ROPE_STIFF = 0.8;    // How hard the rope pulls back when stretched taut
const SWING_MAX_DEGREE = 120; // Auto-cut if player swings this far past the anchor

const SWING_ANGLE_CAP = 90;   // Degrees: If look angle > this, force is clamped to tangent (circle)
const BACKWARDS_CUTOFF = 150; // Degrees: If look angle > this, stop pushing
const CUTOFF_FLING = 2.25;

const RELEASE_FLING = 1.25; // fling force when end grappling (sneak)
const SWING_FLING = 1.05;

// Visuals
const WEB_PARTICLE = "nvy:web_strand";
const webVars = new MolangVariableMap();

//const STRAND_SPACING = 0.5; // blocks between strand particles
//const STRAND_MAX = 64;      // cap particles per strand
// ───────────────────────────────────────────────────────────────────────────

export class SpiderBraceletLogic extends CuriosEventBase {
    constructor() {
        super(WEB_ITEM, "spider_logic");
        this.webs = new Map();
        this.lastShot = new Map();
        
        // Pre-calculate math thresholds for performance
        this.zipThreshold = Math.cos(ZIP_AIM_DEGREES * (Math.PI / 180));
        this.swingCutThreshold = Math.cos(SWING_MAX_DEGREE * (Math.PI / 180));
        this.capThreshold = Math.cos(SWING_ANGLE_CAP * (Math.PI / 180));
        this.backCutoffThreshold = Math.cos(BACKWARDS_CUTOFF * (Math.PI / 180));
    }

    /**
     * @override
     * Called when the item is equipped in the Curio slot.
     */
    onEquip(player, slotIndex, isInitialLoad) {
        if (isInitialLoad === false) {
            player.sendMessage("§bSpider Bracelet Equipped!");
        }
    }

    /**
     * @override
     * Called when the item is removed from the Curio slot.
     */
    onUnequip(player, slotIndex) {
        player.sendMessage("§cI rejected to be the spider, back to hooman.");
        if (player.isValid) {
            player.removeEffect("jump_boost");
            this.release(player, false); // Clean up web if active
        }
    }

    /**
     * @override
     * Called every tick by the Relic Engine while the item is equipped.
     */
    onTick(player) 
    {
        // 1. Passive Jump Boost logic (preserved from CuriosEvent.js)
        player.addEffect("jump_boost", 100, { amplifier: 1, showParticles: true });

        // 2. Active Grapple Physics (preserved logic from swingTick)
        if (!this.webs.has(player.id)) return;

        const web = this.webs.get(player.id);

        // Check if player should still be grappling
        if (player.isSneaking || player.isJumping) { this.release(player, true); return; }
        if (!this.stillHoldingWeb(player)) { this.release(player, false); return; }

        const head = player.getHeadLocation();
        const vel = player.getVelocity();

        // --- COLLISION & GROUND DETECTION (Single ray for performance) ---
        if (this.len(vel) > 0.1) {
            const hit = player.dimension.getBlockFromRay(head, this.normalize(vel), { maxDistance: 1.2 });
            if (hit || player.isOnGround) {
                this.release(player, false);
                return;
            }
        }

        const toAnchor = {
            x: web.anchor.x - head.x,
            y: web.anchor.y - head.y,
            z: web.anchor.z - head.z,
        };
        const dist = this.len(toAnchor);
        const n = this.normalize(toAnchor); // Unit vector toward anchor
        const look = player.getViewDirection(); 
        const aim = this.dot(look, n); 

        let label;

        if (aim < this.backCutoffThreshold) {
            // push 
            const flingAmplify = player.getViewDirection();
            flingAmplify.x *= CUTOFF_FLING;
            flingAmplify.y *= CUTOFF_FLING;
            flingAmplify.z *= CUTOFF_FLING;

            this.release(player, true, flingAmplify);
            return;
        }
        else if (aim > this.zipThreshold) {
            // --- ZIP MODE AUTO-CUT ---
            if (dist < RELEASE_DISTANCE) {
                this.release(player, false);
                return;
            }

            // ZIP: Smooth pull straight to anchor
            this.pushDelta(
                player,
                (n.x * ZIP_SPEED - vel.x) * ZIP_RESPONSE,
                (n.y * ZIP_SPEED - vel.y) * ZIP_RESPONSE,
                (n.z * ZIP_SPEED - vel.z) * ZIP_RESPONSE,
            );
            label = `§b»» ZIP §7${Math.round(dist)}m`;
        } else {
            // --- SWING MODE AUTO-CUT ---
            const currentToPlayer = this.normalize({ x: -toAnchor.x, y: -toAnchor.y, z: -toAnchor.z });
            const currentAngleDot = this.dot(web.initNormal, currentToPlayer);
            const currentAngleDeg = Math.acos(Math.min(1, Math.max(-1, currentAngleDot))) * (180 / Math.PI);

            // --- ADJUSTED: GRAPPLE PUSH WITH ANGLE CAP ---
            let combinedPush;
            if (aim < this.capThreshold) {
                // Angle is too wide: Cap at 90 degrees (Tangent rejection)
                const proj = this.dot(look, n);
                combinedPush = this.normalize({
                    x: look.x - proj * n.x,
                    y: look.y - proj * n.y,
                    z: look.z - proj * n.z
                });
            } else {
                // Angle is smaller than cap: Use standard steering logic
                combinedPush = this.normalize({
                    x: (n.x * (1 - LOOK_CONTROL)) + (look.x * LOOK_CONTROL),
                    y: (n.y * (1 - LOOK_CONTROL)) + (look.y * LOOK_CONTROL),
                    z: (n.z * (1 - LOOK_CONTROL)) + (look.z * LOOK_CONTROL)
                });
            }

            // Check Angle Cut OR Half Distance Cut
            if (currentAngleDot < this.swingCutThreshold || dist < (RELEASE_DISTANCE / 2)) {
                const combinedPushFling = {
                    x: combinedPush.x * SWING_FLING,
                    y: combinedPush.y * SWING_FLING,
                    z: combinedPush.z * SWING_FLING
                };
                player.onScreenDisplay.setActionBar("Swing Fling !!");
                this.release(player, true, combinedPushFling);
                return;
            }

            // --- SWING PHYSICS ---
            let dx = 0, dy = 0, dz = 0;

            // 1. ROPE PHYSICS (The tension that stops you from flying away)
            if (dist >= web.ropeLen) {
                const radial = this.dot(vel, n); 
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

            this.pushDelta(player, dx, dy, dz);
            label = `§e~ SWING §7${Math.round(currentAngleDeg)}° §8· sneak to fling`;
        }

        player.onScreenDisplay.setActionBar(label);
        this.drawWeb(player, web.anchor);
    }

    /**
     * @override
     * Called by Relic Engine when the player right-clicks with this item.
     */
    onUse(player, itemStack) {
        this.shootWeb(player);
    }

    // ─── INTERNAL PHYSICS METHODS (Transferred from grapple.ts) ────────────

    len(v) { return Math.hypot(v.x, v.y, v.z); }
    dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
    normalize(v) {
        const l = this.len(v);
        if (l === 0) return { x: 0, y: 0, z: 0 };
        return { x: v.x / l, y: v.y / l, z: v.z / l };
    }

    getSpherecastHit(player) {
        const head = player.getHeadLocation();
        const look = player.getViewDirection();
        const opts = { maxDistance: MAX_WEB_DISTANCE, includePassableBlocks: false, includeLiquidBlocks: false };

        const centerHit = player.getBlockFromViewDirection(opts);
        if (centerHit) return centerHit;

        const rl = Math.hypot(look.z, look.x) || 1;
        const right = { x: -look.z / rl, y: 0, z: look.x / rl };
        const up = {
            x: look.y * right.z - look.z * 0, 
            y: look.z * right.x - look.x * right.z,
            z: look.x * 0 - look.y * right.x
        };

        const d = 0.707 * WALL_CHECK_DIST;
        const r = WALL_CHECK_DIST;
        const offsets = [
            { x: right.x * r, y: up.y * 0, z: right.z * r },
            { x: -right.x * r, y: up.y * 0, z: -right.z * r },
            { x: up.x * r, y: up.y * r, z: up.z * r },
            { x: -up.x * r, y: -up.y * r, z: -up.z * r },
            { x: (right.x * d) + (up.x * d), y: (up.y * d), z: (right.z * d) + (up.z * d) },
            { x: (-right.x * d) + (up.x * d), y: (up.y * d), z: (-right.z * d) + (up.z * d) },
            { x: (right.x * d) - (up.x * d), y: (-up.y * d), z: (right.z * d) - (up.z * d) },
            { x: (-right.x * d) - (up.x * d), y: (-up.y * d), z: (-right.z * d) - (up.z * d) }
        ];

        for (const offset of offsets) {
            const start = { x: head.x + offset.x, y: head.y + offset.y, z: head.z + offset.z };
            const rayHit = player.dimension.getBlockFromRay(start, look, opts);
            if (rayHit) return rayHit;
        }
        return undefined;
    }

    pushDelta(player, dx, dy, dz) {
        const m = Math.hypot(dx, dy, dz);
        if (m < DEADZONE) return;
        if (m > MAX_STEP) {
            const s = MAX_STEP / m;
            dx *= s; dy *= s; dz *= s;
        }
        player.applyKnockback({ x: dx * KB_SCALE, z: dz * KB_SCALE }, dy * KB_SCALE);
    }

    wristPoint(player) {
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

    drawWeb(player, anchor) {
        const from = this.wristPoint(player);
        const d = { x: anchor.x - from.x, y: anchor.y - from.y, z: anchor.z - from.z };
        const dist = this.len(d);
        if (dist < 0.01) return;

        // One stretched billboard spanning wrist→anchor (lookat_direction beam),
        // instead of spamming a dotted line of particles along the rope.
        const mid = { x: from.x + d.x * 0.5, y: from.y + d.y * 0.5, z: from.z + d.z * 0.5 };
        webVars.setVector3("variable.direction", normalize(d));
        webVars.setFloat("variable.length", dist / 2); // half-extent: billboard grows from the midpoint
        try {
            player.dimension.spawnParticle(WEB_PARTICLE, mid, webVars);
        } catch { /* particle not yet registered */ }
    }

    shootWeb(player) 
    {
        const now = system.currentTick;
        const last = this.lastShot.get(player.id) ?? -1000;
        if (now - last < SHOOT_COOLDOWN) {
            player.onScreenDisplay.setActionBar(`§7Wait ${SHOOT_COOLDOWN - (now - last)} more tick(s)`);
            return;
        }
        this.lastShot.set(player.id, now);

        const hit = this.getSpherecastHit(player);
        const head = player.getHeadLocation();

        if (!hit) {
            player.onScreenDisplay.setActionBar("§7No Surface Found");
            player.dimension.playSound("random.bow", head, { volume: 0.3, pitch: 1.8 });
            return;
        }

        const b = hit.block.location;
        const f = "faceLocation" in hit ? hit.faceLocation : { x: 0.5, y: 0.5, z: 0.5 };
        const anchor = { x: b.x + f.x, y: b.y + f.y, z: b.z + f.z };
        const ropeLen = this.len({ x: anchor.x - head.x, y: anchor.y - head.y, z: anchor.z - head.z });
        const initNormal = this.normalize({ x: head.x - anchor.x, y: head.y - anchor.y, z: head.z - anchor.z });

        this.webs.set(player.id, { anchor, ropeLen, initNormal });
        player.dimension.playSound("mob.spider.say", head, { volume: 0.6, pitch: 1.7 });
    }

    release(player, fling, customDir) {
        if (!this.webs.has(player.id)) return;
        this.webs.delete(player.id);
        if (fling) {
            const flingDir = customDir ?? player.getViewDirection();
            player.applyKnockback(
                { x: flingDir.x * RELEASE_FLING, z: flingDir.z * RELEASE_FLING },
                Math.min(flingDir.y, 0.3) * RELEASE_FLING,
            );
            player.onScreenDisplay.setActionBar("§7 released");
        } else {
            player.onScreenDisplay.setActionBar("");
        }
    }

    stillHoldingWeb(player) {
        const eq = player.getComponent("minecraft:equippable");
        const main = eq?.getEquipmentSlot("Mainhand");
        return main?.hasItem() && main.typeId === WEB_ITEM;
    }
}