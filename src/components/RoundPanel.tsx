import { useState } from 'react';
import { calcRoundPoints, isRoundTakeSumValid, type RoundInput } from '../domain/score';
import { getCell, type Player, type PersistedV1 } from '../state/gameState';

type Props = {
  round: number;
  state: PersistedV1;
  onPatch: (playerId: string, patch: Partial<RoundInput>) => void;
};

function formatMaybe(n: number | null) {
  if (n === null) return '—';
  if (n > 0) return `+${n}`;
  return String(n);
}

type StepperProps = {
  value: number | null;
  min?: number;
  max: number;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  size?: 'lg' | 'md';
  nullable?: boolean;
  className?: string;
};

function Stepper({
  value,
  min = 0,
  max,
  onChange,
  disabled = false,
  size = 'md',
  nullable = false,
  className,
}: StepperProps) {
  const handleDec = () => {
    if (value === null) return;
    if (nullable && value === min) onChange(null);
    else onChange(Math.max(min, value - 1));
  };

  const handleInc = () => {
    if (value === null) onChange(min);
    else onChange(Math.min(max, value + 1));
  };

  const canDec = !disabled && value !== null;
  const canInc = !disabled && (value === null || value < max);

  return (
    <div className={`stepper stepper--${size}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="stepperBtn"
        onClick={handleDec}
        disabled={!canDec}
        aria-label="감소"
      >
        −
      </button>
      <span className={`stepperVal${value === null ? ' stepperVal--null' : ''}`}>
        {value === null ? '—' : value}
      </span>
      <button
        type="button"
        className="stepperBtn"
        onClick={handleInc}
        disabled={!canInc}
        aria-label="증가"
      >
        +
      </button>
    </div>
  );
}

export function RoundPanel({ round, state, onPatch }: Props) {
  const takes = state.players.map((p) => getCell(state, round, p.id).taken);
  const allTakesIn = takes.every((t) => t !== null);
  const { ok, sum } = allTakesIn
    ? isRoundTakeSumValid(
        round,
        takes.map((t) => t as number),
      )
    : { ok: true, sum: 0 };
  const showTakeWarning = allTakesIn && !ok;

  return (
    <div className="roundPanel">
      {showTakeWarning && (
        <p className="roundWarn" role="status">
          ⚠️ '실제' 합이 {round}이어야 합니다 (현재: {sum})
        </p>
      )}
      {state.players.map((p) => (
        <PlayerCard
          key={p.id}
          player={p}
          round={round}
          state={state}
          onPatch={(patch) => onPatch(p.id, patch)}
        />
      ))}
    </div>
  );
}

type CardProps = {
  player: Player;
  round: number;
  state: PersistedV1;
  onPatch: (patch: Partial<RoundInput>) => void;
};

function PlayerCard({ player, round, state, onPatch }: CardProps) {
  const cell = getCell(state, round, player.id);
  const br = calcRoundPoints(round, cell);
  const isManual = cell.manualOverridePoints !== null;
  const bonusDisabled = cell.bid === null || cell.bid < 1;
  const [bonusOpen, setBonusOpen] = useState(false);

  const scoreClass =
    br.total === null ? 'ptNull' : br.total < 0 ? 'ptNeg' : 'ptPos';

  return (
    <div className="playerCard">
      {/* ── Card header ── */}
      <div className="playerCardHeader">
        <span className="playerCardName">{player.name}</span>
        <span className={`playerCardScore ${scoreClass}`}>{formatMaybe(br.total)}</span>
      </div>

      <div className="playerCardBody">
        {/* ── Bid / Taken ── */}
        <div className="bidTakenRow">
          <div className="bidTakenItem">
            <span className="bidTakenLabel">입찰</span>
            <Stepper
              value={cell.bid}
              max={round}
              nullable
              size="lg"
              onChange={(v) => onPatch({ bid: v })}
            />
          </div>
          <div className="bidTakenItem">
            <span className="bidTakenLabel">실제</span>
            <Stepper
              value={cell.taken}
              max={round}
              nullable
              size="lg"
              onChange={(v) => onPatch({ taken: v })}
            />
          </div>
        </div>

        {/* ── Bonus section ── */}
        {!isManual && (
          <>
            <div className="cardDivider" />
            <div className="bonusHeader">
              <button
                type="button"
                className="bonusToggleBtn"
                disabled={bonusDisabled}
                onClick={() => setBonusOpen((v) => !v)}
              >
                <span>확장 보너스</span>
                <span className={`bonusChevron${bonusOpen ? ' bonusChevron--open' : ''}`}>
                  ▼
                </span>
              </button>
            </div>

            {bonusOpen && (
              <div className="bonusGrid">
                {/* Mermaid catches Skull King */}
                <div className="bonusRow">
                  <label className={`toggleSwitch${bonusDisabled ? ' toggleSwitch--disabled' : ''}`}>
                    <input
                      className="toggleTrack"
                      type="checkbox"
                      checked={cell.mermaidCatchesSkullKing}
                      disabled={bonusDisabled}
                      onChange={(e) => onPatch({ mermaidCatchesSkullKing: e.target.checked })}
                    />
                    <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                      인어 → 스컬킹
                      <small>+40점</small>
                    </span>
                  </label>
                </div>

                {/* Pirates catch Mermaids */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    해적 → 인어
                    <small>+20점 × 수</small>
                  </span>
                  <div className="bonusRowStepper">
                    <Stepper
                      value={cell.piratesCatchMermaids}
                      max={2}
                      disabled={bonusDisabled}
                      onChange={(v) => onPatch({ piratesCatchMermaids: v ?? 0 })}
                    />
                  </div>
                </div>

                {/* Skull King catches Pirates */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    스컬킹 → 해적
                    <small>+30점 × 수</small>
                  </span>
                  <div className="bonusRowStepper">
                    <Stepper
                      value={cell.skullKingPiratesCaught}
                      max={6}
                      disabled={bonusDisabled}
                      onChange={(v) => onPatch({ skullKingPiratesCaught: v ?? 0 })}
                    />
                  </div>
                </div>

                {/* Standard 14s */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    일반 14 카드
                    <small>+10점 × 수</small>
                  </span>
                  <div className="bonusRowStepper">
                    <Stepper
                      value={cell.standard14sCaptured}
                      max={3}
                      disabled={bonusDisabled}
                      onChange={(v) => onPatch({ standard14sCaptured: v ?? 0 })}
                    />
                  </div>
                </div>

                {/* Black 14s */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    검정 14 카드
                    <small>+20점 × 수</small>
                  </span>
                  <div className="bonusRowStepper">
                    <Stepper
                      value={cell.black14sCaptured}
                      max={1}
                      disabled={bonusDisabled}
                      onChange={(v) => onPatch({ black14sCaptured: v ?? 0 })}
                    />
                  </div>
                </div>

                {/* Loot Alliances */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    Loot 동맹
                    <small>+20점 × 수</small>
                  </span>
                  <div className="bonusRowStepper">
                    <Stepper
                      value={cell.lootAlliances}
                      max={2}
                      disabled={bonusDisabled}
                      onChange={(v) => onPatch({ lootAlliances: v ?? 0 })}
                    />
                  </div>
                </div>

                {/* Rascal Wager (0 / 10 / 20 stored, shown as 0/1/2 × 10) */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    Rascal Wager
                    <small>성공 +, 실패 − / 단위 10점</small>
                  </span>
                  <div className="bonusRowStepper">
                    <Stepper
                      value={cell.rascalWager / 10}
                      max={2}
                      disabled={bonusDisabled}
                      onChange={(v) => onPatch({ rascalWager: (v ?? 0) * 10 })}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Manual override ── */}
        <div className="cardDivider" />
        <div className="manualSection">
          <div className="manualToggleRow">
            <span className="manualLabel">수동 점수 입력</span>
            <label className="toggleSwitch" style={{ flex: 'none' }}>
              <input
                className="toggleTrack"
                type="checkbox"
                checked={isManual}
                onChange={(e) => {
                  if (e.target.checked) onPatch({ manualOverridePoints: br.total ?? 0 });
                  else onPatch({ manualOverridePoints: null });
                }}
              />
            </label>
          </div>
          {isManual && (
            <input
              className="manualInput"
              type="number"
              inputMode="numeric"
              value={cell.manualOverridePoints ?? 0}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value) || 0);
                onPatch({ manualOverridePoints: n });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
