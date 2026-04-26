import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildPlayerTotal, calcRoundPoints } from './domain/score';
import { HelpModal } from './components/HelpModal';
import { RoundPanel } from './components/RoundPanel';
import { SetupModal } from './components/SetupModal';
import { TotalBar } from './components/TotalBar';
import {
  getCell,
  loadFromStorage,
  makeInitialState,
  mergePlayersAndRounds,
  saveToStorage,
  withCell,
  type PersistedV1,
  type Player,
} from './state/gameState';
import type { RoundInput } from './domain/score';

type AppState = PersistedV1;

export default function App() {
  const [state, setState] = useState<AppState>(() => loadFromStorage());
  const [showSetup, setShowSetup] = useState(false);
  const [setupKey, setSetupKey] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const p of state.players) {
      t[p.id] = buildPlayerTotal(state.roundCount, (r) => getCell(state, r, p.id)).total;
    }
    return t;
  }, [state]);

  const roundInfo = useMemo(() => {
    const info: Record<number, { complete: boolean; total: number }> = {};
    for (let r = 1; r <= state.roundCount; r++) {
      let total = 0;
      let complete = true;
      for (const p of state.players) {
        const pts = calcRoundPoints(r, getCell(state, r, p.id)).total;
        if (pts === null) complete = false;
        else total += pts;
      }
      info[r] = { complete, total };
    }
    return info;
  }, [state]);

  const openSettings = useCallback(() => {
    setSetupKey((k) => k + 1);
    setShowSetup(true);
  }, []);

  const applySetup = useCallback((next: { players: Player[]; roundCount: number }) => {
    setState((s) => mergePlayersAndRounds(s, next.players, next.roundCount));
    setShowSetup(false);
  }, []);

  const resetAll = useCallback(() => {
    setState(makeInitialState());
    setShowReset(false);
  }, []);

  const onPatch = useCallback((round: number, playerId: string, patch: Partial<RoundInput>) => {
    setState((s) => withCell(s, round, playerId, patch));
  }, []);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="headerContent">
          <h1 className="title">
            <span className="titleSkull">☠️</span>
            Skull King
          </h1>
          <div className="headerButtons">
            <button type="button" className="iconBtn" onClick={openSettings}>
              ⚙️ 설정
            </button>
            <button type="button" className="iconBtn" onClick={() => setShowHelp(true)}>
              ? 도움
            </button>
            <button
              type="button"
              className="iconBtn iconBtnDanger"
              onClick={() => setShowReset(true)}
            >
              ↺ 초기화
            </button>
          </div>
        </div>
      </header>

      {/* ── Total score bar ── */}
      <TotalBar players={state.players} totals={totals} />

      {/* ── Rounds ── */}
      <main className="main">
        {Array.from({ length: state.roundCount }, (_, i) => i + 1).map((r) => {
          const info = roundInfo[r];
          const hintClass = info.complete
            ? info.total >= 0
              ? 'roundHintPos'
              : 'roundHintNeg'
            : '';
          const hintText = info.complete
            ? `합계 ${info.total >= 0 ? '+' : ''}${info.total}`
            : `카드 ${r}장`;

          return (
            <details key={r} className="roundDetails" open={r === 1}>
              <summary className="roundSummary">
                <div className="roundSummaryLeft">
                  <span className="roundChevron">▼</span>
                  <span className="roundNum">라운드 {r}</span>
                  {info.complete && <span className="roundDone">✓</span>}
                </div>
                <span className={`roundHint ${hintClass}`}>{hintText}</span>
              </summary>
              <RoundPanel
                round={r}
                state={state}
                onPatch={(pid, patch) => onPatch(r, pid, patch)}
              />
            </details>
          );
        })}
      </main>

      {/* ── Modals ── */}
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      {showReset && (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resetTitle"
        >
          <div className="modal">
            <div className="modalHandle" />
            <h2 id="resetTitle" className="modalTitle">
              점수 전부 초기화
            </h2>
            <p className="helpNote">
              이 기기에 저장된 점수·이름·라운드가 모두 지워집니다. 계속할까요?
            </p>
            <div className="rowEnd">
              <button type="button" className="btnGhost" onClick={() => setShowReset(false)}>
                취소
              </button>
              <button type="button" className="btnDanger" onClick={resetAll}>
                전부 지우기
              </button>
            </div>
          </div>
        </div>
      )}

      {showSetup && (
        <SetupModal
          key={setupKey}
          open
          onClose={() => setShowSetup(false)}
          onSave={applySetup}
          initial={{ players: state.players, roundCount: state.roundCount }}
        />
      )}
    </div>
  );
}
