/* 화면 위에 뜨는 것: 휴대폰 아래 메뉴(길게 누르기) · 전달 창 */
import { esc, EMO } from '../util.js';
import { nameOf, S } from '../state.js';
import { findMsg, isSaved, fwdTargets } from '../msgact.js';
import { menuItems } from '../ui/messages.js';
import { fmt } from '../ui/common.js';
import { pickerHTML, gridHTML } from './emoji.js';
import { stSheetHTML, meMenuHTML } from './profile.js';
import { itemMenuHTML, secMenuHTML, secNewHTML } from './sidemenu.js';
import { qsHTML, qsListHTML } from '../search.js';

function ovEl() {
  var o = document.getElementById('ov');
  if (!o) {
    o = document.createElement('div');
    o.id = 'ov';
    document.body.appendChild(o);
  }
  return o;
}
function renderOverlay() {
  var o = ovEl(),
    h = '';
  if (S.ep) {
    /* 이모지 창: 떠 있으면 검색칸은 두고 목록만 바꿔요 */
    o.className = 'ov on';
    var g = o.querySelector('#ep-grid');
    if (g && o.querySelector('#ep-q')) g.innerHTML = gridHTML();
    else o.innerHTML = pickerHTML();
    return;
  }
  /* 상태 창: 적던 문구가 지워지지 않게, 떠 있으면 다시 그리지 않아요 (버튼을 누를 때만 새로) */
  if (S.stp && !S.stp.redraw && o.querySelector('#st-t')) return;
  /* 섹션 이름 적는 중이면 그대로 */
  if ((S.secnew && o.querySelector('#sec-new')) || (S.secm && !S.secm_redraw && o.querySelector('#sec-name'))) return;
  S.secm_redraw = false;
  if (S.stp) S.stp.redraw = false;
  /* 빠른 이동: 떠 있으면 목록만 바꿔요 */
  if (S.qs) {
    var ql = o.querySelector('#qs-l');
    o.className = 'ov on';
    if (ql && o.querySelector('#qs-q')) ql.innerHTML = qsListHTML();
    else o.innerHTML = qsHTML();
    return;
  }
  if (S.fwd) h = fwdHTML();
  else if (S.stp) h = stSheetHTML();
  else if (S.mem) h = meMenuHTML();
  else if (S.secnew) h = secNewHTML();
  else if (S.secm) h = secMenuHTML();
  else if (S.sim) h = itemMenuHTML();
  else if (S.sheet) h = sheetHTML();
  o.className = h ? 'ov on' + (S.fwd ? ' fw' : '') : 'ov';
  /* 전달 창이 이미 떠 있으면 입력칸은 그대로 두고 목록만 바꿔요 (한글 입력이 끊기지 않게) */
  if (S.fwd && o.querySelector('#fw-q')) {
    var l = o.querySelector('#fw-list');
    if (l) l.innerHTML = fwdList();
    var go = o.querySelector('[data-act="fwgo"]');
    if (go) go.disabled = !S.fwd.to;
    return;
  }
  o.innerHTML = h;
}
/* 휴대폰: 메시지를 길게 누르면 아래에서 올라오는 메뉴 */
function sheetHTML() {
  var sh = S.sheet,
    x = findMsg(sh.id, sh.rid);
  if (!x) return '';
  var ids = ' data-id="' + esc(sh.id) + '"' + (sh.rid ? ' data-rid="' + esc(sh.rid) + '"' : ''),
    sv = isSaved(sh.id, sh.rid);
  return (
    '<div class="ovbg" data-act="ovclose"></div><div class="sheet" role="dialog" aria-label="메시지 메뉴"><div class="grab"></div>' +
    '<div class="sheet-q"><b>' +
    esc(nameOf(x.uid)) +
    '</b> ' +
    esc(String(x.text || (x.fwd ? '↪ 전달한 메시지' : '')).slice(0, 60)) +
    '</div><div class="sheet-emo">' +
    EMO.map(function (e) {
      return (
        '<button data-act="react" data-k="' + e[0] + '"' + ids + ' aria-label="' + e[0] + '">' + e[1] + '</button>'
      );
    }).join('') +
    '<button data-act="epre"' +
    ids +
    ' aria-label="다른 이모지">➕</button></div><div class="sheet-list">' +
    (sh.rid ? '' : '<button data-act="thread" data-id="' + esc(sh.id) + '"><span>💬</span>답글 달기</button>') +
    '<button data-act="save"' +
    ids +
    '><span>🔖</span>' +
    (sv ? '나중에 보기에서 빼기' : '나중에 보기') +
    '</button>' +
    menuItems(x, sh.rid, ids) +
    '</div><button class="btn ghost sheet-x" data-act="ovclose">닫기</button></div>'
  );
}
/* 전달: 보낼 곳 고르기 + 한마디 */
function fwdList() {
  var L = fwdTargets(S.fwd.q),
    to = S.fwd.to;
  if (!L.length) return '<p class="muted small" style="margin:8px 4px">찾는 대화가 없어요.</p>';
  return L.slice(0, 50)
    .map(function (t) {
      var on = to && to.k === t.k && to.id === t.id;
      return (
        '<button data-act="fwto" data-k="' +
        t.k +
        '" data-id="' +
        esc(t.id) +
        '" aria-pressed="' +
        !!on +
        '"><span class="ck" aria-hidden="true">' +
        (on ? '✓' : '') +
        '</span><span class="nm">' +
        esc(t.name) +
        '</span></button>'
      );
    })
    .join('');
}
function fwdHTML() {
  var f = S.fwd;
  return (
    '<div class="ovbg" data-act="ovclose"></div><div class="dlg" role="dialog" aria-label="메시지 전달"><div class="dlg-hd"><h3>메시지 전달</h3><button class="btn sm ghost" data-act="ovclose">닫기</button></div>' +
    '<div class="fwdq"><div class="small muted">↪ ' +
    esc(nameOf(f.x.uid)) +
    '님 메시지</div><div class="tx">' +
    fmt(String(f.x.text || '').slice(0, 300)) +
    '</div></div>' +
    '<input class="inp" id="fw-q" type="search" placeholder="채널이나 사람 이름으로 찾기" autocomplete="off" value="' +
    esc(f.q || '') +
    '"><div class="plist fwl" id="fw-list">' +
    fwdList() +
    '</div><textarea class="inp" id="fw-note" rows="2" placeholder="한마디 덧붙이기 (선택)"></textarea>' +
    '<div class="row"><span class="sp"></span><button class="btn ghost" data-act="ovclose">취소</button><button class="btn" data-act="fwgo"' +
    (f.to ? '' : ' disabled') +
    '>전달하기</button></div></div>'
  );
}

export { renderOverlay };
