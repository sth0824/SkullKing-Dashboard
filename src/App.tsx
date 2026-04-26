import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildPlayerTotal, calcRoundPoints, isRoundTakeSumValid } from './domain/score';
import { DEFAULT_ROUNDS } from './domain/constants';
import { GuideModal } from './components/GuideModal';
import { HelpModal } from './components/HelpModal';
import { RoundPanel } from './components/RoundPanel';
import { SetupModal } from './components/SetupModal';
import { TotalBar } from './components/TotalBar';
import {
  getCell,
  getRoundKraken,
  loadFromStorage,
  makeInitialState,
  mergePlayersAndRounds,
  resetKeepPlayers,
  saveToStorage,
  withCell,
  withRoundCompleted,
  withRoundKraken,
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
  const [showGuide, setShowGuide] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showGameComplete, setShowGameComplete] = useState(false);

  // <details> 요소를 코드로 여닫기 위한 ref 모음입니다
  const detailsRefs = useRef<Record<number, HTMLDetailsElement | null>>({});
  const didMountRef = useRef(false);

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
  }, []);

  // 멤버·라운드 수는 유지하고 점수만 초기화합니다
  const resetKeepPlayersCallback = useCallback(() => {
    setState((s) => resetKeepPlayers(s));
    setShowGameComplete(false);
  }, []);

  const onPatch = useCallback((round: number, playerId: string, patch: Partial<RoundInput>) => {
    setState((s) => withCell(s, round, playerId, patch));
  }, []);

  // 라운드 완료 버튼 핸들러: 승수 검증 후 다음 라운드로 이동하거나 게임을 종료합니다
  const handleRoundComplete = useCallback((round: number) => {
    const currentState = state;
    const kraken = getRoundKraken(currentState, round);
    const takes = currentState.players.map((p) => {
      const t = getCell(currentState, round, p.id).taken;
      return t ?? 0;
    });
    const allTakesIn = currentState.players.every(
      (p) => getCell(currentState, round, p.id).taken !== null
    );

    if (allTakesIn) {
      const { ok } = isRoundTakeSumValid(round, takes);
      if (!ok && !kraken) {
        // 승수 불일치 시 확인 팝업을 표시합니다
        const proceed = window.confirm(
          `⚠️ 승수가 일치하지 않습니다.\n승수 및 크라켄 여부를 확인해주세요.\n\n그래도 다음으로 넘어갈까요?`
        );
        if (!proceed) return;
      }
    }

    setState((s) => withRoundCompleted(s, round, true));

    if (round >= currentState.roundCount) {
      // 마지막 라운드 완료 → 최종 순위 표시
      setShowGameComplete(true);
    } else {
      // 다음 라운드를 열고 스크롤합니다
      const next = round + 1;
      setTimeout(() => {
        if (detailsRefs.current[round]) detailsRefs.current[round]!.open = false;
        if (detailsRefs.current[next]) {
          detailsRefs.current[next]!.open = true;
          detailsRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [state]);

  // END 버튼 핸들러: 현재까지 점수로 즉시 최종 순위를 표시합니다
  const handleEndGame = useCallback(() => {
    setShowGameComplete(true);
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
            <button
              type="button"
              className="iconBtn"
              onClick={() => setShowGuide(true)}
              aria-label="이용 안내"
              title="이용 안내"
            >
              📖
            </button>
            <button type="button" className="iconBtn" onClick={() => setShowHelp(true)} aria-label="점수 규칙" title="점수 규칙">
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
                kraken={getRoundKraken(state, r)}
                onKrakenChange={(v) => setState((s) => withRoundKraken(s, r, v))}
                onPatch={(pid, patch) => onPatch(r, pid, patch)}
                onComplete={() => handleRoundComplete(r)}
                isLastRound={r >= state.roundCount}
                canEnd={r >= 6}
                onEnd={handleEndGame}
              />
            </details>
          );
        })}

        {/* 10라운드 이상일 때 라운드 추가 또는 게임 종료 버튼을 표시합니다 */}
        {state.roundCount >= DEFAULT_ROUNDS && (
          <div className="roundExtendBar">
            <button
              type="button"
              className="btnExtend"
              onClick={() => setState((s) => ({ ...s, roundCount: s.roundCount + 1 }))}
            >
              + 라운드 추가
            </button>
            <button
              type="button"
              className="btnEndGame"
              onClick={handleEndGame}
            >
              🏴‍☠️ 게임 끝내기
            </button>
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      <GuideModal open={showGuide} onClose={() => setShowGuide(false)} />
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
            <div className="gcActions">
              <button type="button" className="btnGhost" onClick={() => setShowGameComplete(false)}>
                닫기
              </button>
              <button
                type="button"
                className="btnPrimary"
                onClick={resetKeepPlayersCallback}
              >
                같은 멤버로 다시
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
