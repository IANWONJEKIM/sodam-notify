/* 검색 · 빠른 이동(Ctrl/⌘+K)
   Firestore엔 글자 검색이 없어서, 내가 들어간 대화마다 최근 메시지 500개를 한 번 불러와
   이 기기 안에서 찾아요 (5분 동안 다시 안 불러요). 메시지가 아주 많아지면 색인 방식으로 바꿔요.
   스레드 답글은 아직 안 찾아요. */
import { db } from './firebase.js';
import { esc, ms, hm, dayLabel } from './util.js';
import { nameOf, chan, dm, dmName, joined, vis, S } from './state.js';
import { av } from './ui/common.js';

var LIMIT = 500;
var SR = { data: {}, busy: 0, total: 0 };
/* 검색할 대화: 들어간 채널·프로젝트 + 글이 있는 DM */
function convs() {
  var L = [];
  S.channels.forEach(function (c) {
    if (vis(c) && joined(c)) L.push({ k: 'c', id: c.id, key: 'c_' + c.id });
  });
  S.dms.forEach(function (d) {
    if (d.lastAt) L.push({ k: 'd', id: d.id, key: 'd_' + d.id });
  });
  return L;
}
function convName(k, id) {
  if (k === 'c') {
    var c = chan(id);
    return c ? (c.kind === 'proj' ? '▦ ' : c.priv ? '🔒 ' : '# ') + c.name : '';
  }
  var d = dm(id);
  return d ? '💬 ' + dmName(d) : 'DM';
}
/* 필요한 대화만 불러와요 (한 번 불러오면 5분 동안 그대로) */
function load(onDone) {
  var L = convs().filter(function (x) {
    var c = SR.data[x.key];
    return !c || Date.now() - c.at > 5 * 6e4;
  });
  if (!L.length) return;
  SR.busy += L.length;
  SR.total = convs().length;
  L.forEach(function (x) {
    db.collection(x.k === 'c' ? 'channels' : 'dms')
      .doc(x.id)
      .collection('msgs')
      .orderBy('at', 'desc')
      .limit(LIMIT)
      .get()
      .then(
        function (s) {
          SR.data[x.key] = {
            at: Date.now(),
            k: x.k,
            id: x.id,
            msgs: s.docs
              .map(function (d) {
                var o = d.data();
                o.id = d.id;
                return o;
              })
              .filter(function (o) {
                return !o.del;
              }),
          };
        },
        function () {
          SR.data[x.key] = { at: Date.now(), k: x.k, id: x.id, msgs: [] };
        },
      )
      .then(function () {
        SR.busy--;
        onDone();
      });
  });
}
function since(p) {
  var d = new Date();
  if (p === 'today') return d.setHours(0, 0, 0, 0);
  if (p === '7') return Date.now() - 7 * 864e5;
  if (p === '30') return Date.now() - 30 * 864e5;
  return 0;
}
/* 찾은 글자를 밝게 (글자는 먼저 esc) */
function mark(text, q) {
  var t = String(text || '').replace(/\s+/g, ' '),
    i = q ? t.toLowerCase().indexOf(q) : -1,
    a = Math.max(0, i - 40),
    s = (a > 0 ? '…' : '') + t.slice(a, a + 160) + (t.length > a + 160 ? '…' : '');
  if (!q) return esc(s);
  var lo = s.toLowerCase(),
    out = '',
    p = 0,
    j;
  while ((j = lo.indexOf(q, p)) >= 0) {
    out += esc(s.slice(p, j)) + '<mark>' + esc(s.slice(j, j + q.length)) + '</mark>';
    p = j + q.length;
  }
  return out + esc(s.slice(p));
}
/* 검색 결과 (목록 부분만: 입력칸은 그대로 두고 바꿔요) */
function resultsHTML() {
  var f = S.srch || {},
    q = String(f.q || '')
      .trim()
      .toLowerCase(),
    h = '';
  if (!q && !f.from && !f.cv)
    return '<p class="muted srhint">찾을 말을 적어 보세요. 보낸 사람·채널·기간으로 좁힐 수도 있어요.</p>';
  /* 채널 · 사람 (글자만 있을 때) */
  if (q && !f.from && !f.cv) {
    var CH = S.channels.filter(function (c) {
        return vis(c) && (!c.priv || joined(c)) && String(c.name).toLowerCase().indexOf(q) >= 0;
      }),
      PP = Object.keys(S.users).filter(function (u) {
        return nameOf(u).toLowerCase().indexOf(q) >= 0;
      });
    if (CH.length)
      h +=
        '<h4 class="srh">채널</h4><div class="srl">' +
        CH.slice(0, 6)
          .map(function (c) {
            return (
              '<button class="srr" data-act="open" data-k="c" data-id="' +
              esc(c.id) +
              '"><span class="srn">' +
              esc(convName('c', c.id)) +
              '</span><span class="small muted">' +
              esc(c.topic || '') +
              '</span></button>'
            );
          })
          .join('') +
        '</div>';
    if (PP.length)
      h +=
        '<h4 class="srh">사람</h4><div class="srl">' +
        PP.slice(0, 6)
          .map(function (u) {
            return (
              '<button class="srr row" data-act="prof" data-v="' +
              esc(u) +
              '">' +
              av(u, 1) +
              '<span class="srn">' +
              esc(nameOf(u)) +
              '</span></button>'
            );
          })
          .join('') +
        '</div>';
  }
  /* 메시지 */
  var t0 = since(f.per),
    R = [];
  Object.keys(SR.data).forEach(function (key) {
    var c = SR.data[key];
    if (f.cv && f.cv !== key) return;
    c.msgs.forEach(function (m) {
      if (f.from && m.uid !== f.from) return;
      if (t0 && ms(m.at) < t0) return;
      var txt = (m.text || '') + (m.fwd ? ' ' + (m.fwd.text || '') : '');
      if (q && txt.toLowerCase().indexOf(q) < 0) return;
      R.push({ c: c, m: m, txt: txt });
    });
  });
  R.sort(function (a, b) {
    return ms(b.m.at) - ms(a.m.at);
  });
  h +=
    '<h4 class="srh">메시지 ' +
    (R.length > 100 ? '100+' : R.length) +
    '개' +
    (SR.busy
      ? ' <span class="muted small">· 불러오는 중… (' + (SR.total - SR.busy) + '/' + SR.total + ')</span>'
      : '') +
    '</h4>';
  if (!R.length && !SR.busy) h += '<p class="muted srhint">찾는 메시지가 없어요.</p>';
  h +=
    '<div class="srl">' +
    R.slice(0, 100)
      .map(function (x) {
        return (
          '<button class="srr srm" data-act="gomsg" data-v="' +
          esc([x.c.k, x.c.id, x.m.id, ''].join('/')) +
          '">' +
          av(x.m.uid, 1) +
          '<span class="srb"><span class="srt"><b>' +
          esc(nameOf(x.m.uid)) +
          '</b> <span class="muted small">' +
          esc(convName(x.c.k, x.c.id)) +
          ' · ' +
          esc(dayLabel(x.m.at)) +
          ' ' +
          hm(x.m.at) +
          '</span></span><span class="srx">' +
          mark(x.txt, q) +
          '</span></span></button>'
        );
      })
      .join('') +
    '</div><p class="small muted srhint">대화마다 최근 메시지 ' +
    LIMIT +
    '개까지 찾아요. 스레드 답글은 아직 안 찾아요.</p>';
  return h;
}
function searchHTML() {
  var f = S.srch || (S.srch = { q: '', from: '', cv: '', per: '' }),
    people = Object.keys(S.users).sort(function (a, b) {
      return nameOf(a).localeCompare(nameOf(b), 'ko');
    });
  return (
    '<div class="top"><button class="back" data-act="back" aria-label="뒤로">‹</button><h2>🔍 검색</h2></div><div class="page srp">' +
    '<input class="inp" id="sq" type="search" placeholder="메시지·사람·채널 찾기" autocomplete="off" value="' +
    esc(f.q) +
    '"><div class="row srf"><select class="inp" id="sq-from" aria-label="보낸 사람"><option value="">보낸 사람: 모두</option>' +
    people
      .map(function (u) {
        return (
          '<option value="' + esc(u) + '"' + (f.from === u ? ' selected' : '') + '>' + esc(nameOf(u)) + '</option>'
        );
      })
      .join('') +
    '</select><select class="inp" id="sq-cv" aria-label="대화"><option value="">대화: 모두</option>' +
    convs()
      .map(function (x) {
        return (
          '<option value="' +
          esc(x.key) +
          '"' +
          (f.cv === x.key ? ' selected' : '') +
          '>' +
          esc(convName(x.k, x.id)) +
          '</option>'
        );
      })
      .join('') +
    '</select></div><div class="chips">' +
    [
      ['', '전체 기간'],
      ['today', '오늘'],
      ['7', '7일'],
      ['30', '30일'],
    ]
      .map(function (p) {
        return (
          '<button class="chip" data-act="sqper" data-v="' +
          p[0] +
          '" aria-pressed="' +
          (f.per === p[0]) +
          '">' +
          p[1] +
          '</button>'
        );
      })
      .join('') +
    '</div><div id="sq-res">' +
    resultsHTML() +
    '</div></div>'
  );
}
function refreshResults() {
  var r = document.getElementById('sq-res');
  if (r) r.innerHTML = resultsHTML();
}

/* ── 빠른 이동 (Ctrl/⌘+K): 채널 · DM · 사람 ── */
function qsList() {
  var q = String((S.qs && S.qs.q) || '')
      .trim()
      .toLowerCase(),
    L = [];
  convs().forEach(function (x) {
    L.push({ t: 'cv', k: x.k, id: x.id, name: convName(x.k, x.id) });
  });
  Object.keys(S.users).forEach(function (u) {
    if (u !== S.u.uid) L.push({ t: 'p', id: u, name: '👤 ' + nameOf(u) });
  });
  if (q)
    L = L.filter(function (x) {
      return x.name.toLowerCase().indexOf(q) >= 0;
    });
  return L.slice(0, 12);
}
function qsListHTML() {
  var L = qsList(),
    sel = Math.min((S.qs && S.qs.sel) || 0, Math.max(0, L.length - 1));
  if (!L.length) return '<p class="muted small" style="margin:8px">찾는 곳이 없어요.</p>';
  return L.map(function (x, i) {
    return (
      '<button class="qsr' +
      (i === sel ? ' on' : '') +
      '" data-act="qsgo" data-v="' +
      i +
      '">' +
      (x.t === 'p' ? av(x.id, 1) : '') +
      '<span>' +
      esc(x.name) +
      '</span></button>'
    );
  }).join('');
}
function qsHTML() {
  return (
    '<div class="ovbg" data-act="ovclose"></div><div class="dlg qs" role="dialog" aria-label="빠른 이동"><input class="inp" id="qs-q" placeholder="어디로 갈까요? 채널·DM·사람 이름" autocomplete="off" value="' +
    esc(S.qs.q || '') +
    '"><div class="qsl" id="qs-l">' +
    qsListHTML() +
    '</div><p class="small muted" style="margin:0">↑↓ 고르기 · Enter 열기 · Esc 닫기</p></div>'
  );
}

export { load, searchHTML, resultsHTML, refreshResults, qsHTML, qsListHTML, qsList, convs };
