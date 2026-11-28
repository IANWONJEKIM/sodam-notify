/* @멘션 고르기 */
import { esc } from './util.js';
import { nameOf, chan, S } from './state.js';
import { av, grow } from './ui/common.js';

var MP = { id: null, q: '', sel: 0, list: [] };
function mpUpdate(t) {
  var pre = t.value.slice(0, t.selectionStart),
    m = pre.match(/@([^\s@]{0,20})$/),
    pop = document.getElementById(t.id + '-pop');
  if (!pop) return;
  if (!m) {
    pop.hidden = true;
    MP.id = null;
    return;
  }
  var q = m[1];
  MP.id = t.id;
  MP.q = q;
  var cc = S.view.k === 'c' && chan(S.view.id);
  MP.list = Object.keys(S.users)
    .filter(function (u) {
      return (
        u !== S.u.uid && nameOf(u).indexOf(q) >= 0 && (!cc || !cc.priv || (cc.mem || []).indexOf(S.users[u].email) >= 0)
      );
    })
    .sort(function (a, b) {
      return nameOf(a).localeCompare(nameOf(b), 'ko');
    })
    .slice(0, 8);
  if ('전체'.indexOf(q) === 0 && S.view.k === 'c') MP.list.push('*');
  if (!MP.list.length) {
    pop.hidden = true;
    MP.id = null;
    return;
  }
  MP.sel = Math.min(MP.sel, MP.list.length - 1);
  pop.innerHTML = MP.list
    .map(function (u, i) {
      return (
        '<button type="button" data-act="mpick" data-v="' +
        esc(u) +
        '" class="' +
        (i === MP.sel ? 'sel' : '') +
        '">' +
        (u === '*'
          ? '<span class="av sm" style="background:var(--accent)">@</span><b>전체</b><span class="small muted">채널 모두에게</span>'
          : av(u, 1) + '<b>' + esc(nameOf(u)) + '</b>') +
        '</button>'
      );
    })
    .join('');
  pop.hidden = false;
}
function mpPick(u) {
  var t = document.getElementById(MP.id);
  if (!t) return;
  var pos = t.selectionStart,
    pre = t.value.slice(0, pos).replace(/@([^\s@]{0,20})$/, '@' + (u === '*' ? '전체' : nameOf(u)) + ' ');
  t.value = pre + t.value.slice(pos);
  t.setSelectionRange(pre.length, pre.length);
  t.focus();
  var pop = document.getElementById(MP.id + '-pop');
  if (pop) pop.hidden = true;
  MP.id = null;
  grow(t);
}

export { mpUpdate, mpPick, MP };
