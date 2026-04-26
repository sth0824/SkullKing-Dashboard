import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const MEDAL = ['🥇', '🥈', '🥉'];

export default function App() {
  const [state, setState] = useState<AppState>(() => loadFromStorage());
  const [showSetup, setShowSetup] = useState(false);
  const [setupKey, setSetupKey] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showGameComplete, setShowGameComplete] = useState(false);

  // Refs for programmatic control of <details> elements
  const detailsRefs = useRef<Record<number, HTMLDetailsElement | null>>({});
  const didMountRef = useRef(false);
  // Tracks which rounds were already complete (to detect newly completed)
  const isInitializedRef = useRef(false);
  const wasCompleteRef = useRef<Set<number>>(new Set());
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Open round 1 on first mount (uncontrolled <details>)
  useEffect(() => {
    if (!didMountRef.current && detailsRefs.current[1]) {
      detailsRefs.current[1]!.open = true;
      didMountRef.current = true;
    }
  });

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

  const allRoundsComplete = useMemo(
    () =>
      state.roundCount > 0 &&
      Array.from({ length: state.roundCount }, (_, i) => i + 1).every(
        (r) => roundInfo[r]?.complete,
      ),
    [roundInfo, state.roundCount],
  );

  // Auto-advance to next round when a round is newly completed
  useEffect(() => {
    if (!isInitializedRef.current) {
      // First mount: mark all currently-complete rounds as already-complete
      isInitializedRef.current = true;
      for (let r = 1; r <= state.roundCount; r++) {
        if (roundInfo[r]?.complete) wasCompleteRef.current.add(r);
      }
      return;
    }

    for (let r = 1; r <= state.roundCount; r++) {
      if (roundInfo[r]?.complete && !wasCompleteRef.current.has(r)) {
        wasCompleteRef.current.add(r);
        const detail = detailsRefs.current[r];
        if (detail?.open) {
          if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = setTimeout(() => {
            if (detailsRefs.current[r]) detailsRefs.current[r]!.open = false;
            const next = r + 1;
            if (next <= state.roundCount && detailsRefs.current[next]) {
              detailsRefs.current[next]!.open = true;
              // Scroll to next round
              detailsRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 600);
        }
        break; // Handle one newly-complete round per effect run
      }
    }
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [roundInfo, state.roundCount]);

  // Show game complete modal when all rounds done
  useEffect(() => {
    if (allRoundsComplete) {
      const t = setTimeout(() => setShowGameComplete(true), 800);
      return () => clearTimeout(t);
    }
  }, [allRoundsComplete]);

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
    setShowGameComplete(false);
    wasCompleteRef.current = new Set();
    isInitializedRef.current = false;
  }, []);

  const onPatch = useCallback((round: number, playerId: string, patch: Partial<RoundInput>) => {
    setState((s) => withCell(s, round, playerId, patch));
  }, []);

  // Final standings for game complete modal
  const finalStandings = useMemo(() => {
    return [...state.players]
      .map((p) => ({ player: p, score: totals[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }, [state.players, totals]);

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
            <button type="button" className="iconBtn" onClick={openSettings} aria-label="설정" title="설정">
              ⚙️
            </button>
            <button type="button" className="iconBtn" onClick={() => setShowHelp(true)} aria-label="도움말" title="도움말">
              ?
            </button>
            <button
              type="button"
              className="iconBtn iconBtnDanger"
              onClick={() => setShowReset(true)}
              aria-label="초기화"
              title="초기화"
            >
              ↺
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
            <details
              key={r}
              className="roundDetails"
              ref={(el) => { detailsRefs.current[r] = el; }}
            >
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
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="resetTitle">
          <div className="modal">
            <div className="modalHandle" />
            <h2 id="resetTitle" className="modalTitle">점수 전부 초기화</h2>
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

      {/* ── Game Complete Modal ── */}
      {showGameComplete && (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="gcTitle">
          <div className="modal gameCompleteModal">
            <div className="modalHandle" />
            <h2 id="gcTitle" className="gcTitle">🏴‍☠️ 게임 종료!</h2>
            <p className="gcSub">최종 순위</p>
            <ol className="rankList">
              {finalStandings.map((entry, idx) => (
                <li key={entry.player.id} className={`rankItem${idx === 0 ? ' rankItem--first' : ''}`}>
                  <span className="rankMedal">{MEDAL[idx] ?? `${idx + 1}.`}</span>
                  <span className="rankName">{entry.player.name}</span>
                  <span className={`rankScore ${entry.score >= 0 ? 'ptPos' : 'ptNeg'}`}>
                    {entry.score >= 0 ? '+' : ''}{entry.score}
                  </span>
                </li>
              ))}
            </ol>
            <div className="rowEnd" style={{ marginTop: 20 }}>
              <button type="button" className="btnGhost" onClick={() => setShowGameComplete(false)}>
                닫기
              </button>
              <button
                type="button"
                className="btnDanger"
                onClick={() => { setShowReset(true); setShowGameComplete(false); }}
              >
                새 게임
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
