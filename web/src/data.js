/* 데이터 구독 */
import { auth, db, FV } from './firebase.js';
import { ms, toast, errMsg } from './util.js';
import { isAdmin, chan, vis, joined, soon, narrow, S, UN } from './state.js';
import { stopConv, openConv } from './conv.js';
import { autoJoin } from './chmem.js';
import { render } from './ui/render.js';

function start() {
  /* 계정을 바꿔 들어와도 앞 사람 목록이 남지 않게 */
  S.channels = [];
  S.dms = [];
  S.users = {};
  S.loaded = {};
  UN.push(
    db.collection('staff').onSnapshot(function (s) {
      S.staff = {};
      s.forEach(function (d) {
        S.staff[d.id] = d.data();
      });
      S.me = S.staff[S.email] || S.me;
      if (S.me && S.me.active === false) return auth.signOut();
      soon();
    }),
  );
  UN.push(
    db.collection('users').onSnapshot(function (s) {
      S.users = {};
      s.forEach(function (d) {
        S.users[d.id] = d.data();
      });
      autoJoin();
      soon();
    }),
  );
  var CH = {};
  function chMerge(part, s) {
    CH[part] = {};
    s.forEach(function (d) {
      var o = d.data();
      o.id = d.id;
      CH[part][d.id] = o;
    });
    var m = {};
    for (var p in CH) for (var id in CH[p]) m[id] = CH[p][id];
    S.channels = Object.keys(m)
      .map(function (id) {
        return m[id];
      })
      .sort(function (a, b) {
        return (a.ord || 0) - (b.ord || 0) || String(a.name).localeCompare(String(b.name), 'ko');
      });
    S.loaded.ch = true;
    if (isAdmin()) {
      var fix = S.channels.filter(function (c) {
        return c.priv === undefined;
      });
      fix.forEach(function (c) {
        db.collection('channels')
          .doc(c.id)
          .update({ priv: false })
          .catch(function () {});
      });
    }
    if (!S.channels.length && isAdmin() && !S.seeded) {
      S.seeded = true;
      var b = db.batch();
      [
        ['전체', '매장 전체 공지와 이야기', 0],
        ['업무', '업무 이야기', 1],
      ].forEach(function (c) {
        b.set(db.collection('channels').doc(), {
          name: c[0],
          topic: c[1],
          ord: c[2],
          priv: false,
          by: S.u.uid,
          at: FV.serverTimestamp(),
        });
      });
      b.commit().catch(function () {});
    }
    if (S.view && S.view.k === 'c') {
      var cv = chan(S.view.id);
      if ((S.loaded.ch && cv === null && S.view.made !== true) || (cv && !vis(cv))) {
        stopConv();
        S.view = null;
        S.pane = 'list';
        toast('이 대화방을 더 볼 수 없어요');
      }
    }
    autoJoin();
    if (!S.view && !narrow()) {
      var f0 = S.channels.filter(function (c) {
        return joined(c) && c.kind !== 'proj';
      })[0];
      if (f0) openConv({ k: 'c', id: f0.id });
    }
    soon();
  }
  if (isAdmin())
    UN.push(
      db.collection('channels').onSnapshot(
        function (s) {
          chMerge('a', s);
        },
        function (e) {
          toast(errMsg(e));
        },
      ),
    );
  else {
    UN.push(
      db
        .collection('channels')
        .where('priv', '==', false)
        .onSnapshot(
          function (s) {
            chMerge('p', s);
          },
          function (e) {
            toast(errMsg(e));
          },
        ),
    );
    UN.push(
      db
        .collection('channels')
        .where('mem', 'array-contains', S.email)
        .onSnapshot(
          function (s) {
            chMerge('m', s);
          },
          function (e) {
            toast(errMsg(e));
          },
        ),
    );
  }
  UN.push(
    db
      .collection('dms')
      .where('m', 'array-contains', S.u.uid)
      .onSnapshot(
        function (s) {
          S.dms = s.docs
            .map(function (d) {
              var o = d.data();
              o.id = d.id;
              return o;
            })
            .sort(function (a, b) {
              return ms(b.lastAt) - ms(a.lastAt);
            });
          soon();
        },
        function () {},
      ),
  );
  UN.push(
    db
      .collection('users')
      .doc(S.u.uid)
      .collection('reads')
      .onSnapshot(function (s) {
        S.reads = {};
        s.forEach(function (d) {
          S.reads[d.id] = d.data();
        });
        soon();
      }),
  );
  render();
}

export { start };
