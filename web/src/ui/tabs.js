/* 탭: 홈 · 활동 · STOCK · VMD · BOARD (원제님 결정 2026-11-28)
   - DM은 홈 목록에서, 나중에 보기는 활동 안에서 봐요. 캘린더는 홈 안에.
   - STOCK·VMD·BOARD는 워크툴·성과 대시보드를 옮겨 올 매장 도구 화면이에요.
   PC는 맨 왼쪽 좁은 세로 막대, 휴대폰은 아래 탭 막대 */
import { esc, ms, hm, dayKey, dayLabel } from '../util.js';
import { nameOf, dmOthers, dmName, joined, chan, dm, vis, S } from '../state.js';
import { unread, UC } from '../unread.js';
import { av } from '../ui/common.js';
import { emoOf } from './emoji.js';
import { threadList, threadNew } from '../threads.js';

var TABS = [
  ['home', '홈', '🏠'],
  ['act', '활동', '🔔'],
  ['stock', 'STOCK', '📦'],
  ['vmd', 'VMD', '🖼️'],
  ['board', 'BOARD', '📊'],
];
/* 매장 도구 탭 (목록 없이 화면 전체를 써요) */
var TOOLS = {
  stock: ['STOCK', '📦', '워크툴의 STOCK(재고 찾기·위치·유통기한), 발주, 입고·이슈를 옮겨 올 자리예요.'],
  vmd: ['VMD', '🖼️', '워크툴의 VMD(진열 기록·요청·효과 보기)를 옮겨 올 자리예요.'],
  board: ['BOARD', '📊', '성과 대시보드(매출·성과 숫자)를 옮겨 올 자리예요.'],
};
function isTool(t) {
  return !!TOOLS[t || S.tab];
}
function toolHTML(t) {
  var x = TOOLS[t];
  return (
    '<div class="top"><h2>' +
    x[1] +
    ' ' +
    x[0] +
    '</h2></div><div class="page"><div class="card"><h3>준비 중이에요</h3><p class="muted" style="margin:0">' +
    x[2] +
    '</p><p class="small muted" style="margin:0">지금은 쓰던 아티팩트를 그대로 써 주세요. 옮겨 오면 여기서 바로 열려요.</p></div></div>'
  );
}
/* 탭마다 표시: 홈은 DM 안 읽은 수(없으면 채널 안 읽음 점), 활동은 새 활동 수 */
function badges() {
  var home = S.channels.some(function (c) {
      return vis(c) && joined(c) && unread('c_' + c.id, c);
    }),
    dmn = 0;
  S.dms.forEach(function (d) {
    var k = 'd_' + d.id;
    if (unread(k, d)) dmn += (UC[k] && UC[k].n) || 1;
  });
  return { home: dmn || (home ? -1 : 0), act: actNew() };
}
function actSeenAt() {
  var r = S.reads.act;
  return r && r.at ? ms(r.at) : 0;
}
function actNew() {
  var t = actSeenAt();
  return S.acts.filter(function (a) {
    return a.at && ms(a.at) > t;
  }).length;
}
function savedOpen() {
  return S.saved.filter(function (s) {
    return !s.done;
  });
}
function tabBtns(cls) {
  var b = badges();
  return TABS.map(function (t) {
    var n = b[t[0]];
    return (
      '<button class="' +
      cls +
      (S.tab === t[0] ? ' on' : '') +
      '" data-act="tabgo" data-v="' +
      t[0] +
      '" aria-label="' +
      t[1] +
      (n > 0 ? ' ' + n + '개' : '') +
      '"' +
      (S.tab === t[0] ? ' aria-current="page"' : '') +
      '><span class="ti">' +
      t[2] +
      (n < 0 ? '<i class="dot"></i>' : n > 0 ? '<i class="bdg">' + (n > 99 ? '99+' : n) + '</i>' : '') +
      '</span><span class="tl">' +
      t[1] +
      '</span></button>'
    );
  }).join('');
}
function railHTML() {
  return (
    '<nav class="rail" aria-label="탭">' +
    tabBtns('rt') +
    '<span class="sp"></span><button class="rme" data-act="memenu" aria-label="나 · 상태·프로필·설정">' +
    av(S.u.uid) +
    '</button></nav>'
  );
}
function botHTML() {
  return '<nav class="bot" aria-label="탭">' + tabBtns('bt') + '</nav>';
}

/* 어디서 온 것인지: # 채널 / DM 이름 */
function whereName(k, cid) {
  if (k === 'c') {
    var c = chan(cid);
    return c ? (c.kind === 'proj' ? '▦ ' : c.priv ? '🔒 ' : '# ') + c.name : '(볼 수 없는 채널)';
  }
  var d = dm(cid);
  return d ? (d.g ? dmName(d) : nameOf(dmOthers(d)[0])) + ' DM' : 'DM';
}
function when(t) {
  if (!t) return '';
  return dayKey(t) === dayKey(Date.now()) ? hm(t) : dayLabel(t).replace(/ \(.\)/, '');
}

/* 내 활동: 멘션 · 반응 · 답글 */
function actTabHTML() {
  var seen = S.actPrev != null ? S.actPrev : actSeenAt(),
    f = S.actf || 'all',
    L = S.acts.filter(function (a) {
      return f === 'all' || a.t === f;
    });
  var h =
    '<div class="tabhd"><h2>내 활동</h2></div><div class="chips tchips">' +
    [
      ['th', '🧵 스레드' + (threadNew() ? ' ' + threadNew() : '')],
      ['all', '전체'],
      ['men', '@ 멘션'],
      ['rp', '💬 답글'],
      ['re', '😀 반응'],
      ['sv', '🔖 나중에' + (savedOpen().length ? ' ' + savedOpen().length : '')],
    ]
      .map(function (c) {
        return (
          '<button class="chip" data-act="actf" data-v="' +
          c[0] +
          '" aria-pressed="' +
          (f === c[0]) +
          '">' +
          c[1] +
          '</button>'
        );
      })
      .join('') +
    '</div><div class="tlist">';
  if (f === 'th') return h + threadsHTML() + '</div>';
  if (f === 'sv') return h + '</div>' + savedTabHTML();
  if (!L.length)
    h += '<p class="tempty">아직 활동이 없어요.<br>누가 나를 @부르거나, 내 글에 반응·답글을 달면 여기 모여요.</p>';
  L.forEach(function (a) {
    var nw = a.at && ms(a.at) > seen,
      what =
        a.t === 'men'
          ? '님이 나를 불렀어요'
          : a.t === 'rp'
            ? '님이 내 글에 답글을 달았어요'
            : '님이 ' + emoOf(a.emo) + ' 반응했어요';
    h +=
      '<button class="trow ac' +
      (nw ? ' un' : '') +
      '" data-act="gomsg" data-v="' +
      esc([a.k, a.cid, a.mid, a.rid || ''].join('/')) +
      '">' +
      av(a.from) +
      '<span class="tb"><span class="t1"><span><b>' +
      esc(nameOf(a.from)) +
      '</b>' +
      what +
      '</span><time>' +
      when(a.at) +
      '</time></span><span class="t3">' +
      esc(whereName(a.k, a.cid)) +
      (a.rid ? ' · 스레드' : '') +
      '</span><span class="t2">' +
      esc(a.text || '') +
      '</span></span>' +
      (nw ? '<i class="ndot" aria-label="새 활동"></i>' : '') +
      '</button>';
  });
  return h + '</div>';
}

/* 내가 참여한 스레드: 최근 답글 순, 새 답글은 굵게 */
function threadsHTML() {
  var L = threadList();
  if (!L.length)
    return '<p class="tempty">참여한 스레드가 없어요.<br>답글을 달거나, 내 글에 답글이 달리면 여기 모여요.</p>';
  return L.map(function (x) {
    var t = x.t,
      r = x.r || {};
    return (
      '<button class="trow ac' +
      (x.nw ? ' un' : '') +
      '" data-act="gothread" data-v="' +
      esc([t.k, t.cid, t.mid].join('/')) +
      '">' +
      (r.uid ? av(r.uid) : '<span class="av"></span>') +
      '<span class="tb"><span class="t1"><span><b>' +
      esc(whereName(t.k, t.cid)) +
      '</b></span><time>' +
      when(r.lastReplyAt || t.at) +
      '</time></span><span class="t2">' +
      esc(r.uid ? nameOf(r.uid) + ': ' : '') +
      esc(String(r.text || (r.del ? '삭제된 메시지' : '…')).slice(0, 80)) +
      '</span><span class="t3">답글 ' +
      (r.rc || 0) +
      '개' +
      (r.ru && r.ru.length
        ? ' · ' +
          r.ru
            .slice(0, 3)
            .map(function (u) {
              return esc(nameOf(u));
            })
            .join(', ')
        : '') +
      '</span></span>' +
      (x.nw ? '<i class="ndot" aria-label="새 답글"></i>' : '') +
      '</button>'
    );
  }).join('');
}
/* 나중에 보기: 진행 중 / 완료 */
function savedTabHTML() {
  var done = S.svf === 'done',
    L = S.saved.filter(function (s) {
      return !!s.done === done;
    });
  var h =
    '<div class="chips tchips sub"><button class="chip" data-act="svf" data-v="open" aria-pressed="' +
    !done +
    '">진행 중 ' +
    savedOpen().length +
    '</button><button class="chip" data-act="svf" data-v="done" aria-pressed="' +
    done +
    '">완료</button></div><div class="tlist">';
  if (!L.length)
    h += done
      ? '<p class="tempty">완료한 항목이 없어요.</p>'
      : '<p class="tempty">저장한 메시지가 없어요.<br>메시지의 🔖 (휴대폰은 길게 누르기)로 넣어요.</p>';
  L.forEach(function (s) {
    h +=
      '<div class="trow sv"><button class="tmain" data-act="gomsg" data-v="' +
      esc([s.k, s.cid, s.mid, s.rid || ''].join('/')) +
      '">' +
      av(s.uid) +
      '<span class="tb"><span class="t1"><b>' +
      esc(nameOf(s.uid)) +
      '</b><time>' +
      when(s.mat || s.at) +
      '</time></span><span class="t3">' +
      esc(whereName(s.k, s.cid)) +
      (s.rid ? ' · 스레드' : '') +
      '</span><span class="t2">' +
      esc(s.text || '') +
      '</span></span></button><span class="tbtns">' +
      (done
        ? '<button class="btn sm ghost" data-act="svundo" data-id="' +
          esc(s.id) +
          '" title="되돌리기" aria-label="되돌리기">↺</button>'
        : '<button class="btn sm ghost" data-act="svdone" data-id="' +
          esc(s.id) +
          '" title="완료" aria-label="완료">✓</button>') +
      '<button class="btn sm ghost" data-act="svdel" data-id="' +
      esc(s.id) +
      '" aria-label="지우기" title="지우기">✕</button></span></div>';
  });
  return h + '</div>';
}

export { railHTML, botHTML, actTabHTML, badges, actSeenAt, isTool, toolHTML };
