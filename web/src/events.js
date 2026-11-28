/* 입력 · 클릭 */
import { auth, FV } from './firebase.js';
import { toast, errMsg } from './util.js';
import { off, isAdmin, narrow, S } from './state.js';
import { login } from './auth.js';
import { stopConv, openConv, listen, markRead, openThread, closeThread, openDM } from './conv.js';
import { tk, tkRef, openTask, tkUp, tkAdd, tkSt } from './tasks.js';
import { send, react, delMsg, saveEdit } from './messages.js';
import { grow } from './ui/common.js';
import { renderMsgs, renderThread } from './ui/messages.js';
import { renderCmts } from './ui/board.js';
import { render } from './ui/render.js';
import { adminAct, openCset, csBack } from './admin.js';
import { mpUpdate, mpPick, MP } from './mention.js';

function isComp(id) {
  return id === 'ta' || id === 'tta' || id === 'tkc';
}
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (isComp(t.id)) {
    grow(t);
    mpUpdate(t);
  }
});
document.addEventListener('change', function (ev) {
  var t = ev.target,
    id = S.task;
  if (!id || !tk(id)) return;
  var x = tk(id);
  if (t.id === 'td-title') {
    var v = t.value.trim();
    if (v && v !== x.title) tkUp(id, { title: v.slice(0, 200) });
    else t.value = x.title;
  }
  if (t.id === 'td-memo' && t.value !== (x.memo || '')) tkUp(id, { memo: t.value.slice(0, 2000) });
  if (t.id === 'td-due' && t.value !== (x.due || '')) tkUp(id, { due: t.value });
});
document.addEventListener('keydown', function (ev) {
  var t = ev.target;
  if (isComp(t.id) && MP.id === t.id) {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      MP.sel = (MP.sel + (ev.key === 'ArrowDown' ? 1 : -1) + MP.list.length) % MP.list.length;
      mpUpdate(t);
      return;
    }
    if (ev.key === 'Enter' || ev.key === 'Tab') {
      ev.preventDefault();
      mpPick(MP.list[MP.sel]);
      return;
    }
    if (ev.key === 'Escape') {
      var p = document.getElementById(t.id + '-pop');
      if (p) p.hidden = true;
      MP.id = null;
      return;
    }
  }
  if (isComp(t.id) && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && !narrow()) {
    ev.preventDefault();
    var v = t.value;
    if (!v.trim()) return;
    t.value = '';
    grow(t);
    S.cmScroll = t.id === 'tkc';
    send(v, t.id);
    return;
  }
  if (t.id === 'tk-title' && ev.key === 'Enter' && !ev.isComposing) {
    ev.preventDefault();
    tkAdd();
    return;
  }
  if (t.id === 'td-title' && ev.key === 'Enter' && !ev.isComposing) {
    ev.preventDefault();
    t.blur();
    return;
  }
  if (t.classList && t.classList.contains('tk') && (ev.key === 'Enter' || ev.key === ' ') && t === ev.target) {
    ev.preventDefault();
    openTask(t.getAttribute('data-id'));
    return;
  }
  if (t.id === 'eta') {
    if (ev.key === 'Escape') {
      S.edit = null;
      S.thread ? renderThread() : 0;
      renderMsgs();
      return;
    }
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      var m = t.closest('.m');
      saveEdit(m.getAttribute('data-id'), m.getAttribute('data-rid'), t.value);
    }
  }
  if (ev.key === 'Escape' && S.emo) {
    S.emo = null;
    renderMsgs();
    renderThread();
  }
});
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-act]');
  if (S.emo && (!b || ['react', 'emo'].indexOf(b.getAttribute('data-act')) < 0)) {
    S.emo = null;
    renderMsgs();
    renderThread();
  }
  if (!b && narrow()) {
    var mm = ev.target.closest('.m');
    if (mm && !ev.target.closest('a')) {
      var k = mm.getAttribute('data-rid') || mm.getAttribute('data-id');
      S.act = S.act === k ? null : k;
      renderMsgs();
      renderThread();
      return;
    }
  }
  if (!b || b.disabled) return;
  var a = b.getAttribute('data-act'),
    id = b.getAttribute('data-id'),
    rid = b.getAttribute('data-rid'),
    v = b.getAttribute('data-v');
  if (a === 'login') return login();
  if (a === 'logout') {
    off();
    return auth.signOut();
  }
  if (a === 'open') return openConv({ k: b.getAttribute('data-k'), id: id });
  if (a === 'back') {
    S.pane = 'list';
    if (narrow()) S.view = S.view && S.view.k !== 'c' && S.view.k !== 'd' ? null : S.view;
    render();
    return;
  }
  if (a === 'newdm') {
    stopConv();
    S.view = { k: 'newdm' };
    S.pane = 'conv';
    render();
    return;
  }
  if (a === 'dmto') return openDM(v);
  if (a === 'admin') {
    stopConv();
    S.view = { k: 'admin' };
    S.pane = 'conv';
    render();
    if (v === 'ch')
      setTimeout(function () {
        var c = document.getElementById('chadm');
        if (c) c.scrollIntoView();
      }, 30);
    return;
  }
  if (a === 'send') {
    var t = document.getElementById(v);
    if (!t || !t.value.trim()) return;
    var val = t.value;
    t.value = '';
    grow(t);
    S.cmScroll = v === 'tkc';
    send(val, v);
    t.focus();
    return;
  }
  if (a === 'cset') {
    if (id) return openCset(id);
    if (isAdmin()) return openCset('', v);
    return;
  }
  if (a === 'csback') return csBack();
  if (a === 'showdone') {
    S.showDone = !S.showDone;
    render();
    return;
  }
  if (a === 'tab') {
    if (!S.view || !S.view.tab) return;
    closeThread(true);
    S.view.tab = v;
    S.pane = 'conv';
    S.atBottom = true;
    markRead();
    render();
    return;
  }
  if (a === 'tkf') {
    S.tkf = v;
    render();
    return;
  }
  if (a === 'tkadd') return tkAdd();
  if (a === 'tkopen') return S.task === id && !narrow() ? closeThread() : openTask(id);
  if (a === 'tknext') {
    var tt = tk(id);
    if (tt) tkSt(id, (tt.st || 'todo') === 'todo' ? 'doing' : 'done');
    return;
  }
  if (a === 'tkst') return tkSt(id, v);
  if (a === 'tkwho') {
    var tw = tk(id);
    if (!tw) return;
    var has = (tw.who || []).indexOf(v) >= 0,
      up = {};
    up.who = has ? FV.arrayRemove(v) : FV.arrayUnion(v);
    tkUp(id, up);
    return;
  }
  if (a === 'tkdel') {
    if (S.tkdel !== id) {
      S.tkdel = id;
      render();
      setTimeout(function () {
        if (S.tkdel === id) {
          S.tkdel = null;
          render();
        }
      }, 3000);
      return;
    }
    S.tkdel = null;
    closeThread(true);
    tkRef(id)
      .delete()
      .then(
        function () {
          toast('할 일을 지웠어요');
        },
        function (e) {
          toast(errMsg(e));
        },
      );
    render();
    return;
  }
  if (a === 'cmdel') {
    if (S.cmdel !== id) {
      S.cmdel = id;
      renderCmts();
      setTimeout(function () {
        if (S.cmdel === id) {
          S.cmdel = null;
          renderCmts();
        }
      }, 3000);
      return;
    }
    S.cmdel = null;
    var tr = tkRef(S.task);
    tr.collection('cmts')
      .doc(id)
      .delete()
      .then(function () {
        return tr.update({ cc: FV.increment(-1) });
      })
      .catch(function (e) {
        toast(errMsg(e));
      });
    return;
  }
  if (a === 'mpick') return mpPick(v);
  if (a === 'thread') return openThread(id);
  if (a === 'tclose') return closeThread();
  if (a === 'more') {
    S.lim += 60;
    S.keepTop = true;
    listen();
    return;
  }
  if (a === 'emo') {
    ev.stopPropagation();
    S.emo = S.emo === (rid || id) ? null : rid || id;
    renderMsgs();
    renderThread();
    return;
  }
  if (a === 'react') {
    S.emo = null;
    react(id, rid, b.getAttribute('data-k'));
    return;
  }
  if (a === 'edit') {
    S.edit = rid || id;
    rid ? renderThread() : renderMsgs();
    setTimeout(function () {
      var e = document.getElementById('eta');
      if (e) {
        e.focus();
        e.setSelectionRange(e.value.length, e.value.length);
      }
    }, 20);
    return;
  }
  if (a === 'edcancel') {
    S.edit = null;
    renderMsgs();
    renderThread();
    return;
  }
  if (a === 'edsave') {
    var et = document.getElementById('eta');
    if (et) saveEdit(id, rid, et.value);
    return;
  }
  if (a === 'del') {
    if (S.delAsk !== (rid || id)) {
      S.delAsk = rid || id;
      toast('한 번 더 누르면 지워져요');
      setTimeout(function () {
        S.delAsk = null;
      }, 3000);
      return;
    }
    S.delAsk = null;
    delMsg(id, rid);
    return;
  }
  adminAct(a, b);
});
document.addEventListener(
  'scroll',
  function (ev) {
    if (ev.target && ev.target.id === 'msgs' && ev.target.scrollTop < 40 && S.more && !S.loadingMore) {
      S.loadingMore = true;
      S.lim += 60;
      S.keepTop = true;
      listen();
      setTimeout(function () {
        S.loadingMore = false;
      }, 800);
    }
  },
  true,
);
var rzT,
  wasN = narrow();
window.addEventListener('resize', function () {
  clearTimeout(rzT);
  rzT = setTimeout(function () {
    if (narrow() !== wasN) {
      wasN = narrow();
      render();
    }
  }, 150);
});

export { isComp };
