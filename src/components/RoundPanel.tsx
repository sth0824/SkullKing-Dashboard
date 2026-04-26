import { useState } from 'react';
import { calcRoundPoints, isRoundTakeSumValid, type RoundInput } from '../domain/score';
import { getCell, type Player, type PersistedV1 } from '../state/gameState';

type Props = {
  round: number;
  state: PersistedV1;
  /** 크라켄이 나온 라운드면 물리 트릭 합 검증을 생략합니다. */
  kraken: boolean;
  onKrakenChange: (kraken: boolean) => void;
  onPatch: (playerId: string, patch: Partial<RoundInput>) => void;
  /** 라운드 완료 버튼 클릭 시 호출됩니다. */
  onComplete: () => void;
  /** 마지막 라운드면 버튼 레이블을 '게임 종료'로 표시합니다. */
  isLastRound: boolean;
  /** 6라운드 이상이면 END 버튼을 노출합니다. */
  canEnd: boolean;
  /** END 버튼 클릭 시 호출됩니다. */
  onEnd: () => void;
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
  step?: number;
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
  step = 1,
  onChange,
  disabled = false,
  size = 'md',
  nullable = false,
  className,
}: StepperProps) {
  const handleDec = () => {
    if (value === null) return;
    if (nullable && value === min) onChange(null);
    else onChange(Math.max(min, value - step));
  };

  const handleInc = () => {
    if (value === null) onChange(min);
    else onChange(Math.min(max, value + step));
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
export function RoundPanel({
  round,
  state,
  kraken,
  onKrakenChange,
  onPatch,
  onComplete,
  isLastRound,
  canEnd,
  onEnd,
}: Props) {
  const takes = state.players.map((p) => getCell(state, round, p.id).taken);
  const allTakesIn = takes.every((t) => t !== null);
  const allBidsIn = state.players.every((p) => getCell(state, round, p.id).bid !== null);
  // 입찰+실제 트릭 모두 입력된 경우에만 완료 버튼을 활성화합니다
  const canComplete = allTakesIn && allBidsIn;

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

      {/* 라운드 완료 버튼 영역 */}
      <div className="roundActionRow">
        {canEnd && (
          <button
            type="button"
            className="btnEnd"
            onClick={onEnd}
            title="현재까지 점수로 게임 종료"
          >
            END
          </button>
        )}
        <button
          type="button"
          className="btnComplete"
          disabled={!canComplete}
          onClick={onComplete}
        >
          {isLastRound ? '🏴‍☠️ 게임 종료' : '라운드 완료 →'}
        </button>
      </div>
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
  // bid가 미입력(null)일 때만 비활성화합니다 (bid=0도 접근 허용)
  const bonusDisabled = cell.bid === null;
  const [bonusOpen, setBonusOpen] = useState(false);

  const scoreClass = br.total === null ? 'ptNull' : br.total < 0 ? 'ptNeg' : 'ptPos';
  const cardStateClass =
    br.total === null ? '' : br.total > 0 ? ' playerCard--pos' : br.total < 0 ? ' playerCard--neg' : '';
  // bid와 실제 트릭을 직접 비교해 배경색을 결정합니다
  const bothSet = cell.bid !== null && cell.taken !== null;
  const bidRowClass = bothSet
    ? cell.bid === cell.taken
      ? ' bidTakenRow--ok'
      : ' bidTakenRow--fail'
    : '';

  // 보너스 점 표시를 위해 하나라도 입력된 보너스가 있는지 확인합니다
  const hasBonus =
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
                {/* 추가/차감 점수 — 5점 단위 스테퍼 (1+ 입찰 성공 시만 합산) */}
                <div className="bonusRow bonusRow--col">
                  <span className={`bonusRowLabel${bonusDisabled ? ' bonusRowLabel--disabled' : ''}`}>
                    추가/차감 점수
                    <small>+5 / −5 단위 (1+ 입찰 성공 시만 합산)</small>
                  </span>
                  <div className="bonusExtraStepperWrap">
                    <Stepper
                      value={cell.extraBonusPoints ?? 0}
                      min={-500}
                      max={500}
                      step={5}
                      disabled={bonusDisabled}
                      size="md"
                      onChange={(v) => onPatch({ extraBonusPoints: v ?? 0 })}
                    />
                    <span className="bonusExtraVal">
                      {(cell.extraBonusPoints ?? 0) > 0
                        ? `+${cell.extraBonusPoints}`
                        : String(cell.extraBonusPoints ?? 0)}
                      pt
                    </span>
                  </div>
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

                {/* 동맹 보너스 — 체크하면 +20pt (bid=0도 가능) */}
                <div className="bonusRow">
                  <label className="toggleSwitch">
                    <input
                      className="toggleTrack"
                      type="checkbox"
                      checked={cell.lootAlliances > 0}
                      onChange={(e) => onPatch({ lootAlliances: e.target.checked ? 1 : 0 })}
                    />
                    <span className="bonusRowLabel">
                      동맹 보너스
                      <small>+20pt</small>
                    </span>
                  </label>
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
