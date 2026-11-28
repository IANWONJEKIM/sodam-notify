/* 할 일 (데이터) */
import { FV } from './firebase.js';
import { toast, errMsg } from './util.js';
import { convRef, soon, S, LS } from './state.js';
import { closeThread } from './conv.js';
import { renderCmts } from './ui/board.js';
import { render } from './ui/render.js';

function tk(id) {
  for (var i = 0; i < S.tasks.length; i++) if (S.tasks[i].id === id) return S.tasks[i];
  return null;
}
function tkRef(id) {
  return convRef().collection('tasks').doc(id);
}
function listenTasks() {
  if (LS.TKUN) LS.TKUN();
  var v = S.view;
  S.tasks = [];
  LS.TKUN = convRef(v)
    .collection('tasks')
    .orderBy('at')
    .onSnapshot(
      function (s) {
        if (S.view !== v) return;
        S.tasks = s.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        });
        if (S.task && !tk(S.task)) closeThread(true);
        soon();
      },
      function (e) {
        toast('할 일을 불러오지 못했어요 · ' + errMsg(e));
      },
    );
}
function openTask(id) {
  if (LS.TUN) {
    LS.TUN();
    LS.TUN = null;
  }
  if (LS.TCUN) {
    LS.TCUN();
    LS.TCUN = null;
  }
  S.thread = null;
  S.task = id;
  S.tcm = [];
  S.pane = 'thread';
  var v = S.view;
  LS.TCUN = tkRef(id)
    .collection('cmts')
    .orderBy('at')
    .onSnapshot(
      function (s) {
        if (S.task !== id) return;
        S.tcm = s.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        });
        renderCmts();
      },
      function (e) {
        toast(errMsg(e));
      },
    );
  render();
}
function tkUp(id, d) {
  tkRef(id)
    .update(d)
    .catch(function (e) {
      toast('저장하지 못했어요 · ' + errMsg(e));
    });
}
function tkAdd() {
  var t = document.getElementById('tk-title'),
    w = document.getElementById('tk-who'),
    du = document.getElementById('tk-due'),
    title = ((t && t.value) || '').trim();
  if (!title) return toast('할 일을 적어 주세요.');
  convRef()
    .collection('tasks')
    .add({
      title: title.slice(0, 200),
      memo: '',
      who: w && w.value ? [w.value] : [],
      due: (du && du.value) || '',
      st: 'todo',
      by: S.u.uid,
      at: FV.serverTimestamp(),
      cc: 0,
    })
    .catch(function (e) {
      toast('추가하지 못했어요 · ' + errMsg(e));
    });
  t.value = '';
  if (du) du.value = '';
  t.focus();
}
function tkSt(id, st) {
  tkUp(id, { st: st, doneAt: st === 'done' ? FV.serverTimestamp() : null });
}

export { tk, tkRef, listenTasks, openTask, tkUp, tkAdd, tkSt };
