/* 사이드바 · 가운데 화면 */
import { db } from '../firebase.js';
import { esc, md } from '../util.js';
import { isAdmin, nameOf, convRef, dmOther, chan, dm, vis, S } from '../state.js';
import { ucount, cntHTML } from '../unread.js';
import { av, compHTML } from '../ui/common.js';
import { boardHTML } from '../ui/board.js';
import { adminHTML, newdmHTML, csetHTML } from '../admin.js';

function convTitle(v) {
  if (!v) return '';
  if (v.k === 'c') {
    var c = chan(v.id);
    return (
      '<span class="muted">' +
      (c && c.kind === 'proj' ? '▦' : c && c.priv ? '🔒' : '#') +
      '</span> ' +
      esc(c ? c.name : '') +
      (c && c.kind === 'proj' && (c.start || c.end)
        ? '<small>' + md(c.start) + ' ~ ' + md(c.end) + (c.done ? ' · 완료' : '') + '</small>'
        : '') +
      (c && c.topic ? '<small>' + esc(c.topic) + '</small>' : '')
    );
  }
  var d = dm(v.id);
  return d ? esc(nameOf(dmOther(d))) + (dmOther(d) === S.u.uid ? ' <small>나에게 메모</small>' : '') : 'DM';
}
function sideHTML() {
  var h = '<div class="ws"><img src="../icon-192.png" alt=""><b>소담상회</b></div><div class="slist">';
  function chItem(c) {
    var k = 'c_' + c.id,
      on = S.view && S.view.k === 'c' && S.view.id === c.id,
      n = on ? 0 : ucount(k, c, db.collection('channels').doc(c.id));
    return (
      '<button class="si' +
      (on ? ' on' : '') +
      (n ? ' un' : '') +
      '" data-act="open" data-k="c" data-id="' +
      esc(c.id) +
      '"><span class="hash">' +
      (c.kind === 'proj' ? '▦' : c.priv ? '🔒' : '#') +
      '</span><span class="nm">' +
      esc(c.name) +
      '</span>' +
      cntHTML(n) +
      '</button>'
    );
  }
  var V = S.channels.filter(vis),
    P = V.filter(function (c) {
      return c.kind === 'proj';
    }),
    PD = P.filter(function (c) {
      return c.done;
    });
  h +=
    '<div class="sh">채널' +
    (isAdmin() ? '<button data-act="cset" data-v="pub" title="채널 만들기" aria-label="채널 만들기">+</button>' : '') +
    '</div>';
  V.forEach(function (c) {
    if (c.kind !== 'proj') h += chItem(c);
  });
  if (P.length || isAdmin()) {
    h +=
      '<div class="sh">프로젝트' +
      (isAdmin()
        ? '<button data-act="cset" data-v="proj" title="프로젝트 만들기" aria-label="프로젝트 만들기">+</button>'
        : '') +
      '</div>';
    P.forEach(function (c) {
      if (!c.done || S.showDone || (S.view && S.view.id === c.id)) h += chItem(c);
    });
    if (PD.length)
      h +=
        '<div class="sh"><button class="tg" data-act="showdone">' +
        (S.showDone ? '완료된 프로젝트 숨기기' : '완료된 프로젝트 ' + PD.length + '개 보기') +
        '</button></div>';
    if (!P.length)
      h += '<p class="small" style="color:var(--side-muted);margin:2px 10px">+ 를 눌러 프로젝트를 만들어요</p>';
  }
  h += '<div class="sh">다이렉트 메시지<button data-act="newdm" title="새 DM" aria-label="새 DM">+</button></div>';
  S.dms.forEach(function (d) {
    var o = dmOther(d),
      k = 'd_' + d.id,
      on = S.view && S.view.k === 'd' && S.view.id === d.id,
      n = on ? 0 : ucount(k, d, db.collection('dms').doc(d.id));
    if (!d.lastAt && !on) return;
    h +=
      '<button class="si' +
      (on ? ' on' : '') +
      (n ? ' un' : '') +
      '" data-act="open" data-k="d" data-id="' +
      esc(d.id) +
      '">' +
      av(o, 1) +
      '<span class="nm">' +
      esc(nameOf(o)) +
      (o === S.u.uid ? ' (나)' : '') +
      '</span>' +
      cntHTML(n) +
      '</button>';
  });
  if (isAdmin())
    h +=
      '<div class="sh">관리</div><button class="si' +
      (S.view && S.view.k === 'admin' ? ' on' : '') +
      '" data-act="admin" data-v="staff"><span class="hash">⚙</span><span class="nm">직원 · 채널 관리</span></button>';
  return (
    h +
    '</div><div class="me">' +
    av(S.u.uid) +
    '<span class="nm"><b>' +
    esc(nameOf(S.u.uid)) +
    '</b><br><span style="color:var(--side-muted);font-size:12px">' +
    esc(S.email) +
    '</span></span><button data-act="logout">로그아웃</button></div>'
  );
}
function mainHTML() {
  var v = S.view;
  if (!v) return '<div class="top"><h2>소담상회</h2></div><div class="empty">왼쪽에서 채널이나 DM을 골라 주세요.</div>';
  if (v.k === 'admin')
    return (
      '<div class="top"><button class="back" data-act="back" aria-label="뒤로">‹</button><h2>직원 · 채널 관리</h2></div>' +
      adminHTML()
    );
  if (v.k === 'newdm')
    return (
      '<div class="top"><button class="back" data-act="back" aria-label="뒤로">‹</button><h2>새 DM</h2></div>' +
      newdmHTML()
    );
  if (v.k === 'cset') return csetHTML();
  var c = v.k === 'c' ? chan(v.id) : null,
    ph =
      v.k === 'c'
        ? ((c || {}).name || '') + '에 메시지 보내기'
        : nameOf(dm(v.id) ? dmOther(dm(v.id)) : '') + '님에게 메시지';
  var tool =
    c && (c.priv || c.kind)
      ? '<button class="btn sm ghost" data-act="cset" data-id="' +
        esc(c.id) +
        '" title="멤버·설정">👥 ' +
        (c.mem || []).length +
        '</button>'
      : c && isAdmin()
        ? '<button class="btn sm ghost" data-act="cset" data-id="' + esc(c.id) + '">설정</button>'
        : '';
  var h =
    '<div class="top"><button class="back" data-act="back" aria-label="목록으로">‹</button><h2>' +
    convTitle(v) +
    '</h2>' +
    tool +
    '</div>';
  if (v.tab) {
    var open = S.tasks.filter(function (t) {
        return t.st !== 'done';
      }).length,
      n = ucount('c_' + v.id, c, convRef(v));
    h +=
      '<div class="tabs" role="tablist"><button role="tab" data-act="tab" data-v="task" aria-selected="' +
      (v.tab === 'task') +
      '">할 일 ' +
      open +
      '</button><button role="tab" data-act="tab" data-v="chat" aria-selected="' +
      (v.tab === 'chat') +
      '">대화' +
      (v.tab !== 'chat' && n ? ' ' + cntHTML(n) : '') +
      '</button></div>';
    if (v.tab === 'task') return h + boardHTML(c);
  }
  return h + '<div class="msgs" id="msgs"></div>' + compHTML('ta', ph);
}

export { convTitle, sideHTML, mainHTML };
