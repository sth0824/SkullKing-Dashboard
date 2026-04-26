/** 트릭 1회당 점수 (1 이상 입찰 성공 시) */
export const POINTS_PER_TRICK = 20;
/** 입찰 실패 시 |차이| 1마다 감점 */
export const PENALTY_PER_TRICK = 10;
/** 인어가 스컬킹을 잡은 경우 보너스입니다. */
export const BONUS_MERMAID_CATCHES_SKULL_KING = 40;
/** 해적으로 인어를 잡은 장수당 보너스입니다. */
export const BONUS_PER_MERMAID_CAUGHT_BY_PIRATE = 20;
/** 스컬킹으로 잡은 해적 카드 1장당(입찰 정확 시) */
export const BONUS_PER_PIRATE_CAUGHT = 30;
/** 일반 14(노랑/보라/초록) 한 장당 보너스입니다. */
export const BONUS_PER_STANDARD_14 = 10;
/** 검정 14 한 장당 보너스입니다. */
export const BONUS_PER_BLACK_14 = 20;
/** Loot 동맹 1회 성립 시 보너스입니다. */
export const BONUS_PER_LOOT_ALLIANCE = 20;
/** 인어+스컬킹으로 1등 항해사를 잡은 경우 보너스입니다. */
export const BONUS_FIRST_MATE_CAPTURE = 30;
/** 데이빗 존스로 해양생물 1장당 보너스입니다. */
export const BONUS_PER_DAVY_JONES_MARINE = 20;
/** 0트릙 입찭 성공/실패 시 라운드마다 ×하는 배수 */
export const ZERO_BID_MULTIPLIER = 10;
/** localStorage 키 */
export const STORAGE_KEY = 'skull-king-scoreboard-v1';
/** 기본 총 라운드 */
export const DEFAULT_ROUNDS = 10;
/** 기본 플레이어 수(새 게임) */
export const DEFAULT_PLAYER_COUNT = 4;
