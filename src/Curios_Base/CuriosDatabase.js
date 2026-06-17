// --- PASSIVE RELICS ---
// We use ../ to go out of Curios_Base and into Passive_Relic
import { InvisicloakLogic } from "../Passive_Relic/InvisicloakLogic.js";
import { HolyVoiceLogic } from "../Passive_Relic/HolyVoiceLogic.js";

// --- ACTIVE RELICS ---
// We use ../ to go out of Curios_Base and into Active_Relic
import { SpiderBraceletLogic } from "../Active_Relic/SpiderBraceletLogic.js";

/**
 * All registered relic logic instances.
 * The Hub Engine (CuriosEvent) will automatically wire these into the Curios API.
 */
export const Relics = [
    new InvisicloakLogic(),
    new HolyVoiceLogic(),
    new SpiderBraceletLogic() 
];