/* 내가 참여한 스레드 모아보기
   - 목록은 내 칸(users/{나}/threads/{c_채널_메시지})에만 둬요 (비공개 채널·DM이 다른 사람에게 새지 않게)
   - 넣는 때: 내가 답글을 달 때 · 내 글에 답글이 달렸다는 활동 · 스레드에서 나를 불렀다는 활동
   - 새 답글 여부는 원래 메시지(lastReplyAt)를 직접 들어서 봐요 */
import { db, FV } from './firebase.js';
import { ms } from './util.js';
import { soon, S } from './state.js';

var RUN = {}; /* 원래 메시지 구독: key → 해제 함수 */
function tkey(k, cid, mid) {
  return (k === 'c' ? 'c_' : 'd_') + cid + '_' + mid;
}
function tref(key) {
  return db.collection('users').doc(S.u.uid).collection('threads').doc(key);
}
/* 내 스레드 목록 듣기 (data.js 시작할 때) */
function listenThreads(UN) {
  S.threads = [];
  S.troots = {};
  UN.push(
    db
      .collection('users')
      .doc(S.u.uid)
      .collection('threads')
      .orderBy('at', 'desc')
      .limit(40)
      .onSnapshot(
        function (s) {
          S.threads = s.docs.map(function (d) {
            var o = d.data();
            o.id = d.id;
            return o;
          });
          S.loaded.th = true;
          syncRoots();
          threadsFromActs();
          soon();
        },
        function () {},
      ),
  );
  UN.push(stopRoots);
}
/* 목록에 있는 스레드의 원래 메시지만 들어요 (빠진 건 그만 듣기) */
function syncRoots() {
  var want = {};
  S.threads.forEach(function (t) {
    want[t.id] = t;
  });
  Object.keys(RUN).forEach(function (k) {
    if (!want[k]) {
      RUN[k]();
      delete RUN[k];
      delete S.troots[k];
    }
  });
  Object.keys(want).forEach(function (k) {
    if (RUN[k]) return;
    var t = want[k];
    RUN[k] = db
      .collection(t.k === 'c' ? 'channels' : 'dms')
      .doc(t.cid)
      .collection('msgs')
      .doc(t.mid)
      .onSnapshot(
        function (d) {
          S.troots[k] = d.exists ? d.data() : { gone: true };
          soon();
        },
        function () {
          /* 이제 볼 수 없는 대화 (채널에서 나감 등) */
          S.troots[k] = { gone: true };
          soon();
        },
      );
  });
}
function stopRoots() {
  Object.keys(RUN).forEach(function (k) {
    RUN[k]();
  });
  RUN = {};
}
/* 내가 답글을 달면: 목록에 넣고 '본 시각'도 지금으로 */
function touchThread(k, cid, mid) {
  tref(tkey(k, cid, mid))
    .set({ k: k, cid: cid, mid: mid, at: FV.serverTimestamp(), seen: FV.serverTimestamp() }, { merge: true })
    .catch(function () {});
}
/* 스레드를 열면: 목록에 있으면 '본 시각'만 바꿔요 */
function seenThread(k, cid, mid) {
  var key = tkey(k, cid, mid);
  if (
    !S.threads.some(function (t) {
      return t.id === key;
    })
  )
    return;
  tref(key)
    .update({ seen: FV.serverTimestamp() })
    .catch(function () {});
}
/* 활동(내 글에 답글 · 스레드에서 멘션)이 오면 목록에 넣어요 */
function threadsFromActs() {
  if (!S.u || !S.loaded.th) return;
  S.acts.forEach(function (a) {
    if (!(a.t === 'rp' || (a.t === 'men' && a.rid))) return;
    var key = tkey(a.k, a.cid, a.mid);
    if (
      S.threads.some(function (t) {
        return t.id === key;
      }) ||
      S.thAdded[key]
    )
      return;
    S.thAdded[key] = 1;
    tref(key)
      .set({ k: a.k, cid: a.cid, mid: a.mid, at: a.at || FV.serverTimestamp(), seen: 0 }, { merge: true })
      .catch(function () {});
  });
}
/* 보여 줄 목록: 최근 답글 순, 새 답글 표시 */
function threadList() {
  return S.threads
    .map(function (t) {
      var r = S.troots[t.id];
      return {
        t: t,
        r: r,
        last: r && r.lastReplyAt ? ms(r.lastReplyAt) : ms(t.at),
        nw: !!(r && r.lastReplyAt && ms(r.lastReplyAt) > (t.seen ? ms(t.seen) : 0)),
      };
    })
    .filter(function (x) {
      return !(x.r && x.r.gone);
    })
    .sort(function (a, b) {
      return b.last - a.last;
    });
}
function threadNew() {
  return threadList().filter(function (x) {
    return x.nw;
  }).length;
}

export { listenThreads, touchThread, seenThread, threadsFromActs, threadList, threadNew, tkey };
