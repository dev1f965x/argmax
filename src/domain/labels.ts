export const APP_NAME = "argmax";

export const TOPIC_LABELS = {
  heading: "주제",
  add: "주제 추가",
  addPlaceholder: "점심 메뉴",
  addLabel: "주제 이름",
  rename: "이름 변경",
  remove: "주제 삭제",
  removeAsk: (name: string, count: number) => `"${name}"과 후보 ${count}개를 삭제합니다.`,
  restored: "복원했습니다",
  undo: "실행 취소",
  removed: (name: string) => `"${name}" 삭제`,
  empty: "주제가 없습니다",
  emptyDetail: "결정할 대상을 주제로 등록하십시오.",
};

export const OPTION_LABELS = {
  heading: "후보",
  add: "추가",
  addPlaceholder: "돈까스",
  addLabel: "후보 이름",
  remove: (name: string) => `${name} 삭제`,
  empty: "후보가 2개 이상 필요합니다",
  count: (count: number) => `${count}개`,
};

export const PICK_LABELS = {
  pick: "선택",
  again: "다시 선택",
  result: "선택 결과",
};

export const UPDATE_LABELS = {
  available: (version: string) => `${version} 사용 가능`,
  install: "업데이트",
  downloading: (version: string) => `${version} 내려받는 중`,
  installing: "내려받는 중",
  progress: (progress: number | null) =>
    progress === null ? "…" : ` ${Math.round(progress * 100)}%`,
  failed: "업데이트 실패",
  retry: "다시 시도",
};
