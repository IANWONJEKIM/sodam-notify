/* 안 읽은 개수 */
import { firebase } from './firebase.js';
import { ms } from './util.js';
import { soon, S } from './state.js';

/* 안 읽은 개수: 마지막으로 읽은 뒤 남이 보낸 메시지를 세요 (100개까지) */
var UC = {};
function ucount(k, c, ref) {
  if (!unread(k, c)) return 0;
  var la = ms(c.lastAt),
    r = S.reads[k],
    rm = r && r.at ? ms(r.at) : 0,
    u = UC[k];
  if (u && u.at === la && u.rd === rm) return u.n;
  UC[k] = { at: la, rd: rm, n: u ? u.n : 1 };
  var q = ref.collection('msgs');
  q = (
    rm ? q.where('at', '>', firebase.firestore.Timestamp.fromMillis(rm)).orderBy('at') : q.orderBy('at', 'desc')
  ).limit(100);
  q.get()
    .then(function (s) {
      var n = 0;
      s.forEach(function (d) {
        var o = d.data();
        if (o.uid !== S.u.uid && !o.del) n++;
      });
      var x = UC[k];
      if (x && x.at === la && x.rd === rm && x.n !== Math.max(n, 1)) {
        x.n = Math.max(n, 1);
        soon();
      }
    })
    .catch(function () {});
  return UC[k].n;
}
function cntHTML(n) {
  return n ? '<span class="cnt">' + (n > 99 ? '99+' : n) + '</span>' : '';
}
function unread(k, c) {
  if (!c || !c.lastAt) return false;
  var r = S.reads[k];
  if (c.last && c.last.by === S.u.uid) return false;
  return !r || ms(c.lastAt) > ms(r.at);
}

export { ucount, cntHTML, unread, UC };
