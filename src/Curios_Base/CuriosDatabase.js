// --- PASSIVE RELICS ---
import { InvisicloakLogic } from "../Passive_Relic/InvisicloakLogic.js";
import { HolyVoiceLogic } from "../Passive_Relic/HolyVoiceLogic.js";
import { RageWatchLogic } from "../Passive_Relic/RageWatchLogic.js";
import { TorchPlacerLogic } from "../Passive_Relic/TorchPlacerLogic.js";
import { EnderBeltLogic } from "../Passive_Relic/EnderBeltLogic.js";

// --- ACTIVE RELICS ---
import { SpiderBraceletLogic } from "../Active_Relic/SpiderBraceletLogic.js";

// --- EVOLVE RELICS ---
import { AncientBadgeLogic } from "../Evolve_Relic/AncientBadgeLogic.js";
import { MagicBadgeLogic } from "../Evolve_Relic/MagicBadgeLogic.js";
import { HeroBadgeLogic } from "../Evolve_Relic/HeroBadgeLogic.js";
import { FallenBeliefLogic } from "../Evolve_Relic/FallenBeliefLogic.js";
import { MadeInHeavenLogic } from "../Evolve_Relic/MadeInHeavenLogic.js";



/**
 * All registered relic logic instances.
 * The Hub Engine (CuriosEvent) will automatically wire these into the Curios API.
 */
export const Relics = [
    new InvisicloakLogic(),
    new HolyVoiceLogic(),
    new RageWatchLogic(),
    new TorchPlacerLogic(),
    new EnderBeltLogic(),

    new SpiderBraceletLogic(),

    new AncientBadgeLogic(),
    new MagicBadgeLogic(),
    new HeroBadgeLogic(),
    new FallenBeliefLogic(),
    new MadeInHeavenLogic()
];