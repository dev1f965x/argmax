import type { Resources } from "./en";

export const ko: Resources = {
  app: {
    home: "Argmax 홈",
  },
  language: {
    label: "언어",
  },
  lists: {
    title: "목록",
    nameLabel: "새 목록 이름",
    create: "만들기",
    created: "“{{name}}” 목록을 만들었습니다.",
    deleted: "“{{name}}” 목록을 삭제했습니다.",
    storedLocally:
      "목록은 이 브라우저에만 저장됩니다. 브라우저 데이터를 지우거나 기기를 바꾸면 사라집니다.",
    emptyTitle: "아직 목록이 없습니다",
    emptyBody: "위에서 첫 목록의 이름을 정하세요. 예: “점심 메뉴”",
    // Korean has no plural forms; the one and other keys exist to match the English resources.
    itemCount_zero: "아직 항목 없음",
    itemCount_one: "항목 {{count, number}}개",
    itemCount_other: "항목 {{count, number}}개",
    limitReached:
      "목록이 최대 개수인 {{limit, number}}개입니다. 새로 만들려면 목록을 삭제하세요.",
    errors: {
      empty: "목록 이름을 입력하세요.",
      tooLong: "{{limit, number}}자 이하로 입력하세요.",
    },
  },
  list: {
    allLists: "전체 목록",
    // Korean has no plural forms; the one and other keys exist to match the English resources.
    itemCount_zero: "항목 0개",
    itemCount_one: "항목 {{count, number}}개",
    itemCount_other: "항목 {{count, number}}개",
    addLabel: "항목 추가",
    add: "추가",
    added: "“{{text}}” 항목을 추가했습니다.",
    saved: "“{{text}}” 항목을 저장했습니다.",
    removed: "“{{text}}” 항목을 삭제했습니다.",
    actions: "목록 메뉴",
    rename: "이름 바꾸기",
    renamed: "목록 이름을 바꿨습니다: “{{name}}”",
    delete: "목록 삭제",
    deleteTitle: "“{{name}}” 목록을 삭제할까요?",
    deleteBody_zero: "목록이 삭제되며 되돌릴 수 없습니다.",
    deleteBody_one:
      "항목 {{count, number}}개가 함께 삭제되며 되돌릴 수 없습니다.",
    deleteBody_other:
      "항목 {{count, number}}개가 함께 삭제되며 되돌릴 수 없습니다.",
    editLabel: "항목 수정",
    edit: "“{{text}}” 수정",
    remove: "“{{text}}” 삭제",
    save: "저장",
    cancel: "취소",
    emptyTitle: "목록이 비어 있습니다",
    emptyBody: "뽑으려면 항목을 하나 이상 추가하세요.",
    limitReached:
      "항목이 최대 개수인 {{limit, number}}개입니다. 추가하려면 항목을 삭제하세요.",
    errors: {
      empty: "항목을 입력하세요.",
      tooLong: "{{limit, number}}자 이하로 입력하세요.",
    },
  },
  pick: {
    region: "뽑기 결과",
    pick: "뽑기",
    again: "다시 뽑기",
    label: "뽑힌 항목",
    hint: "뽑기를 누르면 결과가 여기에 표시됩니다.",
    needItem: "뽑으려면 항목을 추가하세요.",
    announced: "뽑힌 항목: “{{text}}”",
  },
  common: {
    saveFailed:
      "변경 사항을 저장하지 못했습니다. 페이지를 새로 고친 뒤 다시 시도하세요.",
  },
  storage: {
    unavailableTitle: "목록을 저장할 수 없습니다",
    unavailableBody:
      "이 브라우저가 저장을 막고 있어, 페이지를 닫으면 변경 사항이 사라집니다.",
    fullTitle: "목록을 저장할 수 없습니다",
    fullBody:
      "이 브라우저의 저장 공간이 가득 차, 페이지를 닫으면 변경 사항이 사라집니다. 필요 없는 목록이나 항목을 삭제하세요.",
    invalidTitle: "저장된 목록을 읽을 수 없습니다",
    invalidBody:
      "이 브라우저의 데이터가 손상되었거나 알 수 없는 버전입니다. 데이터는 그대로 두었고 편집은 꺼 두었습니다.",
    copy: "데이터 복사",
    copied: "저장된 데이터를 복사했습니다.",
    copyFailed: "복사하지 못했습니다. 브라우저가 클립보드 접근을 막았습니다.",
    discard: "데이터 삭제",
    discardTitle: "저장된 데이터를 삭제할까요?",
    discardBody:
      "읽을 수 없는 데이터를 이 브라우저에서 삭제하고 빈 상태로 다시 시작합니다. 필요할 수 있다면 먼저 복사하세요. 되돌릴 수 없습니다.",
    discardConfirm: "데이터 삭제",
    discardFailed:
      "데이터를 삭제하지 못했습니다. 페이지를 새로 고친 뒤 다시 시도하세요.",
    cancel: "취소",
    discarded:
      "저장된 데이터를 삭제했습니다. 이제 목록을 다시 만들 수 있습니다.",
  },
  notFound: {
    title: "페이지를 찾을 수 없습니다",
    body: "이 페이지나 목록이 없습니다.",
    backToLists: "목록으로 돌아가기",
  },
  footer: {
    privacy: "개인정보",
    licenses: "오픈소스 라이선스",
    source: "소스 코드",
  },
  privacy: {
    title: "개인정보",
    noPersonalData:
      "Argmax는 개인정보를 수집하지 않습니다. 계정도 쿠키도 없습니다.",
    localOnly:
      "목록과 선택한 언어는 이 브라우저의 로컬 저장소에만 저장됩니다. 어디로도 전송되지 않으며, 브라우저 데이터를 지우면 함께 지워집니다. 탭이 열려 있는 동안에는 뒤로·앞으로 가기를 위해 스크롤 위치도 보관하며, 탭을 닫으면 지워집니다.",
    noTracking:
      "사용 현황을 파악하기 위해 Argmax는 익명 사용 횟수를 Umami Cloud로 보냅니다. 어떤 화면을 열었는지, 목록을 만들었는지, 뽑기를 했는지와 함께 브라우저 언어와 화면 크기를 보냅니다. 목록 이름과 항목은 보내지 않으며, 쿠키를 쓰지 않고, 사용자를 식별할 수 있는 정보도 없습니다. Umami Cloud는 미국과 유럽연합에서 운영됩니다. 브라우저가 Global Privacy Control이나 Do Not Track 신호를 보내면 아무것도 보내지 않습니다.",
    hosting:
      "호스팅 업체인 Cloudflare는 사이트를 제공하고 보호하기 위해 IP 주소 같은 기술적인 요청 정보를 처리합니다.",
    questions: "문의나 요청은 GitHub 이슈로 남겨 주세요.",
  },
};
