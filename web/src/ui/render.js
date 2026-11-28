/* 전체 다시 그리기 · 쓰던 글 지키기 */
import { vis, joined, narrow, S } from '../state.js';
import { unread, UC } from '../unread.js';
import { grow } from '../ui/common.js';
import { threadHTML, renderMsgs } from '../ui/messages.js';
import { sideHTML, mainHTML } from '../ui/layout.js';
import { taskHTML, renderCmts } from '../ui/board.js';
import { railHTML, botHTML, isTool, toolHTML } from '../ui/tabs.js';
import { renderOverlay } from '../ui/overlay.js';
import { profHTML } from './profile.js';
import { applyPrefs } from '../people.js';

function render() {
  if (!S.u || !S.me) return;
  applyPrefs();
  var app = document.getElementById('app'),
    keep = snapComposer();
  if (!narrow() && S.pane === 'list' && S.view) S.pane = 'conv';
  /* 매장 도구 탭(STOCK·VMD·BOARD): 목록 없이 화면 전체 · 휴대폰은 아래 탭을 같이 */
  if (isTool()) {
    app.innerHTML =
      '<div class="shell tool" data-pane="tool">' +
      (narrow() ? '' : railHTML()) +
      '<main class="main">' +
      toolHTML(S.tab) +
      (narrow() ? botHTML() : '') +
      '</main></div>';
    renderOverlay();
    return;
  }
  var side = sideHTML(),
    side2 = S.thread ? threadHTML() : S.task ? taskHTML() : S.prof ? profHTML(S.prof) : '';
  app.innerHTML =
    '<div class="shell' +
    (side2 && !narrow() ? ' thr' : '') +
    '" data-pane="' +
    (narrow() ? S.pane : 'conv') +
    '">' +
    (narrow() ? '' : railHTML()) +
    '<aside class="side">' +
    side +
    '</aside><main class="main">' +
    mainHTML() +
    '</main>' +
    (side2 ? '<section class="thread">' + side2 + '</section>' : '') +
    '</div>';
  renderMsgs();
  renderCmts();
  restoreComposer(keep);
  renderOverlay();
  var n = 0;
  S.channels.forEach(function (c) {
    if (vis(c) && joined(c)) n += UC['c_' + c.id] && unread('c_' + c.id, c) ? UC['c_' + c.id].n : 0;
  });
  S.dms.forEach(function (d) {
    n += UC['d_' + d.id] && unread('d_' + d.id, d) ? UC['d_' + d.id].n : 0;
  });
  document.title = (n ? '(' + (n > 99 ? '99+' : n) + ') ' : '') + '소담상회';
}
function vkey() {
  var v = S.view;
  return v ? [v.k, v.id, v.tab, S.thread, S.task, S.cf && S.cf._t].join('|') : '';
}
/* 다시 그려도 쓰던 글이 지워지지 않게 */
var CK = [
  'ta',
  'tta',
  'eta',
  'tkc',
  'tk-title',
  'tk-who',
  'tk-due',
  'td-title',
  'td-memo',
  'td-due',
  'cf-name',
  'cf-topic',
  'cf-start',
  'cf-end',
  'br-q',
  'fw-note',
  'pf-dname',
  'pf-title',
  'pf-phone',
];
function snapComposer() {
  var o = { __k: S.lastVk };
  CK.forEach(function (id) {
    var e = document.getElementById(id);
    if (e) o[id] = { v: e.value, f: document.activeElement === e, s: e.selectionStart };
  });
  return o;
}
function restoreComposer(o) {
  var same = o.__k === vkey();
  S.lastVk = vkey();
  if (!same) return;
  delete o.__k;
  Object.keys(o).forEach(function (id) {
    var e = document.getElementById(id);
    if (!e) return;
    if (e.value !== o[id].v && !o[id].f && /^td-/.test(id)) return;
    e.value = o[id].v;
    if (e.tagName === 'TEXTAREA' && e.parentNode.classList.contains('cbox')) grow(e);
    if (o[id].f) {
      e.focus();
      try {
        e.setSelectionRange(o[id].s, o[id].s);
      } catch (x) {}
    }
  });
}

export { render, vkey, snapComposer, restoreComposer };
