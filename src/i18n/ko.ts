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
    storedLocally: "목록은 이 브라우저에만 저장됩니다.",
    storedLocallyDetail:
      "브라우저 데이터를 지우면 삭제되며, 다른 기기에서는 보이지 않습니다.",
    emptyTitle: "아직 목록이 없습니다",
    emptyBody: "첫 목록을 만드세요. 예: “점심 메뉴”",
    // Korean has no plural forms; the one and other keys exist to match the English resources.
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
    itemCount_one: "항목 {{count, number}}개",
    itemCount_other: "항목 {{count, number}}개",
    addLabel: "새 항목",
    add: "추가",
    added: "“{{text}}” 항목을 추가했습니다.",
    saved: "“{{text}}” 항목을 저장했습니다.",
    removed: "“{{text}}” 항목을 삭제했습니다.",
    undo: "되돌리기",
    restored: "“{{text}}” 항목을 되돌렸습니다.",
    actions: "목록 메뉴",
    rename: "이름 바꾸기",
    renamed: "목록 이름을 바꿨습니다: “{{name}}”",
    delete: "목록 삭제",
    deleteTitle: "“{{name}}” 목록을 삭제할까요?",
    deleteBody_zero: "되돌릴 수 없습니다.",
    deleteBody_one:
      "항목 {{count, number}}개도 함께 삭제됩니다. 되돌릴 수 없습니다.",
    deleteBody_other:
      "항목 {{count, number}}개도 함께 삭제됩니다. 되돌릴 수 없습니다.",
    editLabel: "항목 내용",
    edit: "“{{text}}” 수정",
    remove: "“{{text}}” 삭제",
    save: "저장",
    cancel: "취소",
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
    placeholder: "—",
    needItem: "뽑을 항목을 추가하세요.",
    announced: "뽑힌 항목: “{{text}}”",
  },
  common: {
    saveFailed:
      "변경 사항을 저장하지 못했습니다. 페이지를 새로 고친 뒤 다시 시도하세요.",
  },
  storage: {
    unavailableTitle: "목록을 저장할 수 없습니다",
    unavailableBody:
      "이 브라우저가 저장을 막고 있어, 페이지를 닫으면 변경 사항이 사라집니다. 변경 사항을 유지하려면 이 사이트의 데이터 저장을 허용하거나 다른 브라우저를 쓰세요.",
    fullTitle: "목록을 저장할 수 없습니다",
    fullBody:
      "이 브라우저의 저장 공간이 가득 차, 페이지를 닫으면 변경 사항이 사라집니다. 필요 없는 목록이나 항목을 삭제하세요.",
    invalidTitle: "저장된 목록을 읽을 수 없습니다",
    invalidBody:
      "저장된 데이터가 손상되었거나 알 수 없는 버전입니다. 데이터는 그대로 두고 편집을 껐습니다.",
    copy: "데이터 복사",
    copied: "저장된 데이터를 복사했습니다.",
    copyFailed:
      "복사하지 못했습니다. 클립보드 접근을 허용한 뒤 다시 시도하세요.",
    discard: "데이터 삭제",
    discardTitle: "저장된 데이터를 삭제할까요?",
    discardBody:
      "읽을 수 없는 데이터를 이 브라우저에서 삭제하고 목록 없이 다시 시작합니다. 사본이 필요하면 먼저 데이터 복사를 누르세요. 되돌릴 수 없습니다.",
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
    privacy: "개인정보 처리방침",
    licenses: "라이선스",
    source: "소스 코드",
    feedback: "의견 보내기",
  },
  privacy: {
    title: "개인정보 처리방침",
    noAccounts:
      "Argmax 자체는 계정과 쿠키를 쓰지 않으며, 개인정보를 요청하거나 저장하지 않습니다.",
    localOnly:
      "목록과 선택한 언어는 이 브라우저의 로컬 저장소에만 저장됩니다. 어디로도 전송되지 않으며, 브라우저 데이터를 지우면 함께 지워집니다. 탭이 열려 있는 동안에는 브라우저가 뒤로·앞으로 가기에 쓸 스크롤 위치도 보관하며, 탭을 닫으면 지워집니다.",
    analyticsIntro:
      "사용 현황을 파악하기 위해 Argmax는 미국의 Umami Software, Inc.가 운영하는 Umami Cloud로 사용 데이터를 보냅니다. 화면을 열거나 목록을 만들거나 뽑기를 할 때마다 다음 내용을 HTTPS로 보냅니다.",
    analyticsScreen: "어떤 화면을 열었는지",
    analyticsEvent:
      "목록을 만들었거나 뽑기를 했는지, 그리고 첫 방문인지(이 브라우저에 있는 목록을 만든 시각으로 판단)",
    analyticsDevice: "브라우저 언어와 화면 크기",
    analyticsReferrer: "링크한 사이트(페이지 주소 제외)",
    analyticsNever: "목록 이름과 항목은 보내지 않습니다.",
    analyticsUmami:
      "모든 웹 요청과 마찬가지로 IP 주소와 브라우저 정보(User-Agent)가 Umami에 전달됩니다. Umami의 오픈소스 데이터 모델에 따르면 Umami는 IP 주소를 저장하지 않습니다. IP 주소로 대략적인 위치(국가, 지역, 도시)를, User-Agent로 브라우저, 운영체제, 기기 종류를 알아내 기록합니다. Umami는 이 정보를 6개월 동안 보관합니다.",
    analyticsOptOut:
      "브라우저가 Global Privacy Control이나 Do Not Track 신호를 보내면 Argmax는 아무것도 보내지 않으며, 똑같이 동작합니다.",
    umamiPolicy: "Umami 개인정보 처리방침",
    umamiTerms: "Umami 이용약관",
    hosting:
      "호스팅 업체인 Cloudflare는 사이트를 제공하고 보호하기 위해 IP 주소 같은 기술적인 요청 정보를 처리합니다.",
    questions: "문의나 요청은 GitHub 이슈로 남겨 주세요.",
    privacyContact: "공개하기 어려운 개인정보 문의: {{email}}",
    updated: "최종 수정일: 2026년 10월 4일",
  },
};
