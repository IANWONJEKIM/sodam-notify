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
import { meEditHTML, setHTML } from './profile.js';
import { stBadge, stOf, stUntilLabel } from '../people.js';
import { side, ordered } from '../side.js';
import { searchHTML } from '../search.js';
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
/* 나: 누르면 '나' 메뉴 (상태·프로필·설정·로그아웃) */
function meHTML() {
  var st = stOf(S.u.uid);
  return (
    '<button class="me" data-act="memenu" aria-label="나 · 상태·프로필·설정">' +
    av(S.u.uid) +
    '<span class="nm"><b>' +
    esc(nameOf(S.u.uid)) +
    stBadge(S.u.uid) +
    '</b><br><span style="color:var(--side-muted);font-size:12px">' +
    (st ? esc(st.t || '') + (st.until ? ' · ' + esc(stUntilLabel(st)) : '') : '상태 정하기') +
    '</span></span><span class="mechev">⋯</span></button>'
  );
}
/* 묶음별 지금 순서 (순서 바꾸기·끌어 놓기에서 써요) */
var GK = {};
/* 왼쪽 목록: 홈(즐겨찾기·내 섹션·채널·프로젝트·DM) / 활동.
   휴대폰은 아래 탭 막대를 붙이고, '나'는 홈 목록 맨 아래에 둬요 */
function sideHTML() {
  var ws =
      '<div class="ws"><img src="../icon-192.png" alt=""><b>소담상회</b>' +
      (narrow() ? '<button class="wsq" data-act="search" aria-label="검색">🔍</button>' : '') +
      '</div>',
    foot = narrow() ? botHTML() : meHTML();
  if (S.tab === 'act') return ws + '<div class="slist tab">' + actTabHTML() + '</div>' + foot;
  var sd = side(),
    h =
      ws +
      '<div class="slist"><button class="si' +
      (S.view && S.view.k === 'cal' ? ' on' : '') +
      '" data-act="cal"><span class="hash">📅</span><span class="nm">캘린더</span></button>';
  GK = {};
  /* 보일 수 있는 것들: 들어간 채널·프로젝트, 글이 있는 DM */
  var V = S.channels.filter(function (c) {
      return vis(c) && joined(c);
    }),
    INFO = {};
  V.forEach(function (c) {
    INFO['c_' + c.id] = { t: c.kind === 'proj' ? 'pj' : 'ch', c: c };
  });
  S.dms.forEach(function (d) {
    var on = S.view && S.view.k === 'd' && S.view.id === d.id;
    if (d.lastAt || on) INFO['d_' + d.id] = { t: 'dm', d: d };
  });
  function itemHTML(key, g) {
    var x = INFO[key],
      mu = sd.mute.indexOf(key) >= 0,
      on,
      n,
      icon,
      name;
    if (x.c) {
      var c = x.c;
      on = S.view && S.view.k === 'c' && S.view.id === c.id;
      n = on || mu ? 0 : ucount(key, c, db.collection('channels').doc(c.id));
      icon = '<span class="hash">' + (c.kind === 'proj' ? '▦' : c.priv ? '🔒' : '#') + '</span>';
      name = esc(c.name);
    } else {
      var d = x.d,
        os = dmOthers(d),
        o = os[0];
      on = S.view && S.view.k === 'd' && S.view.id === d.id;
      n = on || mu ? 0 : ucount(key, d, db.collection('dms').doc(d.id));
      icon = d.g ? gav(os) : av(o, 1);
      name = esc(d.g ? dmName(d) : nameOf(o)) + (d.g ? '' : stBadge(o)) + (!d.g && o === S.u.uid ? ' (나)' : '');
    }
    var re = S.reord === g;
    return (
      '<div class="si' +
      (on ? ' on' : '') +
      (n ? ' un' : '') +
      (mu ? ' mu' : '') +
      '" role="button" tabindex="0" data-act="open" data-k="' +
      (x.c ? 'c' : 'd') +
      '" data-id="' +
      esc(x.c ? x.c.id : x.d.id) +
      '" data-sk="' +
      esc(key) +
      '" data-g="' +
      esc(g) +
      '"' +
      (!narrow() && !re ? ' draggable="true"' : '') +
      '>' +
      icon +
      '<span class="nm">' +
      name +
      '</span>' +
      (mu ? '<span class="mui" aria-label="음소거">🔕</span>' : '') +
      cntHTML(n) +
      (re
        ? '<span class="mv"><button data-act="mvup" data-v="' +
          esc(key) +
          '" data-g="' +
          esc(g) +
          '" aria-label="위로">↑</button><button data-act="mvdn" data-v="' +
          esc(key) +
          '" data-g="' +
          esc(g) +
          '" aria-label="아래로">↓</button></span>'
        : '<button class="sim" data-act="simenu" data-v="' + esc(key) + '" aria-label="메뉴" title="메뉴">⋯</button>') +
      '</div>'
    );
  }
  /* 묶음 머리 + 항목들. 접어 두면 지금 보는 것·안 읽은 것만 보여요 */
  function group(g, title, keys, tools, empty) {
    keys = ordered(g, keys);
    GK[g] = keys;
    var shut = sd.shut.indexOf(g) >= 0,
      out =
        '<div class="sh" data-g="' +
        esc(g) +
        '"><button class="shb" data-act="shut" data-v="' +
        esc(g) +
        '" aria-expanded="' +
        !shut +
        '"><i>' +
        (shut ? '▸' : '▾') +
        '</i>' +
        title +
        '</button>' +
        (S.reord === g ? '<button class="done" data-act="reord" data-v="">완료</button>' : tools || '') +
        '</div>';
    keys.forEach(function (k) {
      var it = itemHTML(k, g);
      if (!shut || / on| un/.test(it.slice(0, 40))) out += it;
    });
    if (!keys.length && empty && !shut) out += empty;
    return out;
  }
  var used = {};
  sd.fav.forEach(function (k) {
    used[k] = 1;
  });
  sd.secs.forEach(function (x) {
    x.keys.forEach(function (k) {
      used[k] = 1;
    });
  });
  var favKeys = sd.fav.filter(function (k) {
    return INFO[k];
  });
  if (favKeys.length) h += group('fav', '⭐ 즐겨찾기', favKeys);
  sd.secs.forEach(function (x) {
    h += group(
      x.id,
      esc(x.name),
      x.keys.filter(function (k) {
        return INFO[k];
      }),
      '<button data-act="secmenu" data-v="' + esc(x.id) + '" title="섹션 메뉴" aria-label="섹션 메뉴">⋯</button>',
      '<p class="shint">' +
        (narrow() ? '채널·DM을 길게 눌러' : '채널·DM의 ⋯ (또는 끌어다 놓기)') +
        " → '섹션으로 옮기기'로 넣어요</p>",
    );
  });
  function rest(t) {
    return Object.keys(INFO).filter(function (k) {
      return INFO[k].t === t && !used[k];
    });
  }
  h += group(
    'ch',
    '채널',
    rest('ch'),
    '<button data-act="cset" data-v="pub" title="채널 만들기" aria-label="채널 만들기">+</button>',
  );
  /* 들어가지 않은 공개 채널을 미리 보는 중이면 잠깐 목록에 보여요 */
  var cv = S.view && S.view.k === 'c' && chan(S.view.id);
  if (cv && !joined(cv) && vis(cv) && cv.kind !== 'proj') {
    INFO['c_' + cv.id] = { t: 'ch', c: cv };
    h += itemHTML('c_' + cv.id, 'ch')
      .replace('class="si', 'class="si pv')
      .replace(' draggable="true"', '');
  }
  h +=
    '<button class="si' +
    (S.view && S.view.k === 'browse' ? ' on' : '') +
    '" data-act="browse"><span class="hash">+</span><span class="nm">채널 찾아보기</span></button>';
  var P = rest('pj'),
    PD = P.filter(function (k) {
      return INFO[k].c.done;
    });
  if (P.length || isAdmin()) {
    h += group(
      'pj',
      '프로젝트',
      P.filter(function (k) {
        return !INFO[k].c.done || S.showDone || (S.view && S.view.id === INFO[k].c.id);
      }),
      isAdmin()
        ? '<button data-act="cset" data-v="proj" title="프로젝트 만들기" aria-label="프로젝트 만들기">+</button>'
        : '',
      '<p class="shint">+ 를 눌러 프로젝트를 만들어요</p>',
    );
    if (PD.length)
      h +=
        '<div class="sh"><button class="tg" data-act="showdone">' +
        (S.showDone ? '완료된 프로젝트 숨기기' : '완료된 프로젝트 ' + PD.length + '개 보기') +
        '</button></div>';
  }
  /* DM은 원래 최근 대화 순 (직접 순서를 바꾸면 그 순서) */
  h += group(
    'dm',
    '다이렉트 메시지',
    rest('dm'),
    '<button data-act="newdm" title="새 DM" aria-label="새 DM">+</button>',
  );
  h +=
    '<button class="si snew" data-act="secnew"><span class="hash">＋</span><span class="nm">섹션 만들기</span></button>';
  if (isAdmin())
    h +=
      '<div class="sh"><span class="shb">관리</span></div><button class="si' +
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
  if (v.k === 'me') return meEditHTML();
  if (v.k === 'search') return searchHTML();
  if (v.k === 'set') return setHTML();
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

export { convTitle, sideHTML, mainHTML, browseList, GK };
