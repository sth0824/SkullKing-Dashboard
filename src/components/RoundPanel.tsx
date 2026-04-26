import { calcRoundPoints, isRoundTakeSumValid, type RoundInput } from '../domain/score';
import { getCell, type Player, type PersistedV1 } from '../state/gameState';

type Props = {
  round: number;
  state: PersistedV1;
  onPatch: (playerId: string, patch: Partial<RoundInput>) => void;
};

function parseIntOrNull(s: string): number | null {
  if (s.trim() === '') {
    return null;
  }
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) {
    return null;
  }
  return Math.max(0, n);
}

function formatMaybe(n: number | null) {
  if (n === null) {
    return '—';
  }
  if (n > 0) {
    return `+${n}`;
  }
  return String(n);
}

export function RoundPanel({ round, state, onPatch }: Props) {
  const takes = state.players.map((p) => getCell(state, round, p.id).taken);
  const allTakesIn = takes.every((t) => t !== null);
  const { ok, sum } = allTakesIn
    ? isRoundTakeSumValid(
        round,
        takes.map((t) => t as number)
      )
    : { ok: true, sum: 0 };
  const showTakeWarning = allTakesIn && !ok;

  return (
    <div className="roundPanel">
      {showTakeWarning && (
        <p className="roundWarn" role="status">
          이 라운드 &apos;실제&apos; 합이 {round}이어야 합니다(현재 합: {sum}).
        </p>
      )}
      <div className="tableScroll">
        <table className="roundTable" aria-label={`${round}라운드`}>
          <thead>
            <tr>
              <th scope="col" className="thName">
                플레이어
              </th>
              <th scope="col">입찰</th>
              <th scope="col">실제</th>
              <th scope="col" className="thBonus">
                보너스
              </th>
              <th scope="col" className="thPts">
                점수
              </th>
            </tr>
          </thead>
          <tbody>
            {state.players.map((p) => (
              <Row
                key={p.id}
                player={p}
                round={round}
                state={state}
                onPatch={(patch) => onPatch(p.id, patch)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type RowP = {
  player: Player;
  round: number;
  state: PersistedV1;
  onPatch: (patch: Partial<RoundInput>) => void;
};

function Row({ player, round, state, onPatch }: RowP) {
  const cell = getCell(state, round, player.id);
  const br = calcRoundPoints(round, cell);
  const bidStr = cell.bid === null ? '' : String(cell.bid);
  const takeStr = cell.taken === null ? '' : String(cell.taken);
  const isManual = cell.manualOverridePoints !== null;
  const takeMax = round;

  return (
    <tr>
      <td className="tdName">{player.name}</td>
      <td>
        <input
          className="numIn"
          inputMode="numeric"
          type="number"
          min={0}
          max={takeMax}
          aria-label={`${player.name} 입찰`}
          value={bidStr}
          onChange={(e) => onPatch({ bid: parseIntOrNull(e.target.value) })}
        />
      </td>
      <td>
        <input
          className="numIn"
          inputMode="numeric"
          type="number"
          min={0}
          max={takeMax}
          aria-label={`${player.name} 실제`}
          value={takeStr}
          onChange={(e) => onPatch({ taken: parseIntOrNull(e.target.value) })}
        />
      </td>
      <td className="tdBonus">
        {isManual ? (
          <span className="muted">수동</span>
        ) : (
          <div className="bonusGroup">
            <label className="checkLabel">
              <input
                type="checkbox"
                checked={cell.mermaidCatchesSkullKing}
                onChange={(e) => onPatch({ mermaidCatchesSkullKing: e.target.checked })}
                disabled={cell.bid === null || cell.bid < 1}
              />
              <span>인어→스컬킹</span>
            </label>
            <label className="inlineN">
              <span className="pirateLabel">해적</span>
              <input
                className="pirateIn"
                type="number"
                min={0}
                max={14}
                aria-label={`${player.name} 스컬킹으로 잡은 해적 수`}
                value={cell.skullKingPiratesCaught}
                onChange={(e) => {
                  const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                  onPatch({ skullKingPiratesCaught: n });
                }}
                disabled={cell.bid === null || cell.bid < 1}
              />
            </label>
          </div>
        )}
        <label className="checkLabel manualToggle">
          <input
            type="checkbox"
            checked={isManual}
            onChange={(e) => {
              if (e.target.checked) {
                onPatch({ manualOverridePoints: br.total ?? 0 });
              } else {
                onPatch({ manualOverridePoints: null });
              }
            }}
          />
          <span>수동 점수</span>
        </label>
        {isManual && (
          <input
            className="manualIn"
            type="number"
            inputMode="numeric"
            value={cell.manualOverridePoints ?? 0}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value) || 0);
              onPatch({ manualOverridePoints: n });
            }}
          />
        )}
      </td>
      <td>
        <span
          className={`ptCell ${br.total !== null && br.total < 0 ? 'ptNeg' : 'ptPos'}`}
        >
          {formatMaybe(br.total)}
        </span>
      </td>
    </tr>
  );
}

