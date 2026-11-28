/* 메시지 목록 · 스레드 그리기 */
import { esc, ms, hm, dayKey, dayLabel, toast, EMO, EMOM } from '../util.js';
import { emoOf } from './emoji.js';
import { stBadge } from '../people.js';
import { isAdmin, nameOf, narrow, S } from '../state.js';
import { av, fmt, compHTML } from '../ui/common.js';
import { convTitle } from '../ui/layout.js';
import { isSaved } from '../msgact.js';
import { listen as listenMore } from '../conv.js';

function msgHTML(x, prev, rid, root) {
  /* 알림 줄 (그룹 DM 나가기 등) */
  if (x.sys === 'left') return '<div class="sysm">' + esc(nameOf(x.uid)) + '님이 나갔어요 · ' + hm(x.at) + '</div>';
  var cont =
      prev &&
      prev.uid === x.uid &&
      !prev.del &&
      !prev.sys &&
      ms(x.at) - ms(prev.at) < 5 * 6e4 &&
      dayKey(prev.at) === dayKey(x.at),
    mine = x.uid === S.u.uid,
    men = (x.men || []).indexOf(S.u.uid) >= 0 && !mine,
    ids = ' data-id="' + esc(rid ? S.thread : x.id) + '"' + (rid ? ' data-rid="' + esc(x.id) + '"' : ''),
    /* 답글 목록에서 rid 는 true(답글 표시)라서, 열림 상태 비교는 늘 이 글의 id로 해요 */
    key = x.id,
    pin = !rid && x.pinAt && !x.del,
    sv = !x.del && S.view && (S.view.k === 'c' || S.view.k === 'd') && isSaved(rid ? S.thread : x.id, rid ? x.id : ''),
    hl = S.jump && (rid ? S.jump.rid === x.id : !S.jump.rid && S.jump.mid === x.id);
  if (pin || sv) cont = false;
  var h =
    '<div class="m' +
    (cont ? ' cont' : '') +
    (men ? ' men' : '') +
    (pin ? ' pinned' : '') +
    (hl ? ' hl' : '') +
    (S.emo === key || S.menu === key ? ' act' : '') +
    '"' +
    ids +
    '>' +
    (pin || sv
      ? '<div class="mtag">' +
        (pin ? '<span>📌 ' + esc(nameOf(x.pinBy)) + '님이 고정함</span>' : '') +
        (sv ? '<span class="sv">🔖 나중에 보기</span>' : '') +
        '</div>'
      : '') +
    '<button class="avb" data-act="prof" data-v="' +
    esc(x.uid) +
    '" aria-label="' +
    esc(nameOf(x.uid)) +
    ' 프로필">' +
    av(x.uid) +
    '</button>' +
    '<div>';
  if (!cont)
    h +=
      '<div class="hd"><button class="nmb" data-act="prof" data-v="' +
      esc(x.uid) +
      '">' +
      esc(nameOf(x.uid)) +
      '</button>' +
      stBadge(x.uid) +
      '<time>' +
      hm(x.at) +
      '</time></div>';
  if (S.edit === x.id)
    h +=
      '<div class="cbox" style="margin:4px 0"><textarea id="eta" rows="2">' +
      esc(x.text) +
      '</textarea></div><div class="row" style="margin-bottom:4px"><button class="btn sm ghost" data-act="edcancel">취소</button><button class="btn sm" data-act="edsave"' +
      ids +
      '>저장</button><span class="small muted">Enter 저장 · Esc 취소</span></div>';
  else
    h += x.del
      ? '<div class="tx del">삭제된 메시지예요</div>'
      : (x.text || !x.fwd
          ? '<div class="tx">' + fmt(x.text) + (x.ed ? ' <span class="ed">(수정됨)</span>' : '') + '</div>'
          : '') + (x.fwd ? fwdHTML(x.fwd) : '');
  /* 반응: 예전 6개 먼저, 그 밖의 이모지는 그 뒤에 */
  var re = x.re || {},
    rk = EMO.map(function (e) {
      return e[0];
    })
      .concat(
        Object.keys(re).filter(function (k) {
          return !EMOM[k];
        }),
      )
      .filter(function (k) {
        return re[k] && re[k].length;
      })
      .map(function (k) {
        return [k, emoOf(k)];
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
      (x.del
        ? ''
        : '<button class="rxadd" data-act="epre"' +
          ids +
          ' title="반응 더하기" aria-label="반응 더하기">😀+</button>') +
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
  /* PC: 마우스를 올리면 도구 막대 · 휴대폰은 길게 누르면 아래 메뉴(.acts는 숨김) */
  if (!x.del && !narrow())
    h +=
      '<div class="acts"><button data-act="emo"' +
      ids +
      ' title="반응" aria-label="반응">😀</button>' +
      (rid ? '' : '<button data-act="thread" data-id="' + esc(x.id) + '" title="답글" aria-label="답글">💬</button>') +
      '<button data-act="save"' +
      ids +
      ' title="' +
      (sv ? '나중에 보기에서 빼기' : '나중에 보기') +
      '" aria-label="나중에 보기"' +
      (sv ? ' class="on"' : '') +
      '>🔖</button><button data-act="menu"' +
      ids +
      ' title="더 보기" aria-label="더 보기">⋯</button></div>';
  if (S.menu === key && !narrow()) h += '<div class="mmenu" role="menu">' + menuItems(x, rid, ids) + '</div>';
  if (S.emo === x.id)
    h +=
      '<div class="emo">' +
      EMO.map(function (e) {
        return '<button data-act="react" data-k="' + e[0] + '"' + ids + '>' + e[1] + '</button>';
      }).join('') +
      '<button data-act="epre"' +
      ids +
      ' title="다른 이모지" aria-label="다른 이모지" class="more">➕</button></div>';
  return h + '</div></div>';
}
/* ⋯ 메뉴 · 휴대폰 아래 메뉴에 같이 쓰는 항목 */
function menuItems(x, rid, ids) {
  var mine = x.uid === S.u.uid,
    it = function (act, icon, label, cls) {
      return (
        '<button role="menuitem" data-act="' +
        act +
        '"' +
        ids +
        (cls ? ' class="' + cls + '"' : '') +
        '><span>' +
        icon +
        '</span>' +
        label +
        '</button>'
      );
    };
  return (
    (rid ? '' : it('pin', '📌', x.pinAt ? '고정 풀기' : '채널에 고정')) +
    it('fwd', '↪', '전달하기') +
    it('link', '🔗', '링크 복사') +
    (x.text ? it('copy', '📋', '글 복사') : '') +
    (mine && !x.fwd ? it('edit', '✏️', '고치기') : '') +
    (mine || (isAdmin() && S.view.k === 'c') ? it('del', '🗑', '지우기', 'bad') : '')
  );
}
function fwdHTML(f) {
  return (
    '<div class="fwdq"><div class="small muted">↪ ' +
    esc(nameOf(f.uid)) +
    '님 메시지 전달' +
    (f.at ? ' · ' + dayLabel(f.at) + ' ' + hm(f.at) : '') +
    '</div><div class="tx">' +
    fmt(f.text || '') +
    '</div><button class="lk small" data-act="gomsg" data-v="' +
    esc([f.k, f.cid, f.mid, f.rid || ''].join('/')) +
    '">원래 메시지 보기</button></div>'
  );
}
function listHTML(L, rid) {
  var h = '',
    pd = '',
    nl = !rid && S.divAt;
  L.forEach(function (x, i) {
    var dk = dayKey(x.at);
    if (dk !== pd) {
      h += '<div class="day">' + dayLabel(x.at) + '</div>';
      pd = dk;
    }
    /* 마지막으로 읽은 뒤 처음 온 남의 메시지 앞에 '새 메시지' 줄 */
    if (nl && x.uid !== S.u.uid && ms(x.at) > S.divAt) {
      h += '<div class="newline" id="newline"><span>새 메시지</span></div>';
      nl = false;
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
  var nlEl = document.getElementById('newline');
  if (S.divScroll && nlEl && S.msgs.length) {
    /* 처음 열 때 안 읽은 곳부터 보여요 */
    S.divScroll = false;
    S.atBottom = false;
    nlEl.scrollIntoView({ block: 'start' });
    el.scrollTop -= 8;
  } else if (near) {
    el.scrollTop = el.scrollHeight;
    S.atBottom = false;
  } else if (S.keepTop) {
    el.scrollTop = el.scrollHeight - oh + ot;
    S.keepTop = false;
  }
  doJump(el, false);
  jumpBtn();
  if (S.thread) renderThread();
}
/* '안 읽은 메시지 ↑' 버튼: 구분선이 화면 위로 지나가 있으면 보여요 */
function jumpBtn() {
  var el = document.getElementById('msgs'),
    nlEl = document.getElementById('newline'),
    b = document.getElementById('jumpnew');
  if (!el) return;
  var show = nlEl && nlEl.offsetTop < el.scrollTop;
  if (!b && show) {
    b = document.createElement('button');
    b.id = 'jumpnew';
    b.className = 'jumpnew';
    b.setAttribute('data-act', 'jumpnew');
    b.textContent = '↑ 안 읽은 메시지';
    el.parentNode.insertBefore(b, el);
  }
  if (b) b.hidden = !show;
}
/* 링크·활동·고정에서 온 메시지로 스크롤하고 잠깐 밝게 */
function doJump(el, inThread) {
  var j = S.jump;
  if (!j || !!j.rid !== inThread || j.done) return;
  var t = el.querySelector('.m.hl');
  if (!t) {
    /* 오래된 메시지라 아직 안 불러왔으면 알려 줘요 (한 번만) */
    if (!inThread && S.msgs.length && !S.more && !j.told) {
      j.told = true;
      toast('메시지를 찾지 못했어요 (지워졌을 수 있어요)');
    } else if (!inThread && S.more && Date.now() - j.at < 8000 && !S.loadingMore) {
      /* 더 위에 있으면 조금 더 불러와요 */
      S.loadingMore = true;
      S.lim += 100;
      S.keepTop = true;
      setTimeout(function () {
        S.loadingMore = false;
      }, 600);
      listenMore();
    }
    return;
  }
  j.done = true;
  t.scrollIntoView({ block: 'center' });
  setTimeout(function () {
    if (S.jump === j) S.jump = null;
    t.classList.remove('hl');
  }, 2600);
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
  doJump(el, true);
}

export { msgHTML, menuItems, listHTML, threadHTML, renderMsgs, renderThread, jumpBtn };
