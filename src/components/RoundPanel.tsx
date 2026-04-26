import { useState } from 'react';
import { calcRoundPoints, effectiveTaken, isRoundTakeSumValid, type RoundInput } from '../domain/score';
import { getCell, type Player, type PersistedV1 } from '../state/gameState';

type Props = {
  round: number;
  state: PersistedV1;
  /** 크라켄이 나온 라운드면 물리 트릭 합 검증을 생략합니다. */
  kraken: boolean;
  onKrakenChange: (kraken: boolean) => void;
  onPatch: (playerId: string, patch: Partial<RoundInput>) => void;
};

function formatMaybe(n: number | null) {
  if (n === null) return '—';
  if (n > 0) return `+${n}`;
  return String(n);
}

// ── Stepper ─────────────────────────────────────────────
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

  return (
    <div className={`stepper stepper--${size}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="stepperBtn"
        onClick={handleDec}
        disabled={disabled || value === null}
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
        disabled={disabled || value === max}
        aria-label="증가"
      >
        +
      </button>
    </div>
  );
}

// ── Rascal segment picker (0 / 10pt / 20pt) ─────────────
type RascalPickerProps = {
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
};

function RascalPicker({ value, disabled, onChange }: RascalPickerProps) {
  return (
    <div className="rascalPicker">
      {([0, 10, 20] as const).map((pt) => (
        <button
          key={pt}
          type="button"
          className={`rascalOpt${value === pt ? ' rascalOpt--active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(pt)}
        >
          {pt === 0 ? '없음' : `${pt}pt`}
        </button>
      ))}
    </div>
  );
}

// ── RoundPanel ───────────────────────────────────────────
export function RoundPanel({ round, state, kraken, onKrakenChange, onPatch }: Props) {
  const takes = state.players.map((p) => getCell(state, round, p.id).taken);
  const allTakesIn = takes.every((t) => t !== null);
  const { ok, sum } = allTakesIn
    ? isRoundTakeSumValid(round, takes.map((t) => t as number))
    : { ok: true, sum: 0 };
  const showTakeWarning = allTakesIn && !ok && !kraken;

  return (
    <div className="roundPanel">
      <div className="roundMetaRow">
        <label className="krakenRow">
          <input
            type="checkbox"
            checked={kraken}
            onChange={(e) => onKrakenChange(e.target.checked)}
          />
          <span>이 라운드 크라켄 있음 (실제 트릭 합 검증 생략)</span>
        </label>
      </div>
      {kraken && (
        <p className="roundInfo" role="status">
          크라켄 라운드: 플레이어 &apos;실제&apos; 트릭 합이 {round}와 다를 수 있습니다.
        </p>
      )}
      {showTakeWarning && (
        <p className="roundWarn" role="status">
          ⚠️ &apos;실제&apos; 트릭 합이 {round}이어야 합니다 (현재: {sum})
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

// ── PlayerCard ───────────────────────────────────────────
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

  const scoreClass = br.total === null ? 'ptNull' : br.total < 0 ? 'ptNeg' : 'ptPos';
  const cardStateClass =
    br.total === null ? '' : br.total > 0 ? ' playerCard--pos' : br.total < 0 ? ' playerCard--neg' : '';
  const takenRaw = cell.taken;
  const takenEff =
    takenRaw !== null ? effectiveTaken(takenRaw, cell.takenDelta ?? 0, round) : null;
  const bothSet = cell.bid !== null && takenRaw !== null && takenEff !== null;
  const bidRowClass = bothSet
    ? cell.bid === takenEff
      ? ' bidTakenRow--ok'
      : ' bidTakenRow--fail'
    : '';

  // Derived: any bonus is set (show indicator on collapsed button)
  const hasBonus =
    (cell.takenDelta ?? 0) !== 0 ||
    (cell.extraBonusPoints ?? 0) !== 0 ||
    cell.firstMateBonus ||
    (cell.davyJonesMarineCount ?? 0) > 0 ||
    cell.mermaidCatchesSkullKing ||
    cell.piratesCatchMermaids > 0 ||
    cell.skullKingPiratesCaught > 0 ||
    cell.standard14sCaptured > 0 ||
    cell.black14sCaptured > 0 ||
    cell.lootAlliances > 0 ||
    cell.rascalWager > 0;

  return (
    <div className={`playerCard${cardStateClass}`}>
      {/* Header */}
      <div className="playerCardHeader">
        <span className="playerCardName">{player.name}</span>
        <span className={`playerCardScore ${scoreClass}`}>{formatMaybe(br.total)}</span>
      </div>

      <div className="playerCardBody">
        {/* Bid / Taken */}
        <div className={`bidTakenRow${bidRowClass}`}>
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

        <div className="takenDeltaRow">
          <span className="bidTakenLabel">채점 보정 (해적 등)</span>
          <Stepper
            value={cell.takenDelta ?? 0}
            min={-1}
            max={1}
            disabled={cell.taken === null}
            size="md"
            onChange={(v) => onPatch({ takenDelta: v ?? 0 })}
          />
          <span className="takenDeltaHint">
            물리 트릭은 위 &apos;실제&apos;, 채점은 실제+보정 (현재 채점용:{' '}
            {takenEff === null ? '—' : takenEff})
          </span>
        </div>

        {/* Bonus section */}
        {!isManual && (
          <>
            <div className="cardDivider" />
            <button
              type="button"
              className="bonusToggleBtn"
              disabled={bonusDisabled}
              onClick={() => setBonusOpen((v) => !v)}
            >
              <span>
                확장 보너스
                {!bonusDisabled && hasBonus && !bonusOpen && (
                  <span className="bonusDot" aria-label="보너스 입력됨" />
                )}
              </span>
              <span className={`bonusChevron${bonusOpen ? ' bonusChevron--open' : ''}`}>▼</span>
            </button>

            {bonusOpen && (
              <div className="bonusGrid">
                {/* 임의 카드 보너스 (1+ 입찰 성공 시만 합산) */}
                <div className="bonusRow bonusRow--col">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    추가 보너스 점수
                    <small>+10, −5 등 (1+ 입찰 성공 시만)</small>
                  </span>
                  <input
                    className="manualInput bonusExtraInput"
                    type="number"
                    inputMode="numeric"
                    disabled={bonusDisabled}
                    value={cell.extraBonusPoints ?? 0}
                    onChange={(e) => {
                      const n = Math.round(Number(e.target.value));
                      onPatch({
                        extraBonusPoints: Number.isNaN(n)
                          ? 0
                          : Math.min(9999, Math.max(-9999, n))
                      });
                    }}
                  />
                </div>

                {/* 1등 항해사 */}
                <div className="bonusRow">
                  <label className={`toggleSwitch${bonusDisabled ? ' toggleSwitch--disabled' : ''}`}>
                    <input
                      className="toggleTrack"
                      type="checkbox"
                      checked={cell.firstMateBonus}
                      disabled={bonusDisabled}
                      onChange={(e) => onPatch({ firstMateBonus: e.target.checked })}
                    />
                    <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                      인어+스컬킹 → 1등 항해사
                      <small>+30점</small>
                    </span>
                  </label>
                </div>

                {/* 데이빗 존스 */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    데이빗 존스 → 해양생물
                    <small>+20점 × 수</small>
                  </span>
                  <div className="bonusRowStepper">
                    <Stepper
                      value={cell.davyJonesMarineCount}
                      max={8}
                      disabled={bonusDisabled}
                      onChange={(v) => onPatch({ davyJonesMarineCount: v ?? 0 })}
                    />
                  </div>
                </div>

                {/* Mermaid → Skull King */}
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

                {/* Pirates → Mermaids */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    해적 → 인어
                    <small>+20점 × 수 (최대 2)</small>
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

                {/* Skull King → Pirates */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    스컬킹 → 해적
                    <small>+30점 × 수 (최대 6)</small>
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
                    <small>+10점 × 수 (노랑·보라·초록)</small>
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

                {/* Black 14 */}
                <div className="bonusRow">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    검정 14 카드
                    <small>+20점 (졸리 로저)</small>
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
                    <small>+20점 × 수 (양측 모두 입찰 성공 시)</small>
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

                {/* Rascal Wager — segment picker */}
                <div className="bonusRow bonusRow--col">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    Rascal Wager
                    <small>입찰 성공 시 +, 실패 시 − 자동 반영</small>
                  </span>
                  <RascalPicker
                    value={cell.rascalWager}
                    disabled={bonusDisabled}
                    onChange={(v) => onPatch({ rascalWager: v })}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Manual override */}
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
