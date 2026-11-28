/* 글 꾸미기 보여 주기 (슬랙과 같은 기호)
   *굵게*  _기울임_  ~취소선~  `코드`  ```코드 상자```
   줄 앞 "- " 목록 · "1. " 번호 목록 · "> " 인용
   글은 기호 그대로 저장하고, 보여 줄 때만 바꿔요 (예전 글도 그대로 보여요) */
import { esc } from '../util.js';

/* 링크·코드처럼 꾸미기를 하면 안 되는 부분은 잠깐 자리표로 바꿔 둬요 */
function inline(t, names, keep) {
  function hold(html) {
    keep.push(html);
    return '\uE000' + (keep.length - 1) + '\uE000';
  }
  var h = esc(t);
  h = h.replace(/`([^`\n]+)`/g, function (m, c) {
    return hold('<code>' + c + '</code>');
  });
  h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, function (u) {
    return hold('<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>');
  });
  names.forEach(function (n) {
    var e = esc('@' + n);
    if (h.indexOf(e) >= 0) h = h.split(e).join(hold('<span class="at">' + e + '</span>'));
  });
  h = h.replace(/@(전체|모두)/g, function (m) {
    return hold('<span class="at">' + m + '</span>');
  });
  /* 앞뒤가 띄어쓰기·문장부호·한글일 때만 (snake_case 같은 건 그대로, '*내일*까지'는 굵게) */
  var L = "(^|[\\s(\\[{;'“‘\\uAC00-\\uD7A3])",
    R = "(?=$|[\\s)\\]}.,!?:;&'”’…~*_\\uAC00-\\uD7A3])";
  h = h.replace(new RegExp(L + '\\*(?!\\s)([^*\\n]*?[^\\s*])\\*' + R, 'g'), '$1<b>$2</b>');
  h = h.replace(new RegExp(L + '_(?!\\s)([^_\\n]*?[^\\s_])_' + R, 'g'), '$1<i>$2</i>');
  h = h.replace(new RegExp(L + '~(?!\\s)([^~\\n]*?[^\\s~])~' + R, 'g'), '$1<s>$2</s>');
  return h;
}
function restore(h, keep) {
  for (var i = 0; i < 3 && h.indexOf('\uE000') >= 0; i++)
    h = h.replace(/\uE000(\d+)\uE000/g, function (m, n) {
      return keep[+n];
    });
  return h;
}
/* 줄 단위: 목록 · 인용 묶기 */
function blocks(t, names, keep) {
  var lines = t.split('\n'),
    out = [],
    cur = null; /* {tag, items[]} */
  function flush() {
    if (!cur) return;
    if (cur.tag === 'q') out.push({ b: '<blockquote>' + cur.items.join('<br>') + '</blockquote>' });
    else
      out.push({
        b:
          '<' +
          cur.tag +
          '>' +
          cur.items
            .map(function (x) {
              return '<li>' + x + '</li>';
            })
            .join('') +
          '</' +
          cur.tag +
          '>',
      });
    cur = null;
  }
  lines.forEach(function (ln) {
    var m,
      tag = null,
      body = ln;
    if ((m = /^\s*[-•]\s+(.*)$/.exec(ln))) ((tag = 'ul'), (body = m[1]));
    else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(ln))) ((tag = 'ol'), (body = m[1]));
    else if ((m = /^\s*(?:>|&gt;)\s?(.*)$/.exec(ln))) ((tag = 'q'), (body = m[1]));
    if (tag) {
      if (!cur || cur.tag !== tag) {
        flush();
        cur = { tag: tag, items: [] };
      }
      cur.items.push(inline(body, names, keep));
      return;
    }
    flush();
    out.push({ t: inline(ln, names, keep) });
  });
  flush();
  /* 글줄은 줄바꿈으로 잇고, 목록·인용 앞뒤엔 줄바꿈을 넣지 않아요 (빈 줄이 생기지 않게) */
  var h = '';
  out.forEach(function (o, i) {
    if (o.b) h += o.b;
    else h += o.t + (i < out.length - 1 && !out[i + 1].b ? '\n' : '');
  });
  return h;
}
function rich(t, names) {
  t = String(t == null ? '' : t).replace(/\uE000/g, '');
  var keep = [],
    parts = t.split('```'),
    h = '';
  parts.forEach(function (p, i) {
    /* 홀수 번째 = ``` 안 (닫는 ```가 없으면 그냥 글) */
    if (i % 2 === 1 && i < parts.length - 1) {
      h += '<pre>' + esc(p.replace(/^\n/, '').replace(/\n$/, '')) + '</pre>';
      return;
    }
    if (i % 2 === 1) p = '```' + p;
    var s = p;
    if (i > 0 && i % 2 === 0) s = s.replace(/^\n/, '');
    if (i < parts.length - 1 && i % 2 === 0) s = s.replace(/\n$/, '');
    h += blocks(s, names, keep);
  });
  return restore(h, keep);
}

export { rich };
