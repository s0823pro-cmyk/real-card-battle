import bgEventLostItem from '../assets/backgrounds/lost_item.png';
import bgEventCatCafe from '../assets/backgrounds/bg_event_cat_cafe.png';
import bgEventStreetMusician from '../assets/backgrounds/bg_event_street_musician.png';
import bgEventVendingMachine from '../assets/backgrounds/bg_event_vending_machine.png';
import bgEventTraining from '../assets/backgrounds/bg_event_training.png';
import bgEventShrineCharm from '../assets/backgrounds/bg_event_shrine_charm.png';
import bgEventDrinking from '../assets/backgrounds/bg_event_drinking.png';
import bgEventFoundMoney from '../assets/backgrounds/bg_event_found_money.png';
import bgEventGoodMood from '../assets/backgrounds/bg_event_good_mood.png';
import bgEventHealth from '../assets/backgrounds/bg_event_health.png';
import bgEventLostWallet from '../assets/backgrounds/bg_event_lost_wallet.png';
import bgEventBadMemory from '../assets/backgrounds/bg_event_bad_memory.png';
import bgEventTripped from '../assets/backgrounds/bg_event_tripped.png';
import bgEventParkNap from '../assets/backgrounds/bg_event_park_nap.png';
import bgEventStrayCat from '../assets/backgrounds/bg_event_stray_cat.png';
import bgEventConvenience from '../assets/backgrounds/bg_event_convenience.png';
import bgEventLostWay from '../assets/backgrounds/bg_event_lost_way.png';
import bgEventAcquaintance from '../assets/backgrounds/bg_event_acquaintance.png';
import bgEventCheapTools from '../assets/backgrounds/bg_event_cheap_tools.png';
import bgEventSuspiciousJob from '../assets/backgrounds/bg_event_suspicious_job.png';
import bgEventHungry from '../assets/backgrounds/bg_event_hungry.png';
import bgEventGambling from '../assets/backgrounds/bg_event_gambling.png';
import bgEventWorkLimit from '../assets/backgrounds/bg_event_work_limit.png';
import bgEventMysteryMedicine from '../assets/backgrounds/bg_event_mystery_medicine.png';
import bgEventOmamoriMerchant from '../assets/backgrounds/bg_event_omamori_merchant.png';

/** `event.id` → 背景画像（未設定は undefined＝黒背景のまま） */
export const EVENT_BACKGROUND_BY_ID: Record<string, string> = {
  lost_item: bgEventLostItem,
  cat_cafe: bgEventCatCafe,
  street_musician: bgEventStreetMusician,
  vending_machine: bgEventVendingMachine,
  training: bgEventTraining,
  shrine_lucky_charm: bgEventShrineCharm,
  drinking_party: bgEventDrinking,
  found_money: bgEventFoundMoney,
  good_mood: bgEventGoodMood,
  health_checkup: bgEventHealth,
  lost_wallet: bgEventLostWallet,
  bad_memory: bgEventBadMemory,
  tripped: bgEventTripped,
  park_nap: bgEventParkNap,
  stray_cat: bgEventStrayCat,
  convenience_win: bgEventConvenience,
  lost_way: bgEventLostWay,
  friend_encounter: bgEventAcquaintance,
  cheap_tools_sale: bgEventCheapTools,
  suspicious_parttime: bgEventSuspiciousJob,
  hungry_starving: bgEventHungry,
  gambling_invite: bgEventGambling,
  work_to_limit: bgEventWorkLimit,
  mystery_medicine: bgEventMysteryMedicine,
  omamori_merchant: bgEventOmamoriMerchant,
};

export const getEventBackgroundUrl = (eventId: string): string | undefined => EVENT_BACKGROUND_BY_ID[eventId];
