/* 대화 열기 */
import { db, FV } from './firebase.js';
import { toast, errMsg, ms } from './util.js';
import { convKey, convRef, dmId, chan, dm, nameOf, narrow, S, LS } from './state.js';
import { unread } from './unread.js';
import { listenTasks } from './tasks.js';
import { renderMsgs, renderThread } from './ui/messages.js';
import { render } from './ui/render.js';
import { listenPins, stopPins } from './msgact.js';
import { seenThread } from './threads.js';

function stopConv() {
  if (LS.CUN) {
    LS.CUN();
    LS.CUN = null;
  }
  if (LS.TKUN) {
    LS.TKUN();
    LS.TKUN = null;
  }
  stopPins();
  stopRd();
  S.tasks = [];
  S.pins = [];
  S.menu = null;
  S.sheet = null;
  closeThread(true);
}
function openConv(v) {
  stopConv();
  if (v.k === 'c') {
    var c = chan(v.id);
    if (c && c.kind === 'proj' && !v.tab) v.tab = unread('c_' + c.id, c) ? 'chat' : 'task';
    if (c && c.kind !== 'proj') delete v.tab;
  }
  /* '새 메시지' 구분선: 열기 전에 마지막으로 읽은 시각을 기억해요 */
  var ck = convKey(v),
    cc = v.k === 'c' ? chan(v.id) : v.k === 'd' ? dm(v.id) : null;
  S.divAt = cc && unread(ck, cc) && S.reads[ck] && S.reads[ck].at ? ms(S.reads[ck].at) : null;
  S.divScroll = !!S.divAt;
  S.view = v;
  S.msgs = [];
  S.lim = 60;
  S.emo = null;
  S.edit = null;
  S.pane = 'conv';
  S.atBottom = true;
  listen();
  listenPins();
  listenRd();
  if (v.tab) listenTasks();
  markRead();
  render();
  setTimeout(function () {
    var t = document.getElementById('ta');
    if (t && !narrow()) t.focus();
  }, 50);
}
function listen() {
  if (LS.CUN) LS.CUN();
  var v = S.view;
  LS.CUN = convRef(v)
    .collection('msgs')
    .orderBy('at', 'desc')
    .limit(S.lim)
    .onSnapshot(
      { includeMetadataChanges: false },
      function (s) {
        if (S.view !== v) return;
        S.msgs = s.docs
          .map(function (d) {
            var o = d.data();
            o.id = d.id;
            return o;
          })
          .reverse();
        S.more = s.size >= S.lim;
        markRead();
        renderMsgs();
      },
      function (e) {
        toast('메시지를 불러오지 못했어요 · ' + errMsg(e));
      },
    );
}
function markRead() {
  if (!S.view || document.hidden || (S.view.k !== 'c' && S.view.k !== 'd') || S.view.tab === 'task') return;
  var k = convKey(),
    c = S.view.k === 'c' ? chan(S.view.id) : dm(S.view.id);
  if (c && !unread(k, c) && S.reads[k]) return;
  db.collection('users')
    .doc(S.u.uid)
    .collection('reads')
    .doc(k)
    .set({ at: FV.serverTimestamp() })
    .catch(function () {});
  writeRd();
}
/* 읽음 표시(카카오톡처럼): 이 대화를 어디까지 읽었는지 멤버끼리 보는 칸 */
function writeRd() {
  var v = S.view;
  if (!v || (v.k !== 'c' && v.k !== 'd')) return;
  convRef(v)
    .collection('rd')
    .doc(S.u.uid)
    .set({ at: FV.serverTimestamp() })
    .catch(function () {});
}
function listenRd() {
  stopRd();
  var v = S.view;
  S.rd = {};
  LS.RDUN = convRef(v)
    .collection('rd')
    .onSnapshot(
      function (s) {
        if (S.view !== v) return;
        S.rd = {};
        s.forEach(function (d) {
          var a = d.data().at;
          S.rd[d.id] = a ? ms(a) : Date.now();
        });
        /* 내 칸이 없거나 마지막 메시지보다 옛날이면 (보고 있는 중이니) 지금으로 */
        var c = v.k === 'c' ? chan(v.id) : dm(v.id),
          mine = S.rd[S.u.uid] || 0;
        if (!document.hidden && v.tab !== 'task' && (!mine || (c && c.lastAt && ms(c.lastAt) > mine + 1000))) writeRd();
        renderMsgs();
      },
      function () {},
    );
}
function stopRd() {
  if (LS.RDUN) {
    LS.RDUN();
    LS.RDUN = null;
  }
  S.rd = {};
}
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) markRead();
});
function openThread(mid) {
  if (LS.TUN) {
    LS.TUN();
    LS.TUN = null;
  }
  if (LS.TCUN) {
    LS.TCUN();
    LS.TCUN = null;
  }
  S.task = null;
  S.prof = null;
  S.thread = mid;
  seenThread(S.view.k, S.view.id, mid);
  S.replies = [];
  S.pane = 'thread';
  var v = S.view;
  LS.TUN = convRef(v)
    .collection('msgs')
    .doc(mid)
    .collection('replies')
    .orderBy('at')
    .onSnapshot(
      function (s) {
        if (S.thread !== mid) return;
        S.replies = s.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        });
        /* 열어 둔 채로 새 답글이 와도 '본 것'으로 */
        if (!document.hidden && S.replies.length) seenThread(v.k, v.id, mid);
        renderThread();
      },
      function (e) {
        toast(errMsg(e));
      },
    );
  render();
  setTimeout(function () {
    var t = document.getElementById('tta');
    if (t && !narrow()) t.focus();
  }, 50);
}
function closeThread(silent) {
  if (LS.TUN) {
    LS.TUN();
    LS.TUN = null;
  }
  if (LS.TCUN) {
    LS.TCUN();
    LS.TCUN = null;
  }
  S.thread = null;
  S.replies = [];
  S.task = null;
  S.prof = null;
  S.tcm = [];
  if (S.pane === 'thread') S.pane = S.view ? 'conv' : 'list';
  if (!silent) render();
}
function openDM(uid) {
  var id = dmId(S.u.uid, uid),
    ref = db.collection('dms').doc(id);
  ref
    .get()
    .then(function (d) {
      if (d.exists) return;
      var m = [S.u.uid, uid].sort();
      return ref.set({ m: m, at: FV.serverTimestamp() });
    })
    .then(function () {
      openConv({ k: 'd', id: id });
    })
    .catch(function (e) {
      toast('DM을 열지 못했어요 · ' + errMsg(e));
    });
}

/* 그룹 DM (나 포함 3~8명) · 같은 사람들끼리 방이 있으면 그 방을 열어요 */
var GMAX = 8;
function openGroup(uids) {
  var m = uids
    .filter(function (u, i) {
      return u && u !== S.u.uid && uids.indexOf(u) === i;
    })
    .concat([S.u.uid])
    .sort();
  if (m.length <= 2) return openDM(m[0] === S.u.uid ? m[1] || S.u.uid : m[0]);
  if (m.length > GMAX) return toast('그룹 DM은 나를 포함해 ' + GMAX + '명까지예요');
  var key = m.join(',');
  var old = S.dms.filter(function (d) {
    return d.g && (d.m || []).slice().sort().join(',') === key;
  })[0];
  if (old) return openConv({ k: 'd', id: old.id });
  var id = 'g_' + db.collection('dms').doc().id;
  db.collection('dms')
    .doc(id)
    .set({ m: m, g: true, at: FV.serverTimestamp() })
    .then(function () {
      openConv({ k: 'd', id: id });
    })
    .catch(function (e) {
      toast('그룹 DM을 만들지 못했어요 · ' + errMsg(e));
    });
}

/* 그룹 DM 나가기: '○○님이 나갔어요'를 남기고, 멤버에서 나를 빼요 (규칙: 나만 뺄 수 있음) */
function leaveGroup(id) {
  var ref = db.collection('dms').doc(id),
    me = nameOf(S.u.uid),
    b = db.batch();
  b.set(ref.collection('msgs').doc(), { uid: S.u.uid, text: '', sys: 'left', at: FV.serverTimestamp(), men: [] });
  b.update(ref, { last: { text: me + '님이 나갔어요', by: S.u.uid }, lastAt: FV.serverTimestamp() });
  return b
    .commit()
    .then(function () {
      /* 나가기 전에 그 방 듣기를 먼저 멈춰요 (나간 뒤엔 읽을 권한이 없어서) */
      if (S.view && S.view.k === 'd' && S.view.id === id) {
        stopConv();
        S.view = null;
        S.pane = 'list';
      }
      return ref.update({ m: FV.arrayRemove(S.u.uid) });
    })
    .then(
      function () {
        toast('그룹 DM에서 나왔어요');
        render();
      },
      function (e) {
        toast('나가지 못했어요 · ' + errMsg(e));
      },
    );
}
export { leaveGroup, stopConv, openConv, listen, markRead, openThread, closeThread, openDM, openGroup, GMAX };
