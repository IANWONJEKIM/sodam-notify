/* 대화 열기 */
import { db, FV } from './firebase.js';
import { toast, errMsg } from './util.js';
import { convKey, convRef, dmId, chan, dm, narrow, S, LS } from './state.js';
import { unread } from './unread.js';
import { listenTasks } from './tasks.js';
import { renderMsgs, renderThread } from './ui/messages.js';
import { render } from './ui/render.js';

function stopConv() {
  if (LS.CUN) {
    LS.CUN();
    LS.CUN = null;
  }
  if (LS.TKUN) {
    LS.TKUN();
    LS.TKUN = null;
  }
  S.tasks = [];
  closeThread(true);
}
function openConv(v) {
  stopConv();
  if (v.k === 'c') {
    var c = chan(v.id);
    if (c && c.kind === 'proj' && !v.tab) v.tab = unread('c_' + c.id, c) ? 'chat' : 'task';
    if (c && c.kind !== 'proj') delete v.tab;
  }
  S.view = v;
  S.msgs = [];
  S.lim = 60;
  S.emo = null;
  S.edit = null;
  S.pane = 'conv';
  S.atBottom = true;
  listen();
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
  S.thread = mid;
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
  S.tcm = [];
  if (S.pane === 'thread') S.pane = 'conv';
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

export { stopConv, openConv, listen, markRead, openThread, closeThread, openDM };
