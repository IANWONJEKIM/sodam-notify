/* 기본 값과 작은 도구 */

var OWNER = 'wonjea47@gmail.com';
var TEAMS = ['MANAGER', 'MD', 'OPERATION', 'VMD', 'PT'];
var EMO = [
    ['like', '👍'],
    ['heart', '❤️'],
    ['lol', '😂'],
    ['ok', '✅'],
    ['eyes', '👀'],
    ['pray', '🙏'],
  ],
  EMOM = {};
EMO.forEach(function (e) {
  EMOM[e[0]] = e[1];
});
var WD = ['일', '월', '화', '수', '목', '금', '토'];
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function pad(n) {
  return (n < 10 ? '0' : '') + n;
}
function ms(t) {
  return t && t.toMillis ? t.toMillis() : typeof t === 'number' ? t : Date.now();
}
function hm(t) {
  var d = new Date(ms(t)),
    h = d.getHours();
  return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + pad(d.getMinutes());
}
function dayKey(t) {
  var d = new Date(ms(t));
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function dayLabel(t) {
  var d = new Date(ms(t)),
    n = new Date(),
    k = dayKey(t);
  if (k === dayKey(n.getTime())) return '오늘';
  n.setDate(n.getDate() - 1);
  if (k === dayKey(n.getTime())) return '어제';
  return (
    d.getMonth() +
    1 +
    '월 ' +
    d.getDate() +
    '일 (' +
    WD[d.getDay()] +
    ')' +
    (d.getFullYear() !== new Date().getFullYear() ? ' · ' + d.getFullYear() : '')
  );
}
var tt;
function toast(m) {
  var t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.hidden = false;
  clearTimeout(tt);
  tt = setTimeout(function () {
    t.hidden = true;
  }, 2800);
}
function errMsg(e) {
  var c = (e && e.code) || '';
  return c === 'permission-denied'
    ? '권한이 없어요'
    : c === 'unavailable'
      ? '인터넷 연결을 확인해 주세요'
      : (e && e.message) || '잠시 후 다시 해 주세요';
}
function colorOf(s) {
  var h = 0;
  s = String(s || '');
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return 'hsl(' + (Math.abs(h) % 360) + ',38%,38%)';
}
function today() {
  return dayKey(Date.now());
}
function md(d) {
  var p = String(d || '').split('-');
  return p.length === 3 ? +p[1] + '/' + +p[2] : '';
}
var TST = [
  ['todo', '할 일'],
  ['doing', '진행 중'],
  ['done', '완료'],
];

export { esc, pad, ms, hm, dayKey, dayLabel, toast, errMsg, colorOf, today, md, OWNER, TEAMS, EMO, EMOM, WD, TST };
