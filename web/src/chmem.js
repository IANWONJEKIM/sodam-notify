/* 채널 들어가기 · 나가기 (규칙: 나 자신만 넣고 뺄 수 있어요) */
import { db, FV } from './firebase.js';
import { toast, errMsg } from './util.js';
import { chan, joined, narrow, S } from './state.js';
import { stopConv, openConv } from './conv.js';
import { render } from './ui/render.js';

function cjoin(id) {
  var c = chan(id);
  if (!c || c.priv) return;
  db.collection('channels')
    .doc(id)
    .update({ mem: FV.arrayUnion(S.email) })
    .then(
      function () {
        toast('# ' + c.name + ' 채널에 들어갔어요');
        if (S.view && S.view.k === 'c' && S.view.id === id) render();
      },
      function (e) {
        toast('들어가지 못했어요 · ' + errMsg(e));
      },
    );
}
function cleave(id) {
  var c = chan(id);
  if (!c || !joined(c)) return;
  var here = S.view && (S.view.k === 'c' || S.view.k === 'cinfo') && S.view.id === id;
  db.collection('channels')
    .doc(id)
    .update({ mem: FV.arrayRemove(S.email) })
    .then(
      function () {
        S.cleave = null;
        toast((c.priv ? '' : '# ') + c.name + ' 에서 나왔어요');
        if (!here) return render();
        /* 공개 채널은 미리 보기로 남고, 비공개는 첫 채널로 */
        if (!c.priv) return openConv({ k: 'c', id: id });
        stopConv();
        var f0 = S.channels.filter(function (x) {
          return x.id !== id && joined(x) && x.kind !== 'proj';
        })[0];
        if (f0 && !narrow()) return openConv({ k: 'c', id: f0.id });
        S.view = null;
        S.pane = 'list';
        render();
      },
      function (e) {
        toast('나가지 못했어요 · ' + errMsg(e));
      },
    );
}
/* 처음 한 번: 공개 채널 전부에 들어가요 (지금까지처럼 다 보이게). 그 뒤엔 직접 들어가고 나가요 */
var tried = ''; /* 이번 접속에서 시도한 계정 (계정을 바꾸면 다시) */
function autoJoin() {
  var me = S.u && S.users[S.u.uid];
  if (!me || me.chInit || !S.loaded.ch || tried === S.u.uid) return;
  var L = S.channels.filter(function (c) {
    return !c.priv && c.kind !== 'proj' && !joined(c);
  });
  /* 공개 채널이 아직 하나도 없으면(첫 시작) 생길 때까지 기다려요 */
  if (
    !S.channels.some(function (c) {
      return !c.priv && c.kind !== 'proj';
    })
  )
    return;
  tried = S.u.uid;
  var b = db.batch();
  L.forEach(function (c) {
    b.update(db.collection('channels').doc(c.id), { mem: FV.arrayUnion(S.email) });
  });
  b.set(db.collection('users').doc(S.u.uid), { chInit: true }, { merge: true });
  /* 실패하면 이번 접속에선 다시 시도하지 않아요 (다음에 열 때 다시) */
  b.commit().catch(function () {});
}

export { cjoin, cleave, autoJoin };
