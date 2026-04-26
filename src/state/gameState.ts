import {
  DEFAULT_PLAYER_COUNT,
  DEFAULT_ROUNDS,
  STORAGE_KEY
} from '../domain/constants';
import type { RoundInput } from '../domain/score';

export type Player = { id: string; name: string };

export type PersistedV1 = {
  version: 1;
  roundCount: number;
  players: Player[];
  /**
   * round(1..N) → playerId → 입력
   * round 키는 "1".."N" 문자열
   */
  cells: Record<string, Record<string, RoundInput>>;
};

function emptyInput(): RoundInput {
  return {
    bid: null,
    taken: null,
    mermaidCatchesSkullKing: false,
    piratesCatchMermaids: 0,
    skullKingPiratesCaught: 0,
    standard14sCaptured: 0,
    black14sCaptured: 0,
    lootAlliances: 0,
    rascalWager: 0,
    manualOverridePoints: null
  };
}

export function createDefaultPlayerName(index1: number) {
  return `플레이어 ${index1}`;
}

export function createDefaultPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: createDefaultPlayerName(i + 1)
  }));
}

export function makeInitialState(over: Partial<PersistedV1> = {}): PersistedV1 {
  const roundCount = over.roundCount ?? DEFAULT_ROUNDS;
  const players = over.players?.length
    ? over.players
    : createDefaultPlayers(DEFAULT_PLAYER_COUNT);
  return {
    version: 1,
    roundCount,
    players,
    cells: over.cells ?? {}
  };
}

export function getCell(
  state: PersistedV1,
  round: number,
  playerId: string
): RoundInput {
  const key = String(round);
  return { ...emptyInput(), ...state.cells[key]?.[playerId] };
}

export function withCell(
  state: PersistedV1,
  round: number,
  playerId: string,
  patch: Partial<RoundInput>
): PersistedV1 {
  const k = String(round);
  const next = { ...getCell(state, round, playerId), ...patch };
  return {
    ...state,
    cells: {
      ...state.cells,
      [k]: { ...state.cells[k], [playerId]: next }
    }
  };
}

export function loadFromStorage(): PersistedV1 {
  if (typeof localStorage === 'undefined') {
    return makeInitialState();
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return makeInitialState();
  }
  try {
    const p = JSON.parse(raw) as PersistedV1;
    if (p?.version !== 1 || !Array.isArray(p.players) || p.players.length < 1) {
      return makeInitialState();
    }
    if (typeof p.roundCount !== 'number' || p.roundCount < 1) {
      return makeInitialState();
    }
    if (!p.cells) p.cells = {};
    return p;
  } catch {
    return makeInitialState();
  }
}

export function saveToStorage(state: PersistedV1) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * 플레이어 목록·총 라운드가 바뀌었을 때 셀을 이어받기만 합니다(없는 칸은 빈 값).
 * 제거된 플레이어/라운드 셀은 드롭됩니다.
 */
export function mergePlayersAndRounds(
  prev: PersistedV1,
  nextPlayers: Player[],
  roundCount: number
): PersistedV1 {
  const cells: Record<string, Record<string, RoundInput>> = {};
  for (let r = 1; r <= roundCount; r += 1) {
    const k = String(r);
    const row: Record<string, RoundInput> = {};
    for (const p of nextPlayers) {
      const before = prev.cells[k]?.[p.id];
      row[p.id] = { ...emptyInput(), ...before };
    }
    cells[k] = row;
  }
  return { version: 1, roundCount, players: nextPlayers, cells };
}
