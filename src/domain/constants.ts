/** 트릭 1회당 점수 (1 이상 입찰 성공 시) */
export const POINTS_PER_TRICK = 20;
/** 입찰 실패 시 |차이| 1마다 감점 */
export const PENALTY_PER_TRICK = 10;
/** 인어가 스컬킹을 잡은 경우(입찰 정확 + 보너스 on) */
export const BONUS_MERMAID_CATCHES_SKULL_KING = 50;
/** 스컬킹으로 잡은 해적 카드 1장당(입찰 정확 시) */
export const BONUS_PER_PIRATE_CAUGHT = 30;
/** 0트릙 입찭 성공/실패 시 라운드마다 ×하는 배수 */
export const ZERO_BID_MULTIPLIER = 10;
/** localStorage 키 */
export const STORAGE_KEY = 'skull-king-scoreboard-v1';
/** 기본 총 라운드 */
export const DEFAULT_ROUNDS = 10;
/** 기본 플레이어 수(새 게임) */
export const DEFAULT_PLAYER_COUNT = 4;
