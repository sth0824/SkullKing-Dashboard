import type { Player } from '../state/gameState';

type Props = {
  players: Player[];
  totals: Record<string, number>;
};

const RANK_ICONS = ['👑', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
const RANK_LABELS = ['1위', '2위', '3위', '4위', '5위', '6위', '7위', '8위'];

export function TotalBar({ players, totals }: Props) {
  const sorted = [...players].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));
  const rankMap: Record<string, number> = {};
  sorted.forEach((p, i) => { rankMap[p.id] = i; });

  return (
    <div className="totalBar" role="region" aria-label="누적 총점">
      <div className="totalBarInner">
        {players.map((p) => {
          const rank = rankMap[p.id] ?? 0;
          const score = totals[p.id] ?? 0;
          const isLeader = rank === 0 && players.length > 1;
          const scoreClass = score > 0 ? 'ptPos' : score < 0 ? 'ptNeg' : '';
          return (
            <div key={p.id} className={`totalChip${isLeader ? ' totalChip--leader' : ''}`}>
              <span className="totalChipRank">
                {isLeader ? RANK_ICONS[0] : RANK_LABELS[rank] ?? `${rank + 1}위`}
              </span>
              <span className="totalChipName">{p.name}</span>
              <span className={`totalChipScore ${scoreClass}`}>{score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
