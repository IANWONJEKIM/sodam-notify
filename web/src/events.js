/* 입력 · 클릭 */
import { auth, FV } from './firebase.js';
import { toast, errMsg } from './util.js';
import { off, isAdmin, chan, narrow, S } from './state.js';
import { cjoin, cleave } from './chmem.js';
import { browseList } from './ui/layout.js';
import { login } from './auth.js';
import { stopConv, openConv, listen, markRead, openThread, closeThread, openDM, openGroup } from './conv.js';
import { tk, tkRef, openTask, tkUp, tkAdd, tkSt } from './tasks.js';
import { send, react, delMsg, saveEdit } from './messages.js';
import { grow } from './ui/common.js';
import { renderMsgs, renderThread } from './ui/messages.js';
import { renderCmts } from './ui/board.js';
import { render } from './ui/render.js';
import { adminAct, openCset, csBack, csetSave } from './admin.js';
import { mpUpdate, mpPick, MP } from './mention.js';
import { renderOverlay } from './ui/overlay.js';
import {
  findMsg,
  togglePin,
  toggleSave,
  savedDone,
  savedDel,
  copyLink,
  copyText,
  jump,
  forward,
  actSeen,
} from './msgact.js';
import { actSeenAt } from './ui/tabs.js';

function isComp(id) {
  return id === 'ta' || id === 'tta' || id === 'tkc';
}
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (isComp(t.id)) {
    grow(t);
    mpUpdate(t);
  }
  if (t.id === 'fw-q' && S.fwd) {
    S.fwd.q = t.value;
    renderOverlay();
  }
  /* 채널 찾아보기 검색: 목록만 다시 그려요 (입력칸은 그대로) */
  if (t.id === 'br-q') {
    S.bq = t.value;
    var bl = document.getElementById('br-list');
    if (bl) bl.innerHTML = browseList();
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
  if (ev.key === 'Escape' && (S.sheet || S.fwd || S.menu)) {
    S.sheet = S.fwd = S.menu = null;
    renderOverlay();
    renderMsgs();
    renderThread();
    return;
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
  if (S.menu && (!b || b.getAttribute('data-act') !== 'menu')) {
    S.menu = null;
    renderMsgs();
    renderThread();
  }
  /* 길게 누른 직후 손을 뗄 때 생기는 클릭은 무시해요 */
  if (Date.now() - LP.fired < 600 && !(b && b.closest('#ov'))) return;
  if (!b || b.disabled) return;
  /* 아래 메뉴·전달 창에서 고르면 닫아요 (지우기는 두 번 눌러야 해서 제외) */
  if (b.closest('#ov') && S.sheet && ['del', 'ovclose', 'fwto', 'fwgo'].indexOf(b.getAttribute('data-act')) < 0) {
    S.sheet = null;
    renderOverlay();
  }
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
    S.nd = [];
    S.pane = 'conv';
    render();
    return;
  }
  if (a === 'dmpick') {
    var nd = S.nd || (S.nd = []),
      ni = nd.indexOf(v);
    ni >= 0 ? nd.splice(ni, 1) : nd.push(v);
    render();
    return;
  }
  if (a === 'dmgo') {
    var pick = (S.nd || []).slice();
    if (!pick.length) return;
    S.nd = [];
    return pick.length === 1 ? openDM(pick[0]) : openGroup(pick);
  }
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
    if (isAdmin() || v === 'pub') return openCset('', v);
    return;
  }
  if (a === 'csback') return csBack();
  if (a === 'cfsave') return csetSave();
  if (a === 'browse') {
    stopConv();
    S.view = { k: 'browse' };
    S.bq = '';
    S.pane = 'conv';
    render();
    setTimeout(function () {
      var q = document.getElementById('br-q');
      if (q && !narrow()) q.focus();
    }, 30);
    return;
  }
  if (a === 'cinfo') {
    stopConv();
    S.cleave = null;
    S.view = { k: 'cinfo', id: id };
    S.pane = 'conv';
    render();
    return;
  }
  if (a === 'cjoin') return cjoin(id);
  if (a === 'cleave') {
    var lc = chan(id);
    /* 비공개 채널은 다시 못 들어오니 한 번 더 확인 */
    if (lc && lc.priv && S.cleave !== id) {
      S.cleave = id;
      render();
      return;
    }
    return cleave(id);
  }
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
  if (msgActs(a, b, id, rid, v)) return;
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
    S.sheet = null;
    renderOverlay();
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

/* 메시지 메뉴 · 탭 · 고정 · 저장 · 전달 */
function msgActs(a, b, id, rid, v) {
  if (a === 'tabgo') {
    if (S.tab === 'act' && v !== 'act') S.actPrev = null;
    S.tab = v;
    if (v === 'act') {
      S.actPrev = actSeenAt(); /* 이번에 본 것 전까지만 '새 활동'으로 보여요 */
      actSeen();
    }
    if (narrow()) S.pane = 'list';
    render();
    return true;
  }
  if (a === 'actf' || a === 'svf') {
    S[a] = v;
    render();
    return true;
  }
  if (a === 'gomsg') {
    var p = String(v || '').split('/');
    S.sheet = S.fwd = null;
    jump({ k: p[0], id: p[1], mid: p[2], rid: p[3] || '' });
    return true;
  }
  if (a === 'menu') {
    var mk = rid || id;
    S.menu = S.menu === mk ? null : mk;
    renderMsgs();
    renderThread();
    return true;
  }
  if (a === 'save') {
    toggleSave(id, rid);
    return true;
  }
  if (a === 'pin') {
    togglePin(id);
    return true;
  }
  if (a === 'link') {
    copyLink(id, rid);
    return true;
  }
  if (a === 'copy') {
    copyText(id, rid);
    return true;
  }
  if (a === 'fwd') {
    var x = findMsg(id, rid);
    if (!x) return true;
    S.menu = null;
    S.sheet = null;
    S.fwd = { x: x, k: S.view.k, cid: S.view.id, mid: id, rid: rid || '', q: '', to: null };
    renderMsgs();
    renderOverlay();
    setTimeout(function () {
      var q = document.getElementById('fw-q');
      if (q && !narrow()) q.focus();
    }, 30);
    return true;
  }
  if (a === 'fwto') {
    var tb = b.querySelector('.nm');
    S.fwd.to = { k: b.getAttribute('data-k'), id: id, name: tb ? tb.textContent : '' };
    renderOverlay();
    return true;
  }
  if (a === 'fwgo') {
    var n = document.getElementById('fw-note');
    forward(S.fwd && S.fwd.to, n ? n.value : '');
    renderOverlay();
    return true;
  }
  if (a === 'ovclose') {
    S.sheet = S.fwd = null;
    renderOverlay();
    return true;
  }
  if (a === 'pins') {
    if (!S.view || (S.view.k !== 'c' && S.view.k !== 'd')) return true;
    closeThread(true);
    S.view = { k: 'pins', ck: S.view.k, id: S.view.id };
    render();
    return true;
  }
  if (a === 'svdone' || a === 'svundo') {
    savedDone(id, a === 'svdone');
    return true;
  }
  if (a === 'svdel') {
    savedDel(id);
    return true;
  }
  return false;
}

/* 휴대폰: 메시지를 길게 누르면 아래 메뉴 */
var LP = { t: null, x: 0, y: 0, fired: 0 };
document.addEventListener(
  'touchstart',
  function (ev) {
    var m = ev.target.closest && ev.target.closest('.m[data-id]');
    if (!m || ev.touches.length > 1 || ev.target.closest('button, a, textarea, input') || m.querySelector('#eta'))
      return;
    LP.x = ev.touches[0].clientX;
    LP.y = ev.touches[0].clientY;
    clearTimeout(LP.t);
    m.classList.add('press');
    LP.t = setTimeout(function () {
      m.classList.remove('press');
      var x = findMsg(m.getAttribute('data-id'), m.getAttribute('data-rid'));
      if (!x || x.del) return;
      LP.fired = Date.now();
      if (navigator.vibrate) navigator.vibrate(10);
      S.emo = null;
      S.sheet = { id: m.getAttribute('data-id'), rid: m.getAttribute('data-rid') || '' };
      renderOverlay();
    }, 450);
  },
  { passive: true },
);
function lpCancel() {
  clearTimeout(LP.t);
  var p = document.querySelector('.m.press');
  if (p) p.classList.remove('press');
}
document.addEventListener(
  'touchmove',
  function (ev) {
    if (Math.abs(ev.touches[0].clientX - LP.x) > 10 || Math.abs(ev.touches[0].clientY - LP.y) > 10) lpCancel();
  },
  { passive: true },
);
document.addEventListener('touchend', lpCancel, { passive: true });
document.addEventListener('touchcancel', lpCancel, { passive: true });
/* 길게 누를 때 뜨는 브라우저 메뉴(복사·공유) 대신 우리 메뉴 */
document.addEventListener('contextmenu', function (ev) {
  if (narrow() && ev.target.closest && ev.target.closest('.m[data-id]') && !ev.target.closest('a')) ev.preventDefault();
});

export { isComp };
