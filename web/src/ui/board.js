/* 프로젝트 할 일 보드 · 할 일 상세 */
import { esc, ms, hm, dayLabel, today, md, TST } from '../util.js';
import { isAdmin, nameOf, chan, memOf, sname, narrow, S } from '../state.js';
import { tk } from '../tasks.js';
import { av, fmt, pav, compHTML } from '../ui/common.js';

function boardHTML(c) {
  var me = S.email,
    all = S.tasks,
    mine = all.filter(function (t) {
      return (t.who || []).indexOf(me) >= 0;
    }),
    L = S.tkf === 'me' ? mine : all,
    mem = memOf(c),
    done = all.filter(function (t) {
      return t.st === 'done';
    }).length;
  var h =
    '<div class="page wide"><div class="card"><div class="row"><input class="inp" id="tk-title" placeholder="할 일 추가 (Enter)" maxlength="200" style="flex:3 1 220px"><select class="inp" id="tk-who" style="flex:1 1 120px" aria-label="담당자"><option value="">담당자 없음</option>' +
    mem
      .map(function (e) {
        return '<option value="' + esc(e) + '">' + esc(sname(e)) + '</option>';
      })
      .join('') +
    '</select><input class="inp" id="tk-due" type="date" style="flex:1 1 140px" aria-label="마감일"><button class="btn" data-act="tkadd">추가</button></div></div>';
  h +=
    '<div class="row"><div class="chips"><button class="chip" data-act="tkf" data-v="all" aria-pressed="' +
    (S.tkf !== 'me') +
    '">전체 ' +
    all.length +
    '</button><button class="chip" data-act="tkf" data-v="me" aria-pressed="' +
    (S.tkf === 'me') +
    '">내 할 일 ' +
    mine.filter(function (t) {
      return t.st !== 'done';
    }).length +
    '</button></div><span class="sp"></span><span class="small muted">완료 ' +
    done +
    ' / ' +
    all.length +
    '</span></div><div class="board">';
  TST.forEach(function (st) {
    var C = L.filter(function (t) {
      return (t.st || 'todo') === st[0];
    }).sort(function (a, b) {
      return st[0] === 'done'
        ? ms(b.doneAt) - ms(a.doneAt)
        : (a.due || '9999') < (b.due || '9999')
          ? -1
          : (a.due || '9999') > (b.due || '9999')
            ? 1
            : ms(a.at) - ms(b.at);
    });
    h +=
      '<div class="col"><h4>' +
      st[1] +
      ' <span>' +
      C.length +
      '</span></h4>' +
      (C.length ? C.map(tkCard).join('') : '<p class="small muted" style="margin:2px">없어요</p>') +
      '</div>';
  });
  return h + '</div></div>';
}
function tkCard(t) {
  var st = t.st || 'todo',
    od = t.due && st !== 'done' && t.due < today();
  return (
    '<div class="tk' +
    (st === 'done' ? ' done' : '') +
    (S.task === t.id ? ' on' : '') +
    '" role="button" tabindex="0" data-act="tkopen" data-id="' +
    esc(t.id) +
    '"><div class="tt">' +
    esc(t.title) +
    '</div><div class="tm">' +
    (t.who || [])
      .map(function (e) {
        return '<span class="who">' + pav(e) + esc(sname(e)) + '</span>';
      })
      .join('') +
    (t.due ? '<span class="' + (od ? 'od' : '') + '">' + (od ? '지남 ' : '~') + md(t.due) + '</span>' : '') +
    (t.cc ? '<span>💬 ' + t.cc + '</span>' : '') +
    '</div>' +
    (st !== 'done'
      ? '<button class="btn sm ghost" data-act="tknext" data-id="' +
        esc(t.id) +
        '">' +
        (st === 'todo' ? '▶ 시작' : '✓ 완료') +
        '</button>'
      : '') +
    '</div>'
  );
}
function taskHTML() {
  var t = tk(S.task),
    c = chan(S.view.id);
  if (!t) return '';
  var st = t.st || 'todo',
    canDel = isAdmin() || t.by === S.u.uid;
  var h =
    '<div class="top"><button class="back" data-act="tclose" aria-label="뒤로">‹</button><h2>할 일</h2><button class="btn sm ghost" data-act="tclose" style="' +
    (narrow() ? 'display:none' : '') +
    '">닫기</button></div><div class="msgs" id="tkd"><div class="tkd">';
  h +=
    '<textarea class="inp" id="td-title" rows="2" maxlength="200" aria-label="제목" style="font-weight:700;resize:vertical">' +
    esc(t.title) +
    '</textarea>';
  h +=
    '<div><p class="lbl">상태</p><div class="chips">' +
    TST.map(function (s2) {
      return (
        '<button class="chip" data-act="tkst" data-id="' +
        esc(t.id) +
        '" data-v="' +
        s2[0] +
        '" aria-pressed="' +
        (st === s2[0]) +
        '">' +
        s2[1] +
        '</button>'
      );
    }).join('') +
    '</div></div>';
  h +=
    '<div><p class="lbl">담당</p><div class="chips">' +
    memOf(c)
      .map(function (e) {
        return (
          '<button class="chip" data-act="tkwho" data-id="' +
          esc(t.id) +
          '" data-v="' +
          esc(e) +
          '" aria-pressed="' +
          ((t.who || []).indexOf(e) >= 0) +
          '">' +
          esc(sname(e)) +
          '</button>'
        );
      })
      .join('') +
    '</div></div>';
  h +=
    '<div><p class="lbl">마감일</p><div class="row"><input class="inp" id="td-due" type="date" value="' +
    esc(t.due || '') +
    '" style="max-width:180px">' +
    (t.due && st !== 'done' && t.due < today() ? '<span class="small od">마감이 지났어요</span>' : '') +
    '</div></div>';
  h +=
    '<div><p class="lbl">메모</p><textarea class="inp" id="td-memo" rows="3" maxlength="2000" placeholder="자세한 내용 (선택)" style="resize:vertical">' +
    esc(t.memo || '') +
    '</textarea></div>';
  h +=
    '<div class="row small muted">' +
    esc(nameOf(t.by)) +
    ' · ' +
    dayLabel(t.at) +
    ' 만듦<span class="sp"></span>' +
    (canDel
      ? '<button class="btn sm ' +
        (S.tkdel === t.id ? 'danger' : 'ghost') +
        '" data-act="tkdel" data-id="' +
        esc(t.id) +
        '">' +
        (S.tkdel === t.id ? '정말 지우기' : '지우기') +
        '</button>'
      : '') +
    '</div>';
  return (
    h +
    '</div><p class="lbl" style="margin:0 16px 4px">댓글</p><div id="tkcm"></div></div>' +
    compHTML('tkc', '댓글 달기')
  );
}
function renderCmts() {
  var el = document.getElementById('tkcm');
  if (!el) return;
  var box = document.getElementById('tkd'),
    near = box && box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  el.innerHTML = S.tcm.length
    ? S.tcm
        .map(function (x) {
          return (
            '<div class="cm">' +
            av(x.uid, 1) +
            '<div><div class="hd"><b>' +
            esc(nameOf(x.uid)) +
            '</b><time>' +
            dayLabel(x.at) +
            ' ' +
            hm(x.at) +
            '</time>' +
            (x.uid === S.u.uid || isAdmin()
              ? '<button class="x" data-act="cmdel" data-id="' +
                esc(x.id) +
                '">' +
                (S.cmdel === x.id ? '정말 지우기' : '지우기') +
                '</button>'
              : '') +
            '</div><div class="tx">' +
            fmt(x.text) +
            '</div></div></div>'
          );
        })
        .join('')
    : '<p class="small muted" style="margin:0 16px 10px">아직 댓글이 없어요.</p>';
  if (near && S.cmScroll) {
    box.scrollTop = box.scrollHeight;
  }
}

export { boardHTML, tkCard, taskHTML, renderCmts };
