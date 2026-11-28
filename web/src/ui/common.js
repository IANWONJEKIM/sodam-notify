/* 그리기 공통 (아바타·본문·입력창) */
import { esc, colorOf } from '../util.js';
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
function fmt(t) {
  var h = esc(t);
  h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  var names = Object.keys(S.users)
    .map(nameOf)
    .filter(Boolean)
    .sort(function (a, b) {
      return b.length - a.length;
    });
  names.forEach(function (n) {
    var e = esc('@' + n);
    if (h.indexOf(e) >= 0) h = h.split(e).join('<span class="at">' + e + '</span>');
  });
  h = h.replace(/@(전체|모두)/g, '<span class="at">@$1</span>');
  return h;
}
function pav(e) {
  var uid = userOfEmail(e);
  return uid
    ? av(uid, 1)
    : '<span class="av sm" style="background:#8A938E">' + esc(String(sname(e)).slice(0, 1)) + '</span>';
}
function compHTML(id, ph) {
  return (
    '<div class="comp"><div class="mpop" id="' +
    id +
    '-pop" hidden></div><div class="cbox"><textarea id="' +
    id +
    '" rows="1" placeholder="' +
    esc(ph) +
    '" enterkeyhint="send"></textarea><button class="send" data-act="send" data-v="' +
    id +
    '" aria-label="보내기" disabled>➤</button></div>' +
    (narrow() ? '' : '<p class="hint">Enter 보내기 · Shift+Enter 줄 바꿈 · @이름 으로 부르기</p>') +
    '</div>'
  );
}
function grow(e) {
  e.style.height = 'auto';
  e.style.height = Math.min(180, e.scrollHeight) + 'px';
  var b = e.parentNode.querySelector('.send');
  if (b) b.disabled = !e.value.trim();
}

export { av, fmt, pav, compHTML, grow };
