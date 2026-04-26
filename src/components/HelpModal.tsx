type Props = { open: boolean; onClose: () => void };

export function HelpModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
      <div className="modal">
        <div className="modalHandle" />
        <h2 id="helpTitle" className="modalTitle">
          점수 규칙 요약
        </h2>
        <ul className="helpList">
          <li>0 입찰 성공(실제도 0): +라운드 × 10점</li>
          <li>0 입찰 실패(실제 ≠ 0): −라운드 × 10점</li>
          <li>1 이상 입찰 성공: +입찰 × 20점 + 보너스</li>
          <li>1 이상 입찰 실패: −|입찰−실제| × 10점</li>
          <li>확장 보너스는 입찰 성공 시에만 적용됩니다</li>
          <li>Rascal Wager: 성공 시 +, 실패 시 − 자동 반영</li>
          <li>수동 점수: 특수 케이스·하우스 룰로 직접 덮어씁니다</li>
        </ul>
        <p className="helpNote">상세 룰은 Grandpa Beck's 룰북을 확인해 주세요.</p>
        <button type="button" className="btnPrimary" style={{ width: '100%' }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
