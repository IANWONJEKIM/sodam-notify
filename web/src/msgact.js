/* 메시지 다루기: 고정 · 나중에 보기 · 전달 · 링크 · 내 활동 기록 */
import { db, FV } from './firebase.js';
import { toast, errMsg } from './util.js';
import { convKey, convRef, chan, dm, dmName, joined, S, LS } from './state.js';
import { openConv, openThread } from './conv.js';
import { render } from './ui/render.js';

/* 지금 보고 있는 메시지(또는 스레드 답글) 찾기 */
function findMsg(id, rid) {
  if (rid)
    return S.replies.filter(function (x) {
      return x.id === rid;
    })[0];
  return S.msgs.filter(function (x) {
    return x.id === id;
  })[0];
}
function short(t) {
  t = String(t || '').replace(/\s+/g, ' ');
  return t.length > 100 ? t.slice(0, 99) + '…' : t;
}

/* ── 고정 (대화방 멤버 누구나) ── */
function togglePin(id) {
  var x = findMsg(id);
  if (!x) return;
  var on = !x.pinAt;
  convRef()
    .collection('msgs')
    .doc(id)
    .update(on ? { pinAt: FV.serverTimestamp(), pinBy: S.u.uid } : { pinAt: FV.delete(), pinBy: FV.delete() })
    .then(
      function () {
        toast(on ? '📌 고정했어요' : '고정을 풀었어요');
      },
      function (e) {
        toast(errMsg(e));
      },
    );
}
/* 고정 목록: 대화방을 열면 같이 들어요 */
function listenPins() {
  stopPins();
  var v = S.view;
  S.pins = [];
  LS.PUN = convRef(v)
    .collection('msgs')
    .orderBy('pinAt', 'desc')
    .limit(50)
    .onSnapshot(
      function (s) {
        if (S.view !== v && !(S.view && S.view.k === 'pins' && S.view.id === v.id)) return;
        S.pins = s.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        });
        /* 고정 목록 화면이면 다시 그리고, 대화 화면이면 머리의 📌 개수만 바꿔요 */
        if (S.view && S.view.k === 'pins') return render();
        var b = document.querySelector('[data-act="pins"]');
        if (!b) return;
        b.hidden = !S.pins.length;
        b.querySelector('.n').textContent = S.pins.length;
      },
      function () {},
    );
}
function stopPins() {
  if (LS.PUN) {
    LS.PUN();
    LS.PUN = null;
  }
}

/* ── 나중에 보기 (나만 보는 목록) ── */
function savedKey(v, id, rid) {
  return convKey(v) + '_' + id + (rid ? '_' + rid : '');
}
function isSaved(id, rid) {
  var k = savedKey(S.view, id, rid);
  return S.saved.some(function (s) {
    return s.id === k && !s.done;
  });
}
function toggleSave(id, rid) {
  var x = findMsg(id, rid);
  if (!x) return;
  var k = savedKey(S.view, id, rid),
    ref = db.collection('users').doc(S.u.uid).collection('saved').doc(k),
    on = !isSaved(id, rid);
  (on
    ? ref.set({
        k: S.view.k,
        cid: S.view.id,
        mid: id,
        rid: rid || '',
        uid: x.uid,
        text: short(x.text),
        mat: x.at || null,
        at: FV.serverTimestamp(),
        done: false,
      })
    : ref.delete()
  ).then(
    function () {
      toast(on ? '🔖 나중에 보기에 넣었어요' : '나중에 보기에서 뺐어요');
    },
    function (e) {
      toast(errMsg(e));
    },
  );
}
function savedDone(key, done) {
  db.collection('users')
    .doc(S.u.uid)
    .collection('saved')
    .doc(key)
    .update({ done: done })
    .catch(function (e) {
      toast(errMsg(e));
    });
}
function savedDel(key) {
  db.collection('users')
    .doc(S.u.uid)
    .collection('saved')
    .doc(key)
    .delete()
    .catch(function (e) {
      toast(errMsg(e));
    });
}

/* ── 링크 · 글 복사 ── */
function msgLink(k, cid, mid, rid) {
  return location.origin + location.pathname + '#m/' + k + '/' + cid + '/' + mid + (rid ? '/' + rid : '');
}
function copy(text, done) {
  function ok() {
    toast(done);
  }
  if (navigator.clipboard && window.isSecureContext)
    return navigator.clipboard.writeText(text).then(ok, function () {
      fallback();
    });
  fallback();
  function fallback() {
    var t = document.createElement('textarea');
    t.value = text;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    try {
      document.execCommand('copy');
      ok();
    } catch (e) {
      toast('복사하지 못했어요');
    }
    t.remove();
  }
}
function copyLink(id, rid) {
  copy(msgLink(S.view.k, S.view.id, id, rid), '🔗 링크를 복사했어요');
}
function copyText(id, rid) {
  var x = findMsg(id, rid);
  if (x) copy(x.text || '', '글을 복사했어요');
}

/* 링크(#m/c/채널/메시지[/답글])로 들어오면 그 메시지로 가요 */
function readHash() {
  var m = /^#m\/(c|d)\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/.exec(location.hash || '');
  return m ? { k: m[1], id: m[2], mid: m[3], rid: m[4] || '' } : null;
}
function jump(t) {
  if (!t) return;
  var c = t.k === 'c' ? chan(t.id) : dm(t.id);
  if (!c && !(t.k === 'd' ? S.loaded.dm : S.loaded.ch)) {
    S.pendJump = t; /* 목록이 아직 안 왔으면 오면 다시 */
    return;
  }
  S.pendJump = null;
  if (!c) return toast('이 대화를 볼 수 없어요');
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  /* 활동 탭에서 왔으면 활동 목록을 그대로 두고, 그 밖(도구 탭 등)에서는 홈으로 */
  if (S.tab !== 'act') S.tab = 'home';
  S.jump = { mid: t.mid, rid: t.rid, at: Date.now() };
  if (!(S.view && S.view.k === t.k && S.view.id === t.id))
    openConv({ k: t.k, id: t.id, tab: c.kind === 'proj' ? 'chat' : undefined });
  else {
    /* 이미 그 대화면 (휴대폰은 목록에서 대화 화면으로) 넘어가기만 */
    if (S.view.tab === 'task') S.view.tab = 'chat';
    S.pane = 'conv';
    render();
  }
  if (t.rid) openThread(t.mid);
}
window.addEventListener('hashchange', function () {
  var t = readHash();
  if (t && S.u) jump(t);
});

/* ── 전달: 다른 채널·DM으로 인용해서 보내요 ── */
function fwdTargets(q) {
  q = String(q || '')
    .trim()
    .toLowerCase();
  var L = [];
  S.channels.forEach(function (c) {
    if (joined(c)) L.push({ k: 'c', id: c.id, name: (c.kind === 'proj' ? '▦ ' : c.priv ? '🔒 ' : '# ') + c.name });
  });
  S.dms.forEach(function (d) {
    if (!d.lastAt) return;
    L.push({ k: 'd', id: d.id, name: '💬 ' + dmName(d) });
  });
  return L.filter(function (x) {
    return !q || x.name.toLowerCase().indexOf(q) >= 0;
  });
}
function forward(target, note) {
  var f = S.fwd;
  if (!f || !target) return;
  var src = f.x,
    ref = db.collection(target.k === 'c' ? 'channels' : 'dms').doc(target.id),
    m = {
      uid: S.u.uid,
      text: String(note || '')
        .trim()
        .slice(0, 4000),
      at: FV.serverTimestamp(),
      men: [],
      fwd: {
        uid: src.uid,
        text: String(src.text || '').slice(0, 1000),
        k: f.k,
        cid: f.cid,
        mid: f.mid,
        rid: f.rid || '',
        at: src.at || null,
      },
    };
  S.fwd = null;
  ref
    .collection('msgs')
    .add(m)
    .then(function () {
      return ref.update({
        last: { text: m.text ? m.text.slice(0, 80) : '↪ 전달한 메시지', by: S.u.uid },
        lastAt: FV.serverTimestamp(),
      });
    })
    .then(
      function () {
        toast('↪ ' + target.name.replace(/^\S+ /, '') + '에 전달했어요');
      },
      function (e) {
        toast('전달하지 못했어요 · ' + errMsg(e));
      },
    );
  render();
}

/* ── 내 활동: 멘션 · 반응 · 답글을 받는 사람 칸에 남겨요 ── */
/* 받는 사람이 이 대화를 볼 수 있는지 (규칙과 같은 기준) */
function canSee(uid) {
  var v = S.view;
  if (v.k === 'd') {
    var d = dm(v.id);
    return !!d && (d.m || []).indexOf(uid) >= 0;
  }
  var c = chan(v.id),
    u = S.users[uid];
  return !!c && !!u && (!c.priv || (c.mem || []).indexOf(u.email) >= 0);
}
function actRef(to, aid) {
  return db.collection('users').doc(to).collection('act').doc(aid);
}
function actBase(t, mid, rid, text) {
  return {
    t: t,
    from: S.u.uid,
    k: S.view.k,
    cid: S.view.id,
    mid: mid,
    rid: rid || '',
    text: short(text).slice(0, 120),
    at: FV.serverTimestamp(),
  };
}
/* 보낸 메시지의 @멘션 (@전체는 활동에 남기지 않아요: 너무 많아져서) */
function actMention(men, mid, rid, text) {
  (men || []).forEach(function (to) {
    if (to === '*' || to === S.u.uid || !canSee(to)) return;
    actRef(to, 'men_' + (rid || mid))
      .set(actBase('men', mid, rid, text))
      .catch(function () {});
  });
}
/* 스레드 답글 → 원래 글쓴이에게 */
function actReply(parent, mid, rid, text) {
  if (!parent || parent.uid === S.u.uid || !canSee(parent.uid)) return;
  actRef(parent.uid, 'rp_' + rid)
    .set(actBase('rp', mid, rid, text))
    .catch(function () {});
}
/* 반응 → 글쓴이에게 (반응을 빼면 지워요) */
function actReact(x, mid, rid, key, on) {
  if (!x || x.uid === S.u.uid || !canSee(x.uid)) return;
  var a = actRef(x.uid, 're_' + (rid || mid) + '_' + key + '_' + S.u.uid);
  if (!on) return a.delete().catch(function () {});
  var o = actBase('re', mid, rid, x.text);
  o.emo = key;
  a.set(o).catch(function () {});
}
function actSeen() {
  db.collection('users')
    .doc(S.u.uid)
    .collection('reads')
    .doc('act')
    .set({ at: FV.serverTimestamp() })
    .catch(function () {});
}

export {
  findMsg,
  togglePin,
  listenPins,
  stopPins,
  isSaved,
  toggleSave,
  savedDone,
  savedDel,
  copyLink,
  copyText,
  msgLink,
  readHash,
  jump,
  fwdTargets,
  forward,
  actMention,
  actReply,
  actReact,
  actSeen,
};
