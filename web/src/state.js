/* 상태 · 공통 도우미 */
import { db } from './firebase.js';
import { OWNER } from './util.js';
import { render } from './ui/render.js';

var S = {
  u: null,
  email: '',
  me: null,
  staff: {},
  users: {},
  channels: [],
  dms: [],
  reads: {},
  view: null,
  msgs: [],
  lim: 60,
  thread: null,
  replies: [],
  pane: 'list',
  emo: null,
  edit: null,
  loaded: {},
  tasks: [],
  task: null,
  tcm: [],
  cf: null,
  tkf: 'all',
};
var UN = [];
function off() {
  UN.forEach(function (f) {
    try {
      f();
    } catch (e) {}
  });
  UN = [];
}
var LS = { CUN: null, TUN: null, TKUN: null, TCUN: null }; /* 지금 듣고 있는 구독 해제 함수 (대화·스레드·할 일·댓글) */
function isAdmin() {
  return S.email === OWNER || !!(S.me && S.me.admin);
}
function nameOf(uid) {
  var u = S.users[uid];
  if (!u) return '알 수 없음';
  var st = S.staff[u.email];
  return (st && st.name) || u.name || u.email;
}
function userOfEmail(e) {
  for (var k in S.users) if (S.users[k].email === e) return k;
  return '';
}
function convKey(v) {
  v = v || S.view;
  return v ? (v.k === 'c' ? 'c_' : 'd_') + v.id : '';
}
function convRef(v) {
  v = v || S.view;
  return db.collection(v.k === 'c' ? 'channels' : 'dms').doc(v.id);
}
function dmId(a, b) {
  return a < b ? a + '_' + b : b + '_' + a;
}
function dmOther(d) {
  return (
    (d.m || []).filter(function (x) {
      return x !== S.u.uid;
    })[0] || S.u.uid
  );
}
/* 나 말고 대화에 든 사람들 (1:1이면 한 명, 나에게 메모면 나) */
function dmOthers(d) {
  var o = (d.m || []).filter(function (x) {
    return x !== S.u.uid;
  });
  return o.length ? o : [S.u.uid];
}
function dmName(d) {
  return dmOthers(d)
    .map(nameOf)
    .sort(function (a, b) {
      return String(a).localeCompare(String(b), 'ko');
    })
    .join(', ');
}
/* 내가 들어간 채널 (공개 채널도 mem = 들어간 사람) */
function joined(c) {
  return !!c && (c.mem || []).indexOf(S.email) >= 0;
}
function chan(id) {
  for (var i = 0; i < S.channels.length; i++) if (S.channels[i].id === id) return S.channels[i];
  return null;
}
function dm(id) {
  for (var i = 0; i < S.dms.length; i++) if (S.dms[i].id === id) return S.dms[i];
  return null;
}
function vis(c) {
  return !c.priv || (c.mem || []).indexOf(S.email) >= 0;
}
function memOf(c) {
  return c && c.priv
    ? c.mem || []
    : Object.keys(S.staff).filter(function (e) {
        return S.staff[e].active !== false;
      });
}
function sname(e) {
  return (S.staff[e] && S.staff[e].name) || e;
}
var rT;
function soon() {
  clearTimeout(rT);
  rT = setTimeout(render, 30);
}
function narrow() {
  return window.innerWidth < 900;
}

export {
  off,
  isAdmin,
  nameOf,
  userOfEmail,
  convKey,
  convRef,
  dmId,
  dmOther,
  dmOthers,
  dmName,
  joined,
  chan,
  dm,
  vis,
  memOf,
  sname,
  soon,
  narrow,
  S,
  UN,
  LS,
};
