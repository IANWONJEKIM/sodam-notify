/* 내 사이드바 정리: 즐겨찾기 · 내 섹션 · 순서 · 음소거 (나만 보여요)
   users/{나}.side = {
     fav: [키…]               즐겨찾기 (키 = c_채널id / d_DMid)
     secs: [{id, name, keys:[키…]}]  내 섹션 (위에서부터 순서대로)
     ord: {묶음id: [키…]}     묶음 안 순서 (fav · 섹션id · ch · pj · dm)
     mute: [키…]              음소거
     shut: [묶음id…]           접어 둔 묶음
     hid: {키: 닫은 시각(ms)}   닫은 DM (그 뒤에 새 메시지가 오면 다시 보여요)
   }
   바꾸면 화면을 먼저 바꾸고(바로 반응) 저장해요. */
import { db } from './firebase.js';
import { toast, errMsg } from './util.js';
import { S } from './state.js';

function side() {
  var u = S.u && S.users[S.u.uid],
    s = (u && u.side) || {};
  return {
    fav: (s.fav || []).slice(),
    secs: (s.secs || []).map(function (x) {
      return { id: x.id, name: x.name, keys: (x.keys || []).slice() };
    }),
    ord: Object.assign({}, s.ord || {}),
    mute: (s.mute || []).slice(),
    shut: (s.shut || []).slice(),
    hid: Object.assign({}, s.hid || {}),
  };
}
function saveSide(next) {
  var u = S.users[S.u.uid];
  if (u) u.side = next; /* 화면 먼저 */
  return db
    .collection('users')
    .doc(S.u.uid)
    .update({ side: next })
    .catch(function (e) {
      toast('저장하지 못했어요 · ' + errMsg(e));
    });
}
function isMuted(k) {
  return side().mute.indexOf(k) >= 0;
}
function isFav(k) {
  return side().fav.indexOf(k) >= 0;
}
function secOf(k, s) {
  s = s || side();
  for (var i = 0; i < s.secs.length; i++) if (s.secs[i].keys.indexOf(k) >= 0) return s.secs[i].id;
  return null;
}
/* 키를 즐겨찾기·섹션에서 모두 빼요 (옮기기 전에) */
function detach(s, k) {
  s.fav = s.fav.filter(function (x) {
    return x !== k;
  });
  s.secs.forEach(function (x) {
    x.keys = x.keys.filter(function (y) {
      return y !== k;
    });
  });
}
function toggleFav(k) {
  var s = side(),
    on = s.fav.indexOf(k) >= 0;
  detach(s, k);
  if (!on) s.fav.push(k);
  toast(on ? '즐겨찾기에서 뺐어요' : '⭐ 즐겨찾기에 넣었어요');
  return saveSide(s);
}
function toggleMute(k) {
  var s = side(),
    on = s.mute.indexOf(k) >= 0;
  s.mute = on
    ? s.mute.filter(function (x) {
        return x !== k;
      })
    : s.mute.concat([k]);
  toast(on ? '음소거를 풀었어요' : '🔕 음소거했어요');
  return saveSide(s);
}
/* 섹션으로 옮기기 (secId 없으면 원래 자리로) */
function moveTo(k, secId) {
  var s = side();
  detach(s, k);
  if (secId)
    s.secs.forEach(function (x) {
      if (x.id === secId) x.keys.push(k);
    });
  return saveSide(s);
}
function newSec(name, firstKey) {
  name = String(name || '')
    .trim()
    .slice(0, 20);
  if (!name) return toast('섹션 이름을 적어 주세요');
  var s = side(),
    id = 's' + Date.now().toString(36);
  if (s.secs.length >= 12) return toast('섹션은 12개까지 만들 수 있어요');
  if (firstKey) detach(s, firstKey);
  s.secs.push({ id: id, name: name, keys: firstKey ? [firstKey] : [] });
  toast('📁 ' + name + ' 섹션을 만들었어요');
  return saveSide(s);
}
function renameSec(id, name) {
  name = String(name || '')
    .trim()
    .slice(0, 20);
  if (!name) return;
  var s = side();
  s.secs.forEach(function (x) {
    if (x.id === id) x.name = name;
  });
  return saveSide(s);
}
function delSec(id) {
  var s = side();
  s.secs = s.secs.filter(function (x) {
    return x.id !== id;
  });
  delete s.ord[id];
  toast('섹션을 지웠어요 (안에 있던 건 원래 자리로)');
  return saveSide(s);
}
function moveSec(id, dir) {
  var s = side(),
    i = s.secs.findIndex(function (x) {
      return x.id === id;
    }),
    j = i + dir;
  if (i < 0 || j < 0 || j >= s.secs.length) return;
  var t = s.secs[i];
  s.secs[i] = s.secs[j];
  s.secs[j] = t;
  return saveSide(s);
}
function toggleShut(g) {
  var s = side(),
    on = s.shut.indexOf(g) >= 0;
  s.shut = on
    ? s.shut.filter(function (x) {
        return x !== g;
      })
    : s.shut.concat([g]);
  return saveSide(s);
}
/* 묶음 안 순서: 저장된 순서 먼저, 나머지는 원래 순서 */
function ordered(g, keys) {
  var o = side().ord[g] || [];
  return keys.slice().sort(function (a, b) {
    var ia = o.indexOf(a),
      ib = o.indexOf(b);
    if (ia < 0 && ib < 0) return keys.indexOf(a) - keys.indexOf(b);
    if (ia < 0) return 1;
    if (ib < 0) return -1;
    return ia - ib;
  });
}
function setOrder(g, keys) {
  var s = side();
  s.ord[g] = keys.slice(0, 200);
  return saveSide(s);
}
/* 한 칸 위·아래로 (휴대폰 순서 바꾸기) */
function nudge(g, keys, k, dir) {
  var L = keys.slice(),
    i = L.indexOf(k),
    j = i + dir;
  if (i < 0 || j < 0 || j >= L.length) return;
  L[i] = L[j];
  L[j] = k;
  return setOrder(g, L);
}

/* DM 닫기: 내 목록에서만 숨겨요 (즐겨찾기·섹션에서도 빼요) */
function closeDm(k) {
  var s = side();
  detach(s, k);
  s.hid[k] = Date.now();
  toast('대화를 닫았어요. 새 메시지가 오면 다시 보여요');
  return saveSide(s);
}
/* 닫아 둔 DM인지 (닫은 뒤 새 메시지가 없으면 true) */
function isClosed(k, lastAtMs) {
  var t = side().hid[k];
  return !!t && !(lastAtMs > t);
}
export {
  closeDm,
  isClosed,
  side,
  isMuted,
  isFav,
  secOf,
  toggleFav,
  toggleMute,
  moveTo,
  newSec,
  renameSec,
  delSec,
  moveSec,
  toggleShut,
  ordered,
  setOrder,
  nudge,
};
