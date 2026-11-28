/* 사람 화면: 프로필 패널 · 내 프로필 고치기 · 설정 · 상태 고르기 · '나' 메뉴 */
import { esc } from '../util.js';
import { isAdmin, nameOf, narrow, S } from '../state.js';
import { av } from './common.js';
import {
  ST_PRESET,
  ST_UNTIL,
  stOf,
  stUntilLabel,
  stBadge,
  isOnline,
  prefs,
  teamsOf,
  lastSeenLabel,
} from '../people.js';

/* 오른쪽 칸(휴대폰은 한 화면): 사람 눌렀을 때 */
function profHTML(uid) {
  var u = S.users[uid] || {},
    me = uid === S.u.uid,
    st = stOf(uid),
    tm = teamsOf(uid),
    seen = lastSeenLabel(uid);
  var h =
    '<div class="top"><button class="back" data-act="tclose" aria-label="뒤로">‹</button><h2>프로필</h2><button class="btn sm ghost" data-act="tclose" style="' +
    (narrow() ? 'display:none' : '') +
    '">닫기</button></div><div class="page prof">';
  h +=
    '<div class="pbig">' +
    av(uid) +
    '</div><div class="pname"><b>' +
    esc(nameOf(uid)) +
    '</b>' +
    (u.dname && S.staff[u.email] && S.staff[u.email].name !== u.dname
      ? '<span class="small muted">' + esc(S.staff[u.email].name) + '</span>'
      : '') +
    '</div>';
  if (st)
    h +=
      '<div class="pst">' +
      esc(st.e || '') +
      ' ' +
      esc(st.t || '') +
      (st.until ? ' <span class="muted small">· ' + esc(stUntilLabel(st)) + '</span>' : '') +
      '</div>';
  h +=
    '<div class="pseen' +
    (isOnline(uid) ? ' on' : '') +
    '">' +
    (seen ? '<i></i>' + esc(seen) : '') +
    '</div><div class="card"><dl class="pdl">' +
    (u.title ? '<dt>직책</dt><dd>' + esc(u.title) + '</dd>' : '') +
    (tm.length
      ? '<dt>팀</dt><dd class="chips">' +
        tm
          .map(function (t) {
            return '<span class="chip" aria-pressed="true">' + esc(t) + '</span>';
          })
          .join('') +
        '</dd>'
      : '') +
    (u.phone
      ? '<dt>연락처</dt><dd><a href="tel:' + esc(u.phone.replace(/[^0-9+]/g, '')) + '">' + esc(u.phone) + '</a></dd>'
      : '') +
    (isAdmin() || me ? '<dt>Gmail</dt><dd class="small">' + esc(u.email || '') + '</dd>' : '') +
    '</dl></div><div class="row pbtns">' +
    (me
      ? '<button class="btn" data-act="stopen">상태 정하기</button><button class="btn ghost" data-act="meedit">프로필 고치기</button>'
      : '<button class="btn" data-act="profdm" data-v="' + esc(uid) + '">💬 DM 보내기</button>') +
    '</div></div>';
  return h;
}

/* 내 프로필 고치기 (가운데 화면) */
function meEditHTML() {
  var u = S.users[S.u.uid] || {},
    st = S.staff[S.email] || {};
  return (
    '<div class="top"><button class="back" data-act="back" aria-label="뒤로">‹</button><h2>내 프로필</h2></div><div class="page"><div class="card">' +
    '<div class="row">' +
    av(S.u.uid) +
    '<span class="small muted">사진은 구글 계정 사진을 써요. (사진 올리기는 2단계에서)</span></div>' +
    '<div><p class="lbl">표시 이름</p><input class="inp" id="pf-dname" maxlength="20" placeholder="' +
    esc(st.name || u.name || '') +
    '" value="' +
    esc(u.dname || '') +
    '"><p class="small muted" style="margin:4px 0 0">비워 두면 등록된 이름(' +
    esc(st.name || u.name || '') +
    ')으로 보여요. @멘션도 이 이름으로 해요.</p></div>' +
    '<div><p class="lbl">직책</p><input class="inp" id="pf-title" maxlength="20" placeholder="예: 매니저, MD 담당" value="' +
    esc(u.title || '') +
    '"></div>' +
    '<div><p class="lbl">연락처 (선택)</p><input class="inp" id="pf-phone" type="tel" maxlength="20" placeholder="010-0000-0000" value="' +
    esc(u.phone || '') +
    '"><p class="small muted" style="margin:4px 0 0">넣으면 직원 모두가 프로필에서 볼 수 있어요.</p></div>' +
    '<div><p class="lbl">팀</p><div class="chips">' +
    ((st.teams || []).length
      ? st.teams
          .map(function (t) {
            return '<span class="chip" aria-pressed="true">' + esc(t) + '</span>';
          })
          .join('')
      : '<span class="small muted">없음</span>') +
    '</div><p class="small muted" style="margin:4px 0 0">팀은 관리자가 정해요.</p></div>' +
    '<div class="row"><span class="sp"></span><button class="btn ghost" data-act="back">취소</button><button class="btn" data-act="mesave">저장</button></div></div></div>'
  );
}

/* 설정 (가운데 화면) */
function seg(name, cur, opts) {
  return (
    '<div class="seg" role="radiogroup">' +
    opts
      .map(function (o) {
        return (
          '<button role="radio" data-act="pref" data-k="' +
          name +
          '" data-v="' +
          o[0] +
          '" aria-checked="' +
          (cur === o[0]) +
          '">' +
          o[1] +
          '</button>'
        );
      })
      .join('') +
    '</div>'
  );
}
function setHTML() {
  var p = prefs();
  return (
    '<div class="top"><button class="back" data-act="back" aria-label="뒤로">‹</button><h2>설정</h2></div><div class="page">' +
    '<div class="card"><h3>화면</h3>' +
    seg('theme', p.theme, [
      ['system', '시스템'],
      ['light', '라이트'],
      ['dark', '다크'],
    ]) +
    '<p class="lbl" style="margin-top:6px">글자 크기</p>' +
    seg('fs', p.fs, [
      ['s', '작게'],
      ['m', '보통'],
      ['l', '크게'],
    ]) +
    '</div><div class="card"><h3>보내기</h3>' +
    seg('enter', p.enter, [
      ['send', 'Enter로 보내기'],
      ['newline', 'Enter는 줄 바꿈'],
    ]) +
    '<p class="small muted" style="margin:0">' +
    (p.enter === 'send' ? 'Shift+Enter로 줄을 바꿔요.' : 'Ctrl+Enter(맥은 ⌘+Enter)로 보내요.') +
    ' 휴대폰은 늘 ➤ 버튼으로 보내요.</p></div>' +
    '<div class="card"><h3>알림</h3><div class="notice">실제 알림은 다음 단계(즉시 푸시 알림)에서 켜져요. 지금 골라 두면 그때 그대로 적용돼요.</div>' +
    seg('nt.mode', p.nt.mode, [
      ['all', '모든 새 메시지'],
      ['men', '멘션·DM만'],
      ['off', '끄기'],
    ]) +
    '<label class="row small"><input type="checkbox" data-act="prefck" data-k="nt.dnd"' +
    (p.nt.dnd ? ' checked' : '') +
    '> 방해 금지 시간에는 알림 안 받기 (시간은 다음 단계에서 정해요)</label></div>' +
    '<p class="small muted">설정은 계정에 저장돼서 다른 기기에서도 똑같이 적용돼요.</p></div>'
  );
}

/* 상태 고르기 (아래에서 올라오는 창 / PC는 가운데 창) */
function stSheetHTML() {
  var d = S.stp;
  return (
    '<div class="ovbg" data-act="ovclose"></div><div class="dlg stdlg" role="dialog" aria-label="상태 정하기"><div class="dlg-hd"><h3>상태 정하기</h3><button class="btn sm ghost" data-act="ovclose">닫기</button></div>' +
    '<div class="strow"><button class="stemo" data-act="stemo" aria-label="이모지 고르기">' +
    esc(d.e || '😀') +
    '</button><input class="inp" id="st-t" maxlength="40" placeholder="지금 어떤 상태인가요? (예: 휴무)" value="' +
    esc(d.t || '') +
    '" autocomplete="off"></div>' +
    '<div class="stpre">' +
    ST_PRESET.map(function (p, i) {
      return '<button data-act="stpre" data-v="' + i + '"><span>' + p[0] + '</span>' + p[1] + '</button>';
    }).join('') +
    '</div><p class="lbl">언제 지울까요?</p><div class="chips">' +
    ST_UNTIL.map(function (u) {
      return (
        '<button class="chip" data-act="stuntil" data-v="' +
        u[0] +
        '" aria-pressed="' +
        (d.u === u[0]) +
        '">' +
        u[1] +
        '</button>'
      );
    }).join('') +
    '</div><div class="row">' +
    (stOf(S.u.uid) ? '<button class="btn ghost" data-act="stclear">상태 지우기</button>' : '') +
    '<span class="sp"></span><button class="btn" data-act="stsave">저장</button></div></div>'
  );
}

/* '나' 메뉴 */
function meMenuHTML() {
  var st = stOf(S.u.uid);
  return (
    '<div class="ovbg" data-act="ovclose"></div><div class="sheet mesheet" role="dialog" aria-label="나"><div class="grab"></div>' +
    '<div class="mehd">' +
    av(S.u.uid) +
    '<span><b>' +
    esc(nameOf(S.u.uid)) +
    stBadge(S.u.uid) +
    '</b><span class="small muted">' +
    (st ? esc(st.t || '') + (st.until ? ' · ' + esc(stUntilLabel(st)) : '') : esc(S.email)) +
    '</span></span></div><div class="sheet-list">' +
    '<button data-act="stopen"><span>😀</span>' +
    (st ? '상태 바꾸기' : '상태 정하기') +
    '</button><button data-act="prof" data-v="' +
    esc(S.u.uid) +
    '"><span>👤</span>내 프로필 보기</button><button data-act="meedit"><span>✏️</span>프로필 고치기</button><button data-act="setopen"><span>⚙️</span>설정</button><button data-act="logout" class="bad"><span>↩</span>로그아웃</button></div></div>'
  );
}

export { profHTML, meEditHTML, setHTML, stSheetHTML, meMenuHTML };
