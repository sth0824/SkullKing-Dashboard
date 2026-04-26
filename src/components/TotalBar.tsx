import type { Player } from '../state/gameState';

type Props = {
  players: Player[];
  totals: Record<string, number>;
};

export function TotalBar({ players, totals }: Props) {
  return (
    <div className="totalBar" role="region" aria-label="누적 총점">
      <div className="totalBarInner">
        {players.map((p) => (
          <div className="totalChip" key={p.id}>
            <span className="totalChipName">{p.name}</span>
            <span className="totalChipScore">{totals[p.id] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
