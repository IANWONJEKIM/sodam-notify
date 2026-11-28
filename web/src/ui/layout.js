/* 사이드바 · 가운데 화면 */
import { db } from '../firebase.js';
import { esc, md } from '../util.js';
import {
  isAdmin,
  nameOf,
  convRef,
  dmOther,
  dmOthers,
  dmName,
  joined,
  chan,
  dm,
  vis,
  sname,
  narrow,
  S,
} from '../state.js';
import { ucount, cntHTML } from '../unread.js';
import { av, pav, gav, compHTML } from '../ui/common.js';
import { boardHTML } from '../ui/board.js';
import { botHTML, actTabHTML } from '../ui/tabs.js';
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
  if (d && d.g) return esc(dmName(d)) + '<small>그룹 DM · ' + (d.m || []).length + '명</small>';
  return d ? esc(nameOf(dmOther(d))) + (dmOther(d) === S.u.uid ? ' <small>나에게 메모</small>' : '') : 'DM';
}
/* 나 (사진·이름·로그아웃) */
function meHTML() {
  return (
    '<div class="me">' +
    av(S.u.uid) +
    '<span class="nm"><b>' +
    esc(nameOf(S.u.uid)) +
    '</b><br><span style="color:var(--side-muted);font-size:12px">' +
    esc(S.email) +
    '</span></span><button data-act="logout">로그아웃</button></div>'
  );
}
/* 왼쪽 목록: 탭에 따라 홈(채널·DM) / DM / 내 활동 / 나중에 보기.
   휴대폰은 아래 탭 막대를 붙이고, '나'는 홈 목록 맨 아래에 둬요 */
function sideHTML() {
  var ws = '<div class="ws"><img src="../icon-192.png" alt=""><b>소담상회</b></div>',
    foot = narrow() ? botHTML() : meHTML();
  if (S.tab === 'act') return ws + '<div class="slist tab">' + actTabHTML() + '</div>' + foot;
  var h =
    ws +
    '<div class="slist"><button class="si' +
    (S.view && S.view.k === 'cal' ? ' on' : '') +
    '" data-act="cal"><span class="hash">📅</span><span class="nm">캘린더</span></button>';
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
  var V = S.channels.filter(function (c) {
      return vis(c) && joined(c);
    }),
    P = V.filter(function (c) {
      return c.kind === 'proj';
    }),
    PD = P.filter(function (c) {
      return c.done;
    }),
    cv = S.view && S.view.k === 'c' && chan(S.view.id);
  h +=
    '<div class="sh">채널<button data-act="cset" data-v="pub" title="채널 만들기" aria-label="채널 만들기">+</button></div>';
  V.forEach(function (c) {
    if (c.kind !== 'proj') h += chItem(c);
  });
  /* 들어가지 않은 공개 채널을 미리 보는 중이면 잠깐 목록에 보여요 */
  if (cv && !joined(cv) && vis(cv) && cv.kind !== 'proj') h += chItem(cv).replace('class="si', 'class="si pv');
  h +=
    '<button class="si' +
    (S.view && S.view.k === 'browse' ? ' on' : '') +
    '" data-act="browse"><span class="hash">+</span><span class="nm">채널 찾아보기</span></button>';
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
    var os = dmOthers(d),
      o = os[0],
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
      (d.g ? gav(os) : av(o, 1)) +
      '<span class="nm">' +
      esc(d.g ? dmName(d) : nameOf(o)) +
      (!d.g && o === S.u.uid ? ' (나)' : '') +
      '</span>' +
      cntHTML(n) +
      '</button>';
  });
  if (isAdmin())
    h +=
      '<div class="sh">관리</div><button class="si' +
      (S.view && S.view.k === 'admin' ? ' on' : '') +
      '" data-act="admin" data-v="staff"><span class="hash">⚙</span><span class="nm">직원 · 채널 관리</span></button>';
  return h + (narrow() ? meHTML() + '</div>' : '</div>') + foot;
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
      '<div class="top"><button class="back" data-act="back" aria-label="뒤로">‹</button><h2>새 DM</h2><button class="btn sm" data-act="dmgo"' +
      ((S.nd || []).length ? '' : ' disabled') +
      '>대화하기</button></div>' +
      newdmHTML()
    );
  if (v.k === 'cset') return csetHTML();
  if (v.k === 'browse')
    return (
      '<div class="top"><button class="back" data-act="back" aria-label="뒤로">‹</button><h2>채널 찾아보기</h2></div>' +
      browseHTML()
    );
  if (v.k === 'cinfo') return cinfoHTML(chan(v.id));
  if (v.k === 'pins') return pinsHTML(v);
  if (v.k === 'cal')
    return (
      '<div class="top"><button class="back" data-act="back" aria-label="뒤로">‹</button><h2>📅 캘린더</h2></div>' +
      '<div class="page"><div class="card"><h3>준비 중이에요</h3><p class="muted" style="margin:0">직원별 근무·휴무와 매장 이벤트를 달력으로 보는 화면이 들어올 자리예요.</p></div></div>'
    );
  var c = v.k === 'c' ? chan(v.id) : null,
    d0 = v.k === 'd' ? dm(v.id) : null,
    ph =
      v.k === 'c'
        ? ((c || {}).name || '') + '에 메시지 보내기'
        : d0 && d0.g
          ? dmName(d0) + '에게 메시지'
          : nameOf(d0 ? dmOther(d0) : '') + '님에게 메시지';
  var pinb =
    '<button class="btn sm ghost" data-act="pins" title="고정된 메시지"' +
    (S.pins.length ? '' : ' hidden') +
    '>📌 <span class="n">' +
    S.pins.length +
    '</span></button>';
  var tool =
    pinb +
    (c
      ? '<button class="btn sm ghost" data-act="cinfo" data-id="' +
        esc(c.id) +
        '" title="멤버 · 채널 정보">👥 ' +
        (c.mem || []).length +
        '</button>' +
        (isAdmin() ? '<button class="btn sm ghost" data-act="cset" data-id="' + esc(c.id) + '">설정</button>' : '')
      : '');
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
  /* 들어가지 않은 공개 채널: 읽기만 하고 아래에 '들어가기' */
  if (c && !joined(c))
    return (
      h +
      '<div class="msgs" id="msgs"></div><div class="joinbar"><p><b># ' +
      esc(c.name) +
      '</b> 채널을 미리 보는 중이에요</p><div class="row"><button class="btn ghost" data-act="browse">채널 목록으로</button><button class="btn" data-act="cjoin" data-id="' +
      esc(c.id) +
      '">들어가기</button></div></div>'
    );
  return h + '<div class="msgs" id="msgs"></div>' + compHTML('ta', ph);
}
/* 공개 채널 전체 목록 · 검색 (검색할 땐 아래 목록만 바꿔요: 한글 입력이 끊기지 않게) */
function browseHTML() {
  return (
    '<div class="page"><div class="card"><input class="inp" id="br-q" type="search" placeholder="채널 이름이나 설명으로 찾기" value="' +
    esc(S.bq || '') +
    '" autocomplete="off"><div id="br-list" class="stack">' +
    browseList() +
    '</div></div></div>'
  );
}
function browseList() {
  var q = String(S.bq || '')
      .trim()
      .toLowerCase(),
    L = S.channels.filter(function (c) {
      return !c.priv && c.kind !== 'proj';
    }),
    F = L.filter(function (c) {
      return !q || (String(c.name) + ' ' + String(c.topic || '')).toLowerCase().indexOf(q) >= 0;
    });
  return (
    '<p class="small muted" style="margin:0">공개 채널 ' +
    L.length +
    '개' +
    (q ? ' · 찾은 것 ' + F.length + '개' : '') +
    ' · 비공개 채널은 초대받아야 보여요</p>' +
    (F.length
      ? F.map(function (c) {
          var j = joined(c);
          return (
            '<div class="srow"><button class="who lk" data-act="open" data-k="c" data-id="' +
            esc(c.id) +
            '"><b># ' +
            esc(c.name) +
            (j ? ' <span class="pill ok">들어감</span>' : '') +
            '</b><span class="small muted">멤버 ' +
            (c.mem || []).length +
            '명' +
            (c.topic ? ' · ' + esc(c.topic) : '') +
            '</span></button>' +
            (j
              ? '<button class="btn sm ghost" data-act="cleave" data-id="' + esc(c.id) + '">나가기</button>'
              : '<button class="btn sm" data-act="cjoin" data-id="' + esc(c.id) + '">들어가기</button>') +
            '</div>'
          );
        }).join('')
      : '<p class="muted" style="margin:0">' + (q ? '찾는 채널이 없어요.' : '아직 채널이 없어요.') + '</p>')
  );
}
/* 고정된 메시지 목록 */
function pinsHTML(v) {
  var back =
    '<button class="back" data-act="open" data-k="' +
    v.ck +
    '" data-id="' +
    esc(v.id) +
    '" aria-label="대화로">‹</button>';
  var h =
    '<div class="top">' +
    back +
    '<h2>📌 고정된 메시지 <small>' +
    convTitle({ k: v.ck, id: v.id }).replace(/<small>.*<\/small>/, '') +
    '</small></h2><button class="btn sm ghost" data-act="open" data-k="' +
    v.ck +
    '" data-id="' +
    esc(v.id) +
    '">대화로</button></div><div class="page"><div class="card">';
  if (!S.pins.length)
    h += '<p class="muted" style="margin:0">고정된 메시지가 없어요. 메시지 메뉴에서 📌 채널에 고정을 눌러요.</p>';
  S.pins.forEach(function (x) {
    h +=
      '<div class="srow"><button class="who lk" data-act="gomsg" data-v="' +
      esc([v.ck, v.id, x.id, ''].join('/')) +
      '"><b>' +
      av(x.uid, 1) +
      ' ' +
      esc(nameOf(x.uid)) +
      '</b><span class="small muted">' +
      esc(String(x.text || (x.fwd ? '↪ ' + (x.fwd.text || '') : '')).slice(0, 140)) +
      '</span><span class="small muted">📌 ' +
      esc(nameOf(x.pinBy)) +
      '님이 고정</span></button></div>';
  });
  return h + '</div></div>';
}
/* 채널 정보 · 멤버 목록 · 나가기 */
function cinfoHTML(c) {
  if (!c) return '<div class="top"><h2>채널</h2></div><div class="empty">채널을 찾을 수 없어요.</div>';
  var j = joined(c),
    proj = c.kind === 'proj',
    mem = (c.mem || []).slice().sort(function (a, b) {
      return String(sname(a)).localeCompare(String(sname(b)), 'ko');
    });
  var h =
    '<div class="top"><button class="back" data-act="open" data-k="c" data-id="' +
    esc(c.id) +
    '" aria-label="채널로">‹</button><h2>' +
    (proj ? '▦' : c.priv ? '🔒' : '#') +
    ' ' +
    esc(c.name) +
    '</h2></div><div class="page"><div class="card"><h3>' +
    (proj ? '프로젝트' : c.priv ? '비공개 채널' : '공개 채널') +
    '</h3>' +
    (c.topic ? '<p style="margin:0">' + esc(c.topic) + '</p>' : '') +
    '<p class="small muted" style="margin:0">' +
    (c.priv
      ? '멤버만 보고 쓸 수 있어요. 나가면 관리자가 다시 넣어 줘야 들어올 수 있어요.'
      : '모든 직원이 찾아서 들어올 수 있어요.') +
    '</p><div class="row"><span class="sp"></span>' +
    (isAdmin() ? '<button class="btn ghost" data-act="cset" data-id="' + esc(c.id) + '">설정</button>' : '') +
    (j
      ? S.cleave === c.id
        ? '<button class="btn danger" data-act="cleave" data-id="' + esc(c.id) + '">정말 나가기</button>'
        : '<button class="btn ghost" data-act="cleave" data-id="' + esc(c.id) + '">채널 나가기</button>'
      : !c.priv
        ? '<button class="btn" data-act="cjoin" data-id="' + esc(c.id) + '">들어가기</button>'
        : '') +
    '</div></div><div class="card"><h3>멤버 ' +
    mem.length +
    '명</h3><div class="plist">' +
    mem
      .map(function (e) {
        return (
          '<button disabled style="opacity:1">' +
          pav(e) +
          '<span><b>' +
          esc(sname(e)) +
          (e === S.email ? ' (나)' : '') +
          '</b><br><span class="small muted">' +
          esc(((S.staff[e] || {}).teams || []).join(' · ')) +
          '</span></span></button>'
        );
      })
      .join('') +
    '</div></div></div>';
  return h;
}

export { convTitle, sideHTML, mainHTML, browseList };
