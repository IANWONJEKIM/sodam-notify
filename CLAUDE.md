# 소담상회 올인원 앱 — 작업 안내 (Claude Code용)

이 저장소는 오프라인 편집샵 **소담상회**의 앱을 담고 있어요. 주인은 김원제(wonjea47@gmail.com)예요.
답변은 **한국어로, 짧고 쉽게** 해 주세요. 큰 작업은 **먼저 의견·계획을 말하고 확인받은 뒤** 만들어요. 요청하지 않은 기능은 붙이지 않아요.

## 목표
슬랙 같은 대화 앱을 뼈대로 만들고, 지금 claude.ai 아티팩트로 흩어져 있는 매장 운영 도구(워크툴, 근무표, 대시보드, 정산 등)를 하나씩 이 앱 안으로 옮겨요. **BASE CAMP는 옮기지 않아요**(앱 첫 화면이 그 역할). 앱 밖 링크용 '바로가기' 정도만 둬요.

## 저장소 구조
- `/` (index.html, firebase-messaging-sw.js, config.js, manifest.json, icon-*.png): **지금 직원들이 쓰는 '소담상회' 알림 앱(PWA)**. 이름 + 연락처 뒷번호 로그인 → Apps Script(`config.gasUrl`)가 FCM 토큰을 구글 시트에 저장. 아이콘으로 열면 BASE CAMP로 이동, 알림을 누르면 `?go=탭`으로 워크툴의 해당 탭을 열어요. **새 앱이 완성될 때까지 건드리지 말 것.**
- `/app/`: **새 올인원 앱 (개발 중)**. 단일 `index.html` + Firebase compat SDK 10.12.2(gstatic), `../config.js`의 Firebase 설정을 같이 써요.
- `/app/firestore.rules`: Firestore 보안 규칙. 콘솔에 게시된 것과 같아야 해요.
- 배포: GitHub Pages (https://ianwonjekim.github.io/sodam-notify/), main에 푸시하면 몇 분 안에 반영.

## Firebase (프로젝트 sodam-notify)
- Authentication: Google 로그인 켜짐, 승인 도메인에 ianwonjekim.github.io 추가됨.
- Firestore: Standard, (default), asia-northeast3. 규칙은 `/app/firestore.rules`.
- FCM: 웹 푸시 VAPID 키는 config.js에. 서비스 계정 키는 Apps Script 속성(SA_JSON)에만 있어요(저장소에 넣지 말 것).
- 아직 안 함: Storage(사진) · Cloud Functions(즉시 알림) → Blaze 요금제 필요. 예산 알림(월 1,000원 정도) 걸기로 함. Storage 무료 범위는 미국 지역 버킷만.

## 새 앱 1단계 (완료 · 2026-11-27, 비공개 채널·프로젝트 보드 추가)
- 구글 로그인, `staff/{gmail소문자}` 에 등록된 사람만 입장. 원제님 Gmail은 자동 관리자.
- 데이터: `staff/{email}` {name, teams[], admin, active} · `users/{uid}` {email, name, photo, seen} · `users/{uid}/reads/{c_채널id|d_dmid}` {at}
- `channels/{cid}` {name, topic, ord, priv(bool), mem[Gmail], kind('proj'|없음), start, end, done, last, lastAt} — priv면 mem만 메시지·할 일 접근(관리자는 설정만). 프로젝트 = kind 'proj' + 비공개, 관리자만 만듦
  - `channels/{cid}/tasks/{tid}` {title, memo, who[Gmail], due(YYYY-MM-DD), st(todo|doing|done), doneAt, by, at, cc} → `cmts/{id}` {uid, text, at, men[]}
  - 사이드바 안 읽은 개수: 읽은 시각 이후 남이 보낸 메시지를 100개까지 세서 표시(99+) → `msgs/{mid}` {uid, text, at, men[], re{like|heart|lol|ok|eyes|pray:[uid]}, rc, ru[], lastReplyAt, ed, del} → `replies/{rid}`
- `dms/{작은uid_큰uid}` {m:[uid,uid], last, lastAt} → `msgs` → `replies`. **DM은 두 사람만 읽기/쓰기**(관리자도 못 봄, 규칙으로 보장).
- 팀: MANAGER · MD · OPERATION · VMD · PT
- 카카오톡 등 앱 안 브라우저는 구글 로그인이 막혀요 → 카카오톡은 `kakaotalk://web/openExternal`로 기본 브라우저로 넘기고, 나머지는 '사파리·크롬에서 열기' 안내.
- 화면: PC 3단(목록·대화·스레드), 휴대폰 한 화면씩. Enter 보내기, @이름 멘션 자동완성, 이모지 반응, 수정·삭제, 안 읽음 점.

## 다음 할 일 (2단계)
1. 사진 올리기 (올릴 때 300KB 안팎으로 줄이기, 채팅 사진은 90일 뒤 자동 삭제 — 업무 기록 사진은 남김)
2. 즉시 알림: Cloud Functions에서 새 메시지(@멘션·DM·스레드 답글)마다 FCM 발송. 토큰은 새 앱에서 로그인한 사용자별로 저장. 알림 시간 규칙(지금 워크툴 알림은 화~일 10:30~19:30)을 채팅에도 적용할지 원제님께 물어볼 것.
3. 직원 등록 일괄 가져오기(워크툴 '직원' 카드와 같은 명단)
4. 완성 후 루트 아이콘(소담상회 앱)이 `/app/`을 열도록 전환 — 직원들 재설치 불필요하게.
5. 그 뒤 기능 옮기기 순서(안): 근무표 → 업무 지시 → 발주·입고 → 재고 → VMD → 대시보드 → 정산. 기존 아티팩트 데이터는 옮길 때 함께 이전.

## 지켜야 할 것
- 셀러관리 보드 시트(1xTOONXaAHew5cVgk6V5j_ABLiTWB3dbVhu60cwvEbkU)와 상품 DB의 '상품 리스트(토스 포스 양식)' 탭에는 절대 쓰지 않아요(읽기만).
- 예약 작업(스케줄)은 만들지 않아요.
- 테스트 후 배포. 보안 규칙을 바꾸면 Firebase 에뮬레이터로 먼저 확인하고, 원제님 콘솔/CLI로 게시.
