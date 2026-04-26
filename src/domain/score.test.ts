import { describe, expect, it } from 'vitest';
import {
  BONUS_FIRST_MATE_CAPTURE,
  BONUS_PER_BLACK_14,
  BONUS_PER_DAVY_JONES_MARINE,
  BONUS_PER_LOOT_ALLIANCE,
  BONUS_PER_MERMAID_CAUGHT_BY_PIRATE,
  BONUS_MERMAID_CATCHES_SKULL_KING,
  BONUS_PER_PIRATE_CAUGHT
} from './constants';
import {
  calcRoundPoints,
  effectiveTaken,
  isRoundTakeSumValid,
  type RoundInput
} from './score';

const base = (over: Partial<RoundInput> = {}): RoundInput => ({
  bid: 1,
  taken: 1,
  mermaidCatchesSkullKing: false,
  piratesCatchMermaids: 0,
  skullKingPiratesCaught: 0,
  standard14sCaptured: 0,
  black14sCaptured: 0,
  lootAlliances: 0,
  rascalWager: 0,
  takenDelta: 0,
  extraBonusPoints: 0,
  firstMateBonus: false,
  davyJonesMarineCount: 0,
  manualOverridePoints: null,
  ...over
});

describe('calcRoundPoints', () => {
  it('0입찰 성공 시 +라운드×10 (5라운드 → 50)', () => {
    const r = calcRoundPoints(5, base({ bid: 0, taken: 0 }));
    expect(r.total).toBe(50);
    expect(r.baseRule).toBe('zero');
  });

  it('0입찰 실패 시 -라운드×10 (5라운드, 1트릭)', () => {
    const r = calcRoundPoints(5, base({ bid: 0, taken: 1 }));
    expect(r.total).toBe(-50);
  });

  it('1 이상 입찰 정확 시 트릭당 20점 (2트릭 → 40)', () => {
    const r = calcRoundPoints(3, base({ bid: 2, taken: 2 }));
    expect(r.total).toBe(40);
  });

  it('정확할 때 보너스 합산(인어+스컬킹, 해적 2)', () => {
    const r = calcRoundPoints(
      2,
      base({
        bid: 2,
        taken: 2,
        mermaidCatchesSkullKing: true,
        skullKingPiratesCaught: 2
      })
    );
    expect(r.total).toBe(
      2 * 20 + BONUS_MERMAID_CATCHES_SKULL_KING + 2 * BONUS_PER_PIRATE_CAUGHT
    );
  });

  it('확장 보너스(해적→인어, 14, Loot) 합산', () => {
    const r = calcRoundPoints(
      6,
      base({
        bid: 3,
        taken: 3,
        piratesCatchMermaids: 1,
        standard14sCaptured: 2,
        black14sCaptured: 1,
        lootAlliances: 1
      })
    );
    expect(r.total).toBe(
      3 * 20 +
        BONUS_PER_MERMAID_CAUGHT_BY_PIRATE +
        2 * 10 +
        BONUS_PER_BLACK_14 +
        BONUS_PER_LOOT_ALLIANCE
    );
  });

  it('Rascal wager는 성공 시 가산', () => {
    const r = calcRoundPoints(4, base({ bid: 1, taken: 1, rascalWager: 20 }));
    expect(r.total).toBe(40);
  });

  it('Rascal wager는 실패 시 감산', () => {
    const r = calcRoundPoints(4, base({ bid: 1, taken: 2, rascalWager: 20 }));
    expect(r.total).toBe(-30);
  });

  it('불일치 시 |차이|×10 감점(입3 실4 → -10)', () => {
    const r = calcRoundPoints(4, base({ bid: 3, taken: 4 }));
    expect(r.total).toBe(-10);
  });

  it('불일치 시 보너스 미적용(해적/인어 켜도 0으로 취급)', () => {
    const r = calcRoundPoints(
      4,
      base({
        bid: 1,
        taken: 2,
        mermaidCatchesSkullKing: true,
        skullKingPiratesCaught: 3
      })
    );
    expect(r.total).toBe(-10);
  });

  it('bid/taken 중 하나 null이면 합산용 null', () => {
    expect(calcRoundPoints(1, base({ bid: null, taken: 0 })).total).toBeNull();
    expect(calcRoundPoints(1, base({ bid: 0, taken: null })).total).toBeNull();
  });

  it('isRoundTakeSumValid: taken 합이 라운드와 같을 때 ok', () => {
    expect(isRoundTakeSumValid(3, [0, 1, 1, 1]).ok).toBe(true);
    expect(isRoundTakeSumValid(3, [1, 1, 1]).ok).toBe(true);
  });

  it('isRoundTakeSumValid: 합이 틀리면 ok=false', () => {
    expect(isRoundTakeSumValid(2, [1, 0, 0, 0]).ok).toBe(false);
  });

  it('manualOverridePoints가 있으면 그 값이 최종(다른 값 무시)', () => {
    const r = calcRoundPoints(10, {
      ...base({ bid: 0, taken: 5, manualOverridePoints: 99 }),
      manualOverridePoints: 99
    });
    expect(r.total).toBe(99);
    expect(r.usedManual).toBe(true);
  });

  it('takenDelta로 채점용 실제를 맞추면 입찰 성공으로 처리', () => {
    const r = calcRoundPoints(5, base({ bid: 3, taken: 2, takenDelta: 1 }));
    expect(r.total).toBe(60);
    expect(r.baseRule).toBe('standard');
  });

  it('0입찰 성공: 물리 1트릭 + 보정 −1이면 채점 0으로 성공', () => {
    const r = calcRoundPoints(4, base({ bid: 0, taken: 1, takenDelta: -1 }));
    expect(r.total).toBe(40);
    expect(r.baseRule).toBe('zero');
  });

  it('추가 보너스·1등 항해사·데이빗은 1+ 성공 시만 합산', () => {
    const r = calcRoundPoints(
      3,
      base({
        bid: 2,
        taken: 2,
        extraBonusPoints: -5,
        firstMateBonus: true,
        davyJonesMarineCount: 1
      })
    );
    expect(r.total).toBe(
      40 - 5 + BONUS_FIRST_MATE_CAPTURE + BONUS_PER_DAVY_JONES_MARINE
    );
  });

  it('입찰 실패 시 추가 보너스 미적용', () => {
    const r = calcRoundPoints(
      3,
      base({
        bid: 2,
        taken: 0,
        extraBonusPoints: 50,
        firstMateBonus: true,
        davyJonesMarineCount: 2
      })
    );
    expect(r.total).toBe(-20);
  });

  it('effectiveTaken은 라운드 범위로 클램프', () => {
    expect(effectiveTaken(2, 5, 4)).toBe(4);
    expect(effectiveTaken(1, -3, 5)).toBe(0);
  });
});
