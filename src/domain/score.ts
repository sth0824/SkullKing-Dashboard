import {
  BONUS_MERMAID_CATCHES_SKULL_KING,
  BONUS_PER_PIRATE_CAUGHT,
  PENALTY_PER_TRICK,
  POINTS_PER_TRICK,
  ZERO_BID_MULTIPLIER
} from './constants';

/** 한 플레이어의 한 라운드에 대한 입력 */
export type RoundInput = {
  /** 입찰(예측)한 트릙 수, 미입력은 null */
  bid: number | null;
  /** 실제로 가져온 트릙 수, 미입력은 null */
  taken: number | null;
  /** 인어가 스컬킹을 잡은 보너스(입찰이 정확할 때만 적용) */
  mermaidCatchesSkullKing: boolean;
  /** 스컬킹으로 잡은 해적 수(입찰이 정확할 때만 적용) */
  skullKingPiratesCaught: number;
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
  const taken = toNumberOrNull(input.taken, null);
  if (bid === null || taken === null) {
    return { total: null, baseRule: 'none', usedManual: false };
  }

  if (roundNumber < 1) {
    // 비정상이어도 0라운드로 취급하지 않고, 호출 측에서 round를 보정한다고 가정
    return { total: 0, baseRule: 'none', usedManual: false };
  }

  if (bid === 0) {
    // 0트릙 입찰: 성공/실패만 봄(보너스·트릙×20은 적용되지 않음)
    if (taken === 0) {
      return {
        total: roundNumber * ZERO_BID_MULTIPLIER,
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

  if (bid === taken) {
    const base = bid * POINTS_PER_TRICK;
    const bonusMermaid = input.mermaidCatchesSkullKing ? BONUS_MERMAID_CATCHES_SKULL_KING : 0;
    const bonusPirates = Math.max(0, input.skullKingPiratesCaught) * BONUS_PER_PIRATE_CAUGHT;
    return {
      total: base + bonusMermaid + bonusPirates,
      baseRule: 'standard',
      usedManual: false
    };
  }

  return {
    total: -Math.abs(bid - taken) * PENALTY_PER_TRICK,
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
