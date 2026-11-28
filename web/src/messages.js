/* 보내기 · 반응 · 수정/삭제 */
import { FV } from './firebase.js';
import { toast, errMsg } from './util.js';
import { nameOf, convRef, S } from './state.js';
import { tkRef } from './tasks.js';
import { renderMsgs, renderThread } from './ui/messages.js';

function mentions(text) {
  var out = [];
  Object.keys(S.users).forEach(function (uid) {
    var n = nameOf(uid);
    if (n && text.indexOf('@' + n) >= 0) out.push(uid);
  });
  if (/@(전체|channel|모두)/.test(text)) out.push('*');
  return out;
}
function send(text, which) {
  text = text.replace(/\s+$/, '');
  if (!text.trim()) return;
  var v = S.view,
    ref = convRef(v),
    m = { uid: S.u.uid, text: text.slice(0, 4000), at: FV.serverTimestamp(), men: mentions(text) };
  if (which === 'tkc') {
    var tr = tkRef(S.task);
    tr.collection('cmts')
      .add(m)
      .then(function () {
        return tr.update({ cc: FV.increment(1) });
      })
      .catch(function (e) {
        toast('보내지 못했어요 · ' + errMsg(e));
      });
    return;
  }
  if (which === 'tta') {
    var mid = S.thread,
      pr = ref.collection('msgs').doc(mid);
    pr.collection('replies')
      .add(m)
      .then(function () {
        return pr.update({ rc: FV.increment(1), lastReplyAt: FV.serverTimestamp(), ru: FV.arrayUnion(S.u.uid) });
      })
      .catch(function (e) {
        toast('보내지 못했어요 · ' + errMsg(e));
      });
    return;
  }
  S.atBottom = true;
  ref
    .collection('msgs')
    .add(m)
    .then(function () {
      return ref.update({ last: { text: text.slice(0, 80), by: S.u.uid }, lastAt: FV.serverTimestamp() });
    })
    .catch(function (e) {
      toast('보내지 못했어요 · ' + errMsg(e));
    });
}
function msgRef(id, rid) {
  var r = convRef()
    .collection('msgs')
    .doc(rid ? S.thread : id);
  return rid ? r.collection('replies').doc(rid) : r;
}
function react(id, rid, key) {
  var list = (rid ? S.replies : S.msgs).filter(function (x) {
    return x.id === (rid || id);
  })[0];
  if (!list) return;
  var has = ((list.re || {})[key] || []).indexOf(S.u.uid) >= 0,
    up = {};
  up['re.' + key] = has ? FV.arrayRemove(S.u.uid) : FV.arrayUnion(S.u.uid);
  msgRef(id, rid)
    .update(up)
    .catch(function (e) {
      toast(errMsg(e));
    });
}
function delMsg(id, rid) {
  var x = (rid ? S.replies : S.msgs).filter(function (o) {
    return o.id === (rid || id);
  })[0];
  if (!x) return;
  var r = msgRef(id, rid);
  (!rid && x.rc > 0
    ? r.update({ text: '', del: true })
    : r.delete().then(function () {
        if (rid)
          return convRef()
            .collection('msgs')
            .doc(S.thread)
            .update({ rc: FV.increment(-1) });
      })
  ).catch(function (e) {
    toast('지우지 못했어요 · ' + errMsg(e));
  });
}
function saveEdit(id, rid, text) {
  text = text.replace(/\s+$/, '');
  if (!text.trim()) return;
  msgRef(id, rid)
    .update({ text: text.slice(0, 4000), ed: FV.serverTimestamp(), men: mentions(text) })
    .then(function () {
      S.edit = null;
      rid ? renderThread() : renderMsgs();
    })
    .catch(function (e) {
      toast('고치지 못했어요 · ' + errMsg(e));
    });
}

export { mentions, send, msgRef, react, delMsg, saveEdit };
