type Props = { open: boolean; onClose: () => void };

export function HelpModal({ open, onClose }: Props) {
  if (!open) {
    return null;
  }
  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
      <div className="modal">
        <h2 id="helpTitle" className="modalTitle">
          점수 규칙 요약
        </h2>
        <ul className="helpList">
          <li>0트릙 입찰: 정확히 0이면 +라운드×10, 아니면 −라운드×10</li>
          <li>1 이상 입찰: 맞으면 +입찰×20, 틀리면 −|입찰−실제|×10</li>
          <li>확장 보너스(14 카드, 인어/해적/스컬킹, Loot, Rascal)는 입찰 성공 시에만 적용</li>
          <li>Rascal wager는 성공 시 +, 실패 시 −로 자동 반영</li>
          <li>수동 점수: 특수 케이스·하우스 룰용으로 이번 라운드 점수를 직접 덮어씁니다</li>
        </ul>
        <p className="helpNote">상세 룰은 키트 룰북(Grandpa Beck&apos;s)을 확인해 주세요.</p>
        <button type="button" className="btnPrimary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
