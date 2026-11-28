/* 사람: 프로필 · 상태 표시 · 접속 중 · 환경 설정
   모두 users/{uid} 한 문서에 둬요 (본인만 고침, 규칙으로 칸·글자 수 제한)
   - dname 표시 이름 · title 직책 · phone 연락처
   - st {e 이모지, t 문구, until 끝나는 시각(ms) 또는 null}
   - on 마지막으로 앱을 열어 둔 시각 (5분마다 기록, 10분 안이면 '접속 중')
   - prefs {theme, fs, enter, nt} 설정 (계정에 저장 → 다른 기기도 같게) */
import { db, FV } from './firebase.js';
import { esc, ms, toast, errMsg } from './util.js';
import { nameOf, S } from './state.js';

/* ── 상태 ── */
var ST_PRESET = [
  ['🏖', '휴무', 'tomorrow'],
  ['📦', '입고 중', '1h'],
  ['🗓', '회의 중', '1h'],
  ['🍱', '점심', '1h'],
  ['🚗', '외근', 'today'],
  ['🤒', '병가', 'today'],
];
var ST_UNTIL = [
  ['', '지우지 않기'],
  ['30m', '30분'],
  ['1h', '1시간'],
  ['4h', '4시간'],
  ['today', '오늘까지'],
  ['tomorrow', '내일까지'],
  ['week', '이번 주까지'],
];
function untilMs(code) {
  var d = new Date();
  if (code === '30m') return Date.now() + 30 * 6e4;
  if (code === '1h') return Date.now() + 60 * 6e4;
  if (code === '4h') return Date.now() + 240 * 6e4;
  if (code === 'today') return d.setHours(23, 59, 59, 999);
  if (code === 'tomorrow') return (d.setDate(d.getDate() + 1), d.setHours(23, 59, 59, 999));
  if (code === 'week') return (d.setDate(d.getDate() + ((7 - d.getDay()) % 7)), d.setHours(23, 59, 59, 999));
  return null;
}
/* 지금 보이는 상태 (끝나는 시각이 지났으면 없음) */
function stOf(uid) {
  var u = S.users[uid],
    st = u && u.st;
  if (!st || (!st.e && !st.t)) return null;
  if (st.until && st.until < Date.now()) return null;
  return st;
}
function stUntilLabel(st) {
  if (!st || !st.until) return '';
  var d = new Date(st.until),
    n = new Date();
  var sameDay = d.toDateString() === n.toDateString();
  n.setDate(n.getDate() + 1);
  if (sameDay)
    return d.getHours() === 23 && d.getMinutes() === 59
      ? '오늘까지'
      : d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') + '까지';
  if (d.toDateString() === n.toDateString()) return '내일까지';
  return d.getMonth() + 1 + '/' + d.getDate() + '까지';
}
/* 이름 옆에 붙이는 상태 이모지 */
function stBadge(uid) {
  var st = stOf(uid);
  return st && st.e
    ? ' <span class="stb" title="' +
        esc((st.t || '') + (st.until ? ' · ' + stUntilLabel(st) : '')) +
        '">' +
        esc(st.e) +
        '</span>'
    : '';
}
function saveStatus(e, t, code) {
  var st = e || t ? { e: String(e || '').slice(0, 16), t: String(t || '').slice(0, 40), until: untilMs(code) } : null;
  return db
    .collection('users')
    .doc(S.u.uid)
    .update({ st: st })
    .then(
      function () {
        toast(st ? '상태를 바꿨어요' : '상태를 지웠어요');
      },
      function (x) {
        toast(errMsg(x));
      },
    );
}

/* ── 접속 중: 앱을 열어 둔 동안 5분마다 기록 ── */
var HB = null;
function beat() {
  if (!S.u || document.hidden) return;
  db.collection('users')
    .doc(S.u.uid)
    .update({ on: FV.serverTimestamp() })
    .catch(function () {});
}
function startPresence() {
  stopPresence();
  beat();
  HB = setInterval(beat, 5 * 6e4);
}
function stopPresence() {
  if (HB) clearInterval(HB);
  HB = null;
}
document.addEventListener('visibilitychange', function () {
  if (!document.hidden && HB) beat();
});
function isOnline(uid) {
  var u = S.users[uid];
  return !!(u && u.on && Date.now() - ms(u.on) < 10 * 6e4);
}

/* ── 설정 ── */
var PDEF = { theme: 'system', fs: 'm', enter: 'send', nt: { mode: 'all', dnd: false } };
function prefs() {
  var u = S.u && S.users[S.u.uid],
    p = (u && u.prefs) || {};
  return {
    theme: p.theme || PDEF.theme,
    fs: p.fs || PDEF.fs,
    enter: p.enter || PDEF.enter,
    nt: Object.assign({}, PDEF.nt, p.nt || {}),
  };
}
/* 화면에 바로 적용 (테마 · 글자 크기) */
var lastApplied = '';
function applyPrefs() {
  var p = prefs(),
    key = p.theme + '|' + p.fs;
  if (key === lastApplied) return;
  lastApplied = key;
  var r = document.documentElement;
  if (p.theme === 'system') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', p.theme);
  document.body.style.zoom = p.fs === 's' ? '0.92' : p.fs === 'l' ? '1.12' : '';
  try {
    localStorage.setItem('sodam.look', key); /* 다음에 열 때 깜빡임 없이 먼저 적용 */
  } catch (e) {}
}
(function early() {
  try {
    var k = (localStorage.getItem('sodam.look') || '').split('|');
    if (k[0] && k[0] !== 'system') document.documentElement.setAttribute('data-theme', k[0]);
    if (k[1] === 's' || k[1] === 'l')
      document.addEventListener('DOMContentLoaded', function () {
        document.body.style.zoom = k[1] === 's' ? '0.92' : '1.12';
      });
  } catch (e) {}
})();
function setPref(path, val) {
  var up = {};
  up['prefs.' + path] = val;
  db.collection('users')
    .doc(S.u.uid)
    .update(up)
    .catch(function (x) {
      toast(errMsg(x));
    });
}
function saveProfile(f) {
  return db
    .collection('users')
    .doc(S.u.uid)
    .update({
      dname: String(f.dname || '')
        .trim()
        .slice(0, 20),
      title: String(f.title || '')
        .trim()
        .slice(0, 20),
      phone: String(f.phone || '')
        .trim()
        .slice(0, 20),
    })
    .then(
      function () {
        toast('프로필을 저장했어요');
        return true;
      },
      function (x) {
        toast('저장하지 못했어요 · ' + errMsg(x));
        return false;
      },
    );
}
/* 이 사람 팀 (관리자가 정한 것) */
function teamsOf(uid) {
  var u = S.users[uid],
    st = u && S.staff[u.email];
  return (st && st.teams) || [];
}
function lastSeenLabel(uid) {
  var u = S.users[uid];
  if (isOnline(uid)) return '접속 중';
  if (!u || !u.on) return '';
  var m = Math.round((Date.now() - ms(u.on)) / 6e4);
  if (m < 60) return m + '분 전 접속';
  if (m < 24 * 60) return Math.round(m / 60) + '시간 전 접속';
  return Math.round(m / 1440) + '일 전 접속';
}

export {
  ST_PRESET,
  ST_UNTIL,
  stOf,
  stUntilLabel,
  stBadge,
  saveStatus,
  startPresence,
  stopPresence,
  isOnline,
  prefs,
  applyPrefs,
  setPref,
  saveProfile,
  teamsOf,
  lastSeenLabel,
  nameOf,
};
