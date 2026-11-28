/* 그리기 공통 (아바타·본문·입력창) */
import { esc, colorOf } from '../util.js';
import { rich } from './rich.js';
import { nameOf, userOfEmail, sname, narrow, S } from '../state.js';

function av(uid, sm) {
  var u = S.users[uid] || {},
    n = nameOf(uid);
  return (
    '<span class="av' +
    (sm ? ' sm' : '') +
    '" style="background:' +
    colorOf(u.email || uid) +
    '">' +
    (u.photo ? '<img src="' + esc(u.photo) + '" alt="" referrerpolicy="no-referrer">' : esc(String(n).slice(0, 1))) +
    '</span>'
  );
}
/* 메시지 글 보여 주기: 링크 · @멘션 · 서식(굵게·목록·인용·코드…) */
function fmt(t) {
  var names = Object.keys(S.users)
    .map(nameOf)
    .filter(Boolean)
    .sort(function (a, b) {
      return b.length - a.length;
    });
  return rich(t, names);
}
function pav(e) {
  var uid = userOfEmail(e);
  return uid
    ? av(uid, 1)
    : '<span class="av sm" style="background:#8A938E">' + esc(String(sname(e)).slice(0, 1)) + '</span>';
}
/* 그룹 DM 사진: 두 사람 사진을 겹치고 인원수 */
function gav(uids) {
  return (
    '<span class="avg">' +
    av(uids[0], 1) +
    av(uids[1], 1) +
    '</span><span class="gn" aria-label="' +
    (uids.length + 1) +
    '명">' +
    (uids.length + 1) +
    '</span>'
  );
}
/* 서식 막대: PC는 늘 보이고, 휴대폰은 Aa를 누를 때만 (키보드 위 공간 아끼기) */
var FB = [
  ['b', '<b>B</b>', '굵게 (*글*)'],
  ['i', '<i>I</i>', '기울임 (_글_)'],
  ['s', '<s>S</s>', '취소선 (~글~)'],
  ['ul', '•', '목록 (- )'],
  ['ol', '1.', '번호 목록 (1. )'],
  ['q', '❝', '인용 (> )'],
  ['code', '&lt;/&gt;', '코드 (`글`)'],
  ['pre', '▤', '코드 상자 (```)'],
];
function fbarHTML(id) {
  return (
    '<div class="fbar" role="toolbar" aria-label="글 꾸미기"' +
    (narrow() && !S.fbar ? ' hidden' : '') +
    '>' +
    FB.map(function (f) {
      return (
        '<button data-act="fmt" data-v="' +
        f[0] +
        '" data-t="' +
        id +
        '" title="' +
        f[2] +
        '" aria-label="' +
        f[2] +
        '">' +
        f[1] +
        '</button>'
      );
    }).join('') +
    '</div>'
  );
}
function compHTML(id, ph) {
  return (
    '<div class="comp"><div class="mpop" id="' +
    id +
    '-pop" hidden></div>' +
    fbarHTML(id) +
    '<div class="cbox">' +
    (narrow()
      ? '<button class="cbt' +
        (S.fbar ? ' on' : '') +
        '" data-act="fbar" aria-label="글 꾸미기" aria-pressed="' +
        !!S.fbar +
        '">Aa</button>'
      : '') +
    '<textarea id="' +
    id +
    '" rows="1" placeholder="' +
    esc(ph) +
    '" enterkeyhint="send"></textarea><button class="cbt" data-act="emopick" data-v="' +
    id +
    '" aria-label="이모지 넣기" title="이모지">😀</button><button class="send" data-act="send" data-v="' +
    id +
    '" aria-label="보내기" disabled>➤</button></div>' +
    (narrow()
      ? ''
      : '<p class="hint">Enter 보내기 · Shift+Enter 줄 바꿈 · @이름 으로 부르기 · *굵게* _기울임_ - 목록</p>') +
    '</div>'
  );
}
/* 고른 글을 기호로 감싸거나, 줄 앞에 목록·인용 기호를 붙여요 */
function applyFmt(ta, kind) {
  var v = ta.value,
    a = ta.selectionStart,
    b = ta.selectionEnd,
    sel = v.slice(a, b),
    W = { b: '*', i: '_', s: '~', code: '`' };
  if (W[kind]) {
    var m = W[kind];
    ta.setRangeText(m + sel + m, a, b, 'select');
    ta.setSelectionRange(a + 1, a + 1 + sel.length);
  } else if (kind === 'pre') {
    var pre = (a > 0 && v[a - 1] !== '\n' ? '\n' : '') + '```\n';
    ta.setRangeText(pre + sel + '\n```', a, b, 'select');
    ta.setSelectionRange(a + pre.length, a + pre.length + sel.length);
  } else {
    /* 고른 줄 전체(또는 지금 줄)에 붙이고, 이미 있으면 떼요 */
    var ls = v.lastIndexOf('\n', a - 1) + 1,
      le = v.indexOf('\n', b);
    if (le < 0) le = v.length;
    var lines = v.slice(ls, le).split('\n'),
      re = kind === 'ul' ? /^- / : kind === 'ol' ? /^\d+\. / : /^> /,
      all = lines.every(function (l) {
        return re.test(l);
      }),
      out = lines
        .map(function (l, i) {
          if (all) return l.replace(re, '');
          return (kind === 'ul' ? '- ' : kind === 'ol' ? i + 1 + '. ' : '> ') + l;
        })
        .join('\n');
    ta.setRangeText(out, ls, le, 'select'); /* 줄들을 고른 채로 둬서 한 번 더 누르면 풀려요 */
  }
  ta.focus();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
/* 커서 자리에 글(이모지) 넣기 */
function insertAt(ta, text, pos) {
  var p = pos == null ? ta.selectionStart : pos;
  ta.setRangeText(text, p, p, 'end');
  ta.focus();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function grow(e) {
  e.style.height = 'auto';
  e.style.height = Math.min(180, e.scrollHeight) + 'px';
  var b = e.parentNode.querySelector('.send');
  if (b) b.disabled = !e.value.trim();
}

export { av, fmt, pav, gav, compHTML, grow, applyFmt, insertAt };
