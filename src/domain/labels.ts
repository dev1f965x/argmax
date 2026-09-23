export const APP_NAME = "argmax";

export const TOPIC_LABELS = {
  heading: "주제",
  add: "주제 만들기",
  addPlaceholder: "예: 점심 메뉴",
  rename: "이름 바꾸기",
  remove: "주제 지우기",
  removeAsk: (name: string, count: number) => `"${name}"과 항목 ${count}개를 지울까요?`,
  restored: "되돌렸어요",
  undo: "되돌리기",
  removed: (name: string) => `"${name}"을 지웠어요`,
  empty: "주제를 하나 만들어 주세요",
  emptyDetail: "고민되는 걸 적으면 돼요. 점심 메뉴, 주말 게임처럼요",
};

export const OPTION_LABELS = {
  heading: "후보",
  add: "추가",
  addPlaceholder: "후보 적기",
  remove: (name: string) => `${name} 지우기`,
  empty: "후보를 두 개 이상 적어 주세요",
  count: (count: number) => `${count}개`,
};

export const PICK_LABELS = {
  pick: "고르기",
  again: "다시 고르기",
  result: "이걸로 해요",
};
