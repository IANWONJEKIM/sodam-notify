/* 메시지 목록 · 스레드 그리기 */
import { esc, ms, hm, dayKey, dayLabel, EMO } from '../util.js';
import { isAdmin, nameOf, narrow, S } from '../state.js';
import { av, fmt, compHTML } from '../ui/common.js';
import { convTitle } from '../ui/layout.js';

function msgHTML(x, prev, rid, root) {
  var cont =
      prev && prev.uid === x.uid && !prev.del && ms(x.at) - ms(prev.at) < 5 * 6e4 && dayKey(prev.at) === dayKey(x.at),
    mine = x.uid === S.u.uid,
    men = (x.men || []).indexOf(S.u.uid) >= 0 && !mine,
    ids = ' data-id="' + esc(rid ? S.thread : x.id) + '"' + (rid ? ' data-rid="' + esc(x.id) + '"' : '');
  var h =
    '<div class="m' +
    (cont ? ' cont' : '') +
    (men ? ' men' : '') +
    (S.emo === (rid || x.id) || S.act === (rid || x.id) ? ' act' : '') +
    '"' +
    ids +
    '>' +
    av(x.uid) +
    '<div>';
  if (!cont) h += '<div class="hd"><b>' + esc(nameOf(x.uid)) + '</b><time>' + hm(x.at) + '</time></div>';
  if (S.edit === (rid || x.id))
    h +=
      '<div class="cbox" style="margin:4px 0"><textarea id="eta" rows="2">' +
      esc(x.text) +
      '</textarea></div><div class="row" style="margin-bottom:4px"><button class="btn sm ghost" data-act="edcancel">취소</button><button class="btn sm" data-act="edsave"' +
      ids +
      '>저장</button><span class="small muted">Enter 저장 · Esc 취소</span></div>';
  else
    h += x.del
      ? '<div class="tx del">삭제된 메시지예요</div>'
      : '<div class="tx">' + fmt(x.text) + (x.ed ? ' <span class="ed">(수정됨)</span>' : '') + '</div>';
  var re = x.re || {},
    rk = EMO.filter(function (e) {
      return re[e[0]] && re[e[0]].length;
    });
  if (rk.length)
    h +=
      '<div class="rx">' +
      rk
        .map(function (e) {
          var L = re[e[0]];
          return (
            '<button data-act="react" data-k="' +
            e[0] +
            '"' +
            ids +
            ' class="' +
            (L.indexOf(S.u.uid) >= 0 ? 'mine' : '') +
            '" title="' +
            esc(L.map(nameOf).join(', ')) +
            '">' +
            e[1] +
            ' ' +
            L.length +
            '</button>'
          );
        })
        .join('') +
      '</div>';
  if (!rid && !root && x.rc > 0)
    h +=
      '<button class="trl" data-act="thread" data-id="' +
      esc(x.id) +
      '">' +
      (x.ru || [])
        .slice(0, 3)
        .map(function (u) {
          return av(u, 1);
        })
        .join('') +
      '답글 ' +
      x.rc +
      '개 <small>' +
      (x.lastReplyAt ? dayLabel(x.lastReplyAt) + ' ' + hm(x.lastReplyAt) : '') +
      '</small></button>';
  if (!x.del)
    h +=
      '<div class="acts"><button data-act="emo"' +
      ids +
      ' title="반응">😀</button>' +
      (rid ? '' : '<button data-act="thread" data-id="' + esc(x.id) + '" title="답글">💬</button>') +
      (mine ? '<button data-act="edit"' + ids + ' title="고치기">✏️</button>' : '') +
      (mine || (isAdmin() && S.view.k === 'c') ? '<button data-act="del"' + ids + ' title="지우기">🗑</button>' : '') +
      '</div>';
  if (S.emo === (rid || x.id))
    h +=
      '<div class="emo">' +
      EMO.map(function (e) {
        return '<button data-act="react" data-k="' + e[0] + '"' + ids + '>' + e[1] + '</button>';
      }).join('') +
      '</div>';
  return h + '</div></div>';
}
function listHTML(L, rid) {
  var h = '',
    pd = '';
  L.forEach(function (x, i) {
    var dk = dayKey(x.at);
    if (dk !== pd) {
      h += '<div class="day">' + dayLabel(x.at) + '</div>';
      pd = dk;
    }
    h += msgHTML(x, i && dayKey(L[i - 1].at) === dk ? L[i - 1] : null, rid);
  });
  return h;
}
function threadHTML() {
  var root = S.msgs.filter(function (x) {
    return x.id === S.thread;
  })[0];
  return (
    '<div class="top"><button class="back" data-act="tclose" aria-label="뒤로">‹</button><h2>스레드 <small>' +
    convTitle(S.view).replace(/<small>.*<\/small>/, '') +
    '</small></h2><button class="btn sm ghost" data-act="tclose" style="' +
    (narrow() ? 'display:none' : '') +
    '">닫기</button></div><div class="msgs" id="tmsgs">' +
    (root ? '<div class="troot">' + msgHTML(root, null, null, 1) + '</div>' : '') +
    '</div>' +
    compHTML('tta', '답글 달기')
  );
}
function renderMsgs() {
  var el = document.getElementById('msgs');
  if (!el) return;
  var near = el.scrollHeight - el.scrollTop - el.clientHeight < 80 || S.atBottom;
  var h = S.more ? '<button class="more" data-act="more">이전 메시지 더 보기</button>' : '';
  h += S.msgs.length
    ? listHTML(S.msgs)
    : '<div class="empty">' + (S.view.k === 'c' ? '첫 메시지를 남겨 보세요.' : '아직 나눈 대화가 없어요.') + '</div>';
  var oh = el.scrollHeight,
    ot = el.scrollTop;
  el.innerHTML = h;
  if (near) {
    el.scrollTop = el.scrollHeight;
    S.atBottom = false;
  } else if (S.keepTop) {
    el.scrollTop = el.scrollHeight - oh + ot;
    S.keepTop = false;
  }
  if (S.thread) renderThread();
}
function renderThread() {
  var el = document.getElementById('tmsgs');
  if (!el) return;
  var root = S.msgs.filter(function (x) {
      return x.id === S.thread;
    })[0],
    near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  el.innerHTML =
    (root ? '<div class="troot">' + msgHTML(root, null, null, 1) + '</div>' : '') +
    (S.replies.length
      ? '<div class="tcnt">답글 ' + S.replies.length + '개</div>' + listHTML(S.replies, true)
      : '<div class="empty" style="padding:20px">첫 답글을 달아 보세요.</div>');
  if (near) el.scrollTop = el.scrollHeight;
}

export { msgHTML, listHTML, threadHTML, renderMsgs, renderThread };
