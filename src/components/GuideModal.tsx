type Props = { open: boolean; onClose: () => void };

/**
 * 처음 쓰는 사용자를 위한 앱 설명서입니다.
 */
export function GuideModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="guideTitle">
      <div className="modal modalWide guideModal">
        <div className="modalHandle" />
        <h2 id="guideTitle" className="modalTitle">
          Skull King 점수판 — 이용 안내
        </h2>
        <div className="guideScroll">
          <section className="guideSection">
            <h3 className="guideHeading">이 앱은 뭐예요?</h3>
            <p className="guideP">
              실제 카드 게임은 테이블에서 하고, 여기서는 <strong>입찰·실제 트릭 수·보너스</strong>만
              넣으면 라운드 점수와 총점을 자동으로 계산해 주는 <strong>보조 점수표</strong>입니다. 서버에
              올리지 않고 이 기기 브라우저에만 저장됩니다.
            </p>
          </section>

          <section className="guideSection">
            <h3 className="guideHeading">처음 쓰는 순서</h3>
            <ol className="guideOl">
              <li>
                오른쪽 위 <strong>⚙️ 설정</strong>에서 플레이어 이름(2~8명)과 총 라운드(1~20, 보통
                10)를 맞춘 뒤 <strong>저장</strong>합니다.
              </li>
              <li>
                위쪽 <strong>총점 바</strong>를 밀어 가며 누적 점수를 확인할 수 있습니다.
              </li>
              <li>
                <strong>라운드 N</strong>을 펼치면 그 라운드에 받은 카드가 N장이라는 뜻이에요. 각
                플레이어마다 <strong>입찰</strong>(예측)과 <strong>실제</strong>(가져온 트릭 수)를
                스테퍼로 맞춥니다.
              </li>
              <li>
                특수 상황이면 <strong>채점 보정(−1~+1)</strong>으로 채점용 트릭만 조정할 수 있어요.
                전원 <strong>실제</strong> 합은 여전히 라운드 수와 같아야 하고(크라켄 제외), 보정은
                점수 계산에만 반영됩니다.
              </li>
              <li>
                <strong>확장 보너스</strong>를 펼쳐 카드 보너스·Rascal·추가 점수 등을 넣습니다. 1 이상
                입찰에 성공한 라운드에만 보너스가 더해집니다.
              </li>
              <li>
                라운드에 <strong>크라켄</strong>이 있었다면 체크해 두면, 실제 트릭 합 검증 경고를
                끕니다.
              </li>
              <li>
                룰과 안 맞을 때는 <strong>수동 점수 입력</strong>으로 그 라운드만 직접 점수를 넣을 수
                있습니다.
              </li>
            </ol>
          </section>

          <section className="guideSection">
            <h3 className="guideHeading">헤더 아이콘 정리</h3>
            <ul className="guideUl">
              <li>
                <strong>⚙️</strong> — 게임 설정(인원·라운드·이름)
              </li>
              <li>
                <strong>?</strong> — 점수 규칙 요약(짧게)
              </li>
              <li>
                <strong>📖</strong> — 이 이용 안내(지금 보시는 화면)
              </li>
              <li>
                <strong>↺</strong> — 저장 데이터 전부 초기화(복구 불가)
              </li>
            </ul>
          </section>

          <section className="guideSection">
            <h3 className="guideHeading">저장·주의</h3>
            <ul className="guideUl">
              <li>점수는 <strong>이 브라우저·이 기기</strong>의 저장소에만 있습니다.</li>
              <li>다른 폰이나 PC, 시크릿 창, 캐시 삭제 시 데이터가 비거나 나뉠 수 있어요.</li>
              <li>공식 룰과 다를 수 있으니, 최종 판정은 항상 룰북을 기준으로 해 주세요.</li>
            </ul>
          </section>
        </div>
        <button type="button" className="btnPrimary guideCloseBtn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
