import { useState } from 'react';
import { createDefaultPlayerName, type Player } from '../state/gameState';

const MIN = 2;
const MAX = 8;

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (next: { players: Player[]; roundCount: number }) => void;
  initial: { players: Player[]; roundCount: number };
};

function newPlayerId() {
  return globalThis.crypto?.randomUUID?.() ?? `p-${Date.now()}-${Math.random()}`;
}

export function SetupModal({ open, onClose, onSave, initial }: Props) {
  const [roundCount, setRoundCount] = useState(initial.roundCount);
  const [players, setPlayers] = useState<Player[]>(initial.players);

  if (!open) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="setupTitle">
      <div className="modal modalWide">
        <div className="modalHandle" />
        <h2 id="setupTitle" className="modalTitle">
          게임 설정
        </h2>

        <label className="field">
          <span className="fieldLabel">총 라운드 (1~20)</span>
          <input
            className="fieldInput"
            type="number"
            min={1}
            max={20}
            value={roundCount}
            onChange={(e) =>
              setRoundCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
            }
          />
        </label>

        <div className="playerEditList">
          {players.map((p, idx) => (
            <div className="playerRow" key={p.id}>
              <span className="playerIndex">{idx + 1}</span>
              <input
                className="fieldInput flex1"
                type="text"
                value={p.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setPlayers((prev) => prev.map((q) => (q.id === p.id ? { ...q, name: v } : q)));
                }}
                maxLength={24}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        <div className="rowGap">
          <button
            type="button"
            className="btnSecondary"
            disabled={players.length >= MAX}
            onClick={() =>
              setPlayers((prev) => [
                ...prev,
                { id: newPlayerId(), name: createDefaultPlayerName(prev.length + 1) },
              ])
            }
          >
            + 플레이어 추가
          </button>
          <button
            type="button"
            className="btnSecondary"
            disabled={players.length <= MIN}
            onClick={() => setPlayers((prev) => prev.slice(0, -1))}
          >
            마지막 제거
          </button>
        </div>

        <p className="helpNote" style={{ marginTop: 10 }}>
          저장 시 제거·축소된 슬롯의 점수는 사라집니다.
        </p>

        <div className="rowEnd">
          <button type="button" className="btnGhost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="btnPrimary"
            onClick={() => onSave({ players, roundCount })}
            disabled={players.length < MIN || roundCount < 1}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
