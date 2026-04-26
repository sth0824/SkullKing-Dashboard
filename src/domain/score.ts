import {
  BONUS_FIRST_MATE_CAPTURE,
  BONUS_PER_BLACK_14,
  BONUS_PER_DAVY_JONES_MARINE,
  BONUS_PER_LOOT_ALLIANCE,
  BONUS_PER_MERMAID_CAUGHT_BY_PIRATE,
  BONUS_MERMAID_CATCHES_SKULL_KING,
  BONUS_PER_PIRATE_CAUGHT,
  BONUS_PER_STANDARD_14,
  PENALTY_PER_TRICK,
  POINTS_PER_TRICK,
  ZERO_BID_MULTIPLIER
} from './constants';

/** 한 플레이어의 한 라운드에 대한 입력 */
export type RoundInput = {
  /** 입찰(예측)한 트릭 수, 미입력은 null */
  bid: number | null;
  /** 실제로 가져온 트릭 수, 미입력은 null */
  taken: number | null;
  /** 인어가 스컬킹을 잡은 보너스(입찰이 정확할 때만 적용) */
  mermaidCatchesSkullKing: boolean;
  /** 해적으로 잡은 인어 수(입찰이 정확할 때만 적용) */
  piratesCatchMermaids: number;
  /** 스컬킹으로 잡은 해적 수(입찰이 정확할 때만 적용) */
  skullKingPiratesCaught: number;
  /** 잡은 일반 14 수(초록/보라/노랑 합계, 입찰이 정확할 때만 적용) */
  standard14sCaptured: number;
  /** 잡은 검정 14 수(입찰이 정확할 때만 적용) */
  black14sCaptured: number;
  /** Loot 동맹 보너스 횟수(입찰이 정확할 때만 적용) */
  lootAlliances: number;
  /**
   * Rascal wager 보정 점수입니다.
   * 입찰이 정확하면 +값, 실패하면 -값으로 자동 처리합니다.
   */
  rascalWager: number;
  /**
   * 해적 능력 등으로 채점용 실제 트릭 수를 보정합니다(물리 트릭 `taken`은 그대로 두고 합산 검증에만 사용).
   * -1, 0, +1 등 소수 범위를 권장합니다.
   */
  takenDelta: number;
  /** 카드/특수 상황 등 임의 가감 점수(1+ 입찰 성공 시에만 합산). */
  extraBonusPoints: number;
  /** 인어+스컬킹으로 1등 항해사를 잡은 보너스(1+ 입찰 성공 시에만). */
  firstMateBonus: boolean;
  /** 데이빗 존스로 잡은 해양생물 수(1+ 입찰 성공 시에만). */
  davyJonesMarineCount: number;
  /**
   * 자동 계산을 무시하고 이 라운드 총점을 직접 지정합니다(특수 상황·하우스 룰).
   * 숫자로 설정돼 있으면 다른 자동 점수 필드는 무시합니다.
   */
  manualOverridePoints: number | null;
};

export type RoundPointsBreakdown = {
  /** UI에 그대로 표시할 총점(미입력은 null) */
  total: number | null;
  baseRule: 'zero' | 'standard' | 'none';
  /** 수동 덮어쓰기 여부 */
  usedManual: boolean;
};

function toNumberOrNull(v: number | null | undefined, fallback: number | null = null) {
  if (v === null || v === undefined) return fallback;
  if (Number.isNaN(v)) return fallback;
  return v;
}

/** 채점에 쓰는 실제 트릭 수(물리 트릭 + 보정, 라운드 범위로 클램프) */
export function effectiveTaken(rawTaken: number, takenDelta: number, roundNumber: number): number {
  const d = Number.isFinite(takenDelta) ? Math.round(takenDelta) : 0;
  const v = rawTaken + d;
  return Math.min(roundNumber, Math.max(0, v));
}

/**
 * 1인분 라운드 점수를 계산합니다.
 * bid·taken이 하나라도 null이면 합산에 쓰지 않도록 total은 null로 둡니다.
 */
export function calcRoundPoints(
  roundNumber: number,
  input: RoundInput
): RoundPointsBreakdown {
  if (input.manualOverridePoints !== null) {
    return {
      total: input.manualOverridePoints,
      baseRule: 'none',
      usedManual: true
    };
  }

  const bid = toNumberOrNull(input.bid, null);
  const takenRaw = toNumberOrNull(input.taken, null);
  if (bid === null || takenRaw === null) {
    return { total: null, baseRule: 'none', usedManual: false };
  }

  const delta = toNumberOrNull(input.takenDelta, 0) ?? 0;
  const takenEff = effectiveTaken(takenRaw, delta, roundNumber);

  if (roundNumber < 1) {
    // 비정상이어도 0라운드로 취급하지 않고, 호출 측에서 round를 보정한다고 가정
    return { total: 0, baseRule: 'none', usedManual: false };
  }

  if (bid === 0) {
    // 0트릭 입찰: 성공 시 동맹 보너스만 추가로 합산합니다
    if (takenEff === 0) {
      const bonusLoot = Math.max(0, input.lootAlliances) * BONUS_PER_LOOT_ALLIANCE;
      return {
        total: roundNumber * ZERO_BID_MULTIPLIER + bonusLoot,
        baseRule: 'zero',
        usedManual: false
      };
    }
    return {
      total: -roundNumber * ZERO_BID_MULTIPLIER,
      baseRule: 'zero',
      usedManual: false
    };
  }

  const extraBonus = Number.isFinite(input.extraBonusPoints)
    ? Math.round(input.extraBonusPoints)
    : 0;
  const bonusFirstMate = input.firstMateBonus ? BONUS_FIRST_MATE_CAPTURE : 0;
  const bonusDavy =
    Math.max(0, Math.round(toNumberOrNull(input.davyJonesMarineCount, 0) ?? 0)) *
    BONUS_PER_DAVY_JONES_MARINE;

  if (bid === takenEff) {
    const base = bid * POINTS_PER_TRICK;
    const bonusMermaid = input.mermaidCatchesSkullKing ? BONUS_MERMAID_CATCHES_SKULL_KING : 0;
    const bonusPirateMermaids =
      Math.max(0, input.piratesCatchMermaids) * BONUS_PER_MERMAID_CAUGHT_BY_PIRATE;
    const bonusPirates = Math.max(0, input.skullKingPiratesCaught) * BONUS_PER_PIRATE_CAUGHT;
    const bonusStandard14 = Math.max(0, input.standard14sCaptured) * BONUS_PER_STANDARD_14;
    const bonusBlack14 = Math.max(0, input.black14sCaptured) * BONUS_PER_BLACK_14;
    const bonusLoot = Math.max(0, input.lootAlliances) * BONUS_PER_LOOT_ALLIANCE;
    const rascal = Math.max(0, input.rascalWager);
    return {
      total:
        base +
        bonusMermaid +
        bonusPirateMermaids +
        bonusPirates +
        bonusStandard14 +
        bonusBlack14 +
        bonusLoot +
        rascal +
        extraBonus +
        bonusFirstMate +
        bonusDavy,
      baseRule: 'standard',
      usedManual: false
    };
  }

  const mismatchPenalty = -Math.abs(bid - takenEff) * PENALTY_PER_TRICK;
  const rascalPenalty = -Math.max(0, input.rascalWager);
  return {
    total: mismatchPenalty + rascalPenalty,
    baseRule: 'standard',
    usedManual: false
  };
}

/** 여러 플레이어 라운드 점수(미기입 null 제외) 합산 */
export function sumPlayerTotals(
  byRound: Array<{ round: number; points: RoundPointsBreakdown }>
): number {
  let s = 0;
  for (const r of byRound) {
    if (r.points.total !== null) s += r.points.total;
  }
  return s;
}

/** 라운드 r에서 전 플레이어가 낸 taken 합이 r이어야 합니다(정상 플레이). */
export function isRoundTakeSumValid(
  roundNumber: number,
  takes: number[]
): { ok: boolean; sum: number } {
  const sum = takes.reduce((a, b) => a + b, 0);
  return { ok: sum === roundNumber, sum };
}

export function buildPlayerTotal(
  roundCount: number,
  getInput: (roundIndex1: number) => RoundInput
): { total: number; roundsScored: number } {
  let total = 0;
  let roundsScored = 0;
  for (let r = 1; r <= roundCount; r += 1) {
    const p = calcRoundPoints(r, getInput(r));
    if (p.total !== null) {
      total += p.total;
      roundsScored += 1;
    }
  }
  return { total, roundsScored };
}
