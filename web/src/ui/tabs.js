/* 탭: 홈 · DM · 내 활동 · 나중에 보기
   PC는 맨 왼쪽 좁은 세로 막대, 휴대폰은 목록 화면 아래 탭 막대 */
import { db } from '../firebase.js';
import { esc, ms, hm, dayKey, dayLabel, EMOM } from '../util.js';
import { nameOf, dmOthers, dmName, joined, chan, dm, vis, S } from '../state.js';
import { ucount, unread, cntHTML, UC } from '../unread.js';
import { av, gav } from '../ui/common.js';

var TABS = [
  ['home', '홈', '🏠'],
  ['dm', 'DM', '💬'],
  ['act', '내 활동', '🔔'],
  ['saved', '나중에', '🔖'],
];
/* 탭마다 표시: 홈은 점, 나머지는 숫자 */
function badges() {
  var home = S.channels.some(function (c) {
      return vis(c) && joined(c) && unread('c_' + c.id, c);
    }),
    dmn = 0;
  S.dms.forEach(function (d) {
    var k = 'd_' + d.id;
    if (unread(k, d)) dmn += (UC[k] && UC[k].n) || 1;
  });
  return { home: home ? -1 : 0, dm: dmn, act: actNew(), saved: savedOpen().length };
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
  return '<nav class="rail" aria-label="탭">' + tabBtns('rt') + '<span class="sp"></span>' + av(S.u.uid) + '</nav>';
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

/* DM 탭: 대화 목록 + 마지막 글 */
function dmTabHTML() {
  var L = S.dms.filter(function (d) {
    return d.lastAt;
  });
  var h =
    '<div class="tabhd"><h2>다이렉트 메시지</h2><button class="btn sm" data-act="newdm">+ 새 메시지</button></div><div class="tlist">';
  if (!L.length) h += '<p class="tempty">아직 DM이 없어요. + 새 메시지로 시작해 보세요.</p>';
  L.forEach(function (d) {
    var os = dmOthers(d),
      k = 'd_' + d.id,
      on = S.view && S.view.k === 'd' && S.view.id === d.id,
      n = on ? 0 : ucount(k, d, db.collection('dms').doc(d.id)),
      last = d.last || {};
    h +=
      '<button class="trow' +
      (on ? ' on' : '') +
      (n ? ' un' : '') +
      '" data-act="open" data-k="d" data-id="' +
      esc(d.id) +
      '">' +
      (d.g ? gav(os) : av(os[0])) +
      '<span class="tb"><span class="t1"><b>' +
      esc(d.g ? dmName(d) : nameOf(os[0]) + (os[0] === S.u.uid ? ' (나)' : '')) +
      '</b><time>' +
      when(d.lastAt) +
      '</time></span><span class="t2">' +
      (last.by === S.u.uid ? '나: ' : '') +
      esc(last.text || '') +
      '</span></span>' +
      cntHTML(n) +
      '</button>';
  });
  return h + '</div>';
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
      ['all', '전체'],
      ['men', '@ 멘션'],
      ['rp', '💬 답글'],
      ['re', '😀 반응'],
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
  if (!L.length)
    h += '<p class="tempty">아직 활동이 없어요.<br>누가 나를 @부르거나, 내 글에 반응·답글을 달면 여기 모여요.</p>';
  L.forEach(function (a) {
    var nw = a.at && ms(a.at) > seen,
      what =
        a.t === 'men'
          ? '님이 나를 불렀어요'
          : a.t === 'rp'
            ? '님이 내 글에 답글을 달았어요'
            : '님이 ' + (EMOM[a.emo] || '') + ' 반응했어요';
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

/* 나중에 보기: 진행 중 / 완료 */
function savedTabHTML() {
  var done = S.svf === 'done',
    L = S.saved.filter(function (s) {
      return !!s.done === done;
    });
  var h =
    '<div class="tabhd"><h2>나중에 보기</h2></div><div class="chips tchips"><button class="chip" data-act="svf" data-v="open" aria-pressed="' +
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

export { railHTML, botHTML, dmTabHTML, actTabHTML, savedTabHTML, badges, actSeenAt };
