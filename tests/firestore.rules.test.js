// Firestore 보안 규칙 테스트 · 실제 데이터와 상관없는 에뮬레이터에서 돌아가요
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';

const OWNER = 'wonjea47@gmail.com';
// uid 이름은 DM id 규칙(작은 uid가 앞) 때문에 알파벳 순서를 맞춰 둬요
const P = {
  owner: { uid: 'u0owner', email: OWNER },
  a: { uid: 'uA', email: 'a@sodam.test' }, // 일반 직원 · 비공개 채널 멤버
  b: { uid: 'uB', email: 'b@sodam.test' }, // 일반 직원
  c: { uid: 'uC', email: 'c@sodam.test' }, // 일반 직원 · DM 밖 사람
  boss: { uid: 'uD', email: 'admin@sodam.test' }, // 관리자 직원
  gone: { uid: 'uE', email: 'gone@sodam.test' }, // 못 들어오게 한 직원
  stranger: { uid: 'uZ', email: 'z@sodam.test' }, // 등록 안 된 사람
};

let env;
const as = (p, verified = true) =>
  env.authenticatedContext(p.uid, { email: p.email, email_verified: verified }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sodam',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env && env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const staff = (p, extra = {}) =>
      setDoc(doc(db, 'staff', p.email), { name: p.uid, teams: [], active: true, ...extra });
    await staff(P.a);
    await staff(P.b);
    await staff(P.c);
    await staff(P.boss, { admin: true });
    await staff(P.gone, { active: false });
    await setDoc(doc(db, 'users', P.a.uid), { email: P.a.email, name: 'A' });
    await setDoc(doc(db, 'users', P.a.uid, 'reads', 'c_pub'), { at: 1 });
    await setDoc(doc(db, 'channels', 'pub'), { name: '전체', priv: false });
    await setDoc(doc(db, 'channels', 'pub', 'msgs', 'm1'), { uid: P.b.uid, text: '안녕', re: {} });
    await setDoc(doc(db, 'channels', 'sec'), { name: '비밀', priv: true, mem: [P.a.email] });
    await setDoc(doc(db, 'channels', 'sec', 'msgs', 'm1'), { uid: P.a.uid, text: '멤버만' });
    await setDoc(doc(db, 'channels', 'proj'), { name: '팝업', priv: true, kind: 'proj', mem: [P.a.email, P.b.email] });
    await setDoc(doc(db, 'channels', 'proj', 'tasks', 't1'), { title: '포스터', by: P.a.uid, st: 'todo' });
    await setDoc(doc(db, 'dms', 'uA_uB'), { m: ['uA', 'uB'] });
    await setDoc(doc(db, 'dms', 'uA_uB', 'msgs', 'm1'), { uid: P.a.uid, text: '둘만' });
  });
});

describe('입장 (직원 명단)', () => {
  it('등록 안 된 사람은 명단을 못 보고, 자기 칸만 확인할 수 있어요', async () => {
    await assertFails(getDocs(collection(as(P.stranger), 'staff')));
    await assertSucceeds(getDoc(doc(as(P.stranger), 'staff', P.stranger.email)));
  });
  it('이메일 인증이 안 된 계정은 직원이어도 못 들어와요', async () => {
    await assertFails(getDocs(collection(as(P.a, false), 'staff')));
  });
  it('못 들어오게 한 직원은 채널을 못 봐요', async () => {
    await assertFails(getDoc(doc(as(P.gone), 'channels', 'pub')));
  });
  it('직원은 명단을 보지만 고치지는 못해요', async () => {
    await assertSucceeds(getDocs(collection(as(P.a), 'staff')));
    await assertFails(setDoc(doc(as(P.a), 'staff', 'new@sodam.test'), { name: '새 사람', active: true }));
  });
  it('관리자와 원제님은 직원을 등록해요 (원제님은 명단에 없어도 돼요)', async () => {
    await assertSucceeds(setDoc(doc(as(P.boss), 'staff', 'new@sodam.test'), { name: '새 사람', active: true }));
    await assertSucceeds(setDoc(doc(as(P.owner), 'staff', OWNER), { name: '원제', admin: true, active: true }));
  });
});

describe('프로필 · 읽음 기록', () => {
  it('프로필은 본인 것만, 본인 이메일로만 써요', async () => {
    await assertSucceeds(setDoc(doc(as(P.b), 'users', P.b.uid), { email: P.b.email, name: 'B' }));
    await assertFails(setDoc(doc(as(P.b), 'users', P.b.uid), { email: P.a.email, name: 'B' }));
    await assertFails(setDoc(doc(as(P.b), 'users', P.a.uid), { email: P.b.email, name: '가짜' }));
  });
  it('읽음 기록은 본인만 봐요', async () => {
    await assertSucceeds(getDoc(doc(as(P.a), 'users', P.a.uid, 'reads', 'c_pub')));
    await assertFails(getDoc(doc(as(P.b), 'users', P.a.uid, 'reads', 'c_pub')));
  });
});

describe('공개 채널', () => {
  it('직원은 읽고, 자기 이름으로만 보내요', async () => {
    const db = as(P.a);
    await assertSucceeds(getDocs(collection(db, 'channels', 'pub', 'msgs')));
    await assertSucceeds(
      setDoc(doc(db, 'channels', 'pub', 'msgs', 'm2'), { uid: P.a.uid, text: '네', at: serverTimestamp() }),
    );
    await assertFails(setDoc(doc(db, 'channels', 'pub', 'msgs', 'm3'), { uid: P.b.uid, text: '사칭' }));
  });
  it('남의 메시지는 반응·답글 수만 바꾸고, 내용은 못 고쳐요', async () => {
    const db = as(P.a);
    await assertSucceeds(updateDoc(doc(db, 'channels', 'pub', 'msgs', 'm1'), { 're.like': [P.a.uid] }));
    await assertFails(updateDoc(doc(db, 'channels', 'pub', 'msgs', 'm1'), { text: '바꿈' }));
    await assertFails(deleteDoc(doc(db, 'channels', 'pub', 'msgs', 'm1')));
  });
  it('반응은 아무 이모지나 (예전 6개 + e코드), 그래도 남의 글 내용은 못 고쳐요', async () => {
    const ref = doc(as(P.a), 'channels', 'pub', 'msgs', 'm1');
    await assertSucceeds(updateDoc(ref, { 're.e1F44F': arrayUnion(P.a.uid) }));
    await assertSucceeds(updateDoc(ref, { 're.e1F44F_1F3FB': arrayUnion(P.a.uid) }));
    await assertFails(updateDoc(ref, { 're.e1F44F': arrayUnion(P.a.uid), text: '바꿈' }));
  });
  it('관리자는 남의 메시지를 지울 수 있어요', async () => {
    await assertSucceeds(deleteDoc(doc(as(P.boss), 'channels', 'pub', 'msgs', 'm1')));
  });
  it('직원은 채널의 마지막 메시지 표시만 바꾸고, 이름은 못 바꿔요', async () => {
    await assertSucceeds(
      updateDoc(doc(as(P.a), 'channels', 'pub'), { last: { text: '네', by: P.a.uid }, lastAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(doc(as(P.a), 'channels', 'pub'), { name: '바꿈' }));
    await assertSucceeds(setDoc(doc(as(P.boss), 'channels', 'x'), { name: '새', priv: false }));
  });
  it('직원도 공개 채널은 만들어요 (만든 사람 = 나, 멤버 = 나)', async () => {
    const db = as(P.a);
    const ok = { name: '새', priv: false, by: P.a.uid, mem: [P.a.email] };
    await assertSucceeds(setDoc(doc(db, 'channels', 'x'), ok));
    await assertFails(setDoc(doc(db, 'channels', 'y'), { name: '새', priv: false }));
    await assertFails(setDoc(doc(db, 'channels', 'y'), { ...ok, by: P.b.uid }));
    await assertFails(setDoc(doc(db, 'channels', 'y'), { ...ok, mem: [P.a.email, P.b.email] }));
    await assertFails(setDoc(doc(db, 'channels', 'y'), { ...ok, priv: true }));
    await assertFails(setDoc(doc(db, 'channels', 'y'), { ...ok, priv: true, kind: 'proj' }));
    await assertFails(
      setDoc(doc(as(P.stranger), 'channels', 'y'), { ...ok, by: P.stranger.uid, mem: [P.stranger.email] }),
    );
  });
});

describe('채널 들어가기 · 나가기', () => {
  it('공개 채널에 나만 들어가고 나만 나가요', async () => {
    const db = as(P.a);
    await assertSucceeds(updateDoc(doc(db, 'channels', 'pub'), { mem: arrayUnion(P.a.email) }));
    await assertFails(updateDoc(doc(db, 'channels', 'pub'), { mem: arrayUnion(P.b.email) }));
    await assertSucceeds(updateDoc(doc(as(P.b), 'channels', 'pub'), { mem: arrayUnion(P.b.email) }));
    await assertFails(updateDoc(doc(db, 'channels', 'pub'), { mem: arrayRemove(P.b.email) }));
    await assertSucceeds(updateDoc(doc(db, 'channels', 'pub'), { mem: arrayRemove(P.a.email) }));
  });
  it('들어가면서 다른 것(이름 등)은 못 바꿔요', async () => {
    await assertFails(updateDoc(doc(as(P.a), 'channels', 'pub'), { mem: arrayUnion(P.a.email), name: '바꿈' }));
  });
  it('비공개 채널은 스스로 못 들어가고, 멤버는 나가기만 돼요', async () => {
    await assertFails(updateDoc(doc(as(P.b), 'channels', 'sec'), { mem: arrayUnion(P.b.email) }));
    await assertFails(updateDoc(doc(as(P.b), 'channels', 'proj'), { mem: arrayRemove(P.a.email) }));
    await assertSucceeds(updateDoc(doc(as(P.b), 'channels', 'proj'), { mem: arrayRemove(P.b.email) }));
    await assertSucceeds(updateDoc(doc(as(P.a), 'channels', 'sec'), { mem: arrayRemove(P.a.email) }));
  });
  it('못 들어오게 한 직원은 들어가지 못해요', async () => {
    await assertFails(updateDoc(doc(as(P.gone), 'channels', 'pub'), { mem: arrayUnion(P.gone.email) }));
  });
});

describe('비공개 채널 · 프로젝트', () => {
  it('멤버만 채널과 메시지를 봐요', async () => {
    await assertSucceeds(getDoc(doc(as(P.a), 'channels', 'sec')));
    await assertSucceeds(getDocs(collection(as(P.a), 'channels', 'sec', 'msgs')));
    await assertFails(getDoc(doc(as(P.b), 'channels', 'sec')));
    await assertFails(getDocs(collection(as(P.b), 'channels', 'sec', 'msgs')));
  });
  it('관리자는 설정은 보지만 멤버가 아니면 메시지는 못 봐요', async () => {
    await assertSucceeds(getDoc(doc(as(P.boss), 'channels', 'sec')));
    await assertFails(getDocs(collection(as(P.boss), 'channels', 'sec', 'msgs')));
    await assertFails(getDocs(collection(as(P.owner), 'channels', 'sec', 'msgs')));
  });
  it('일반 직원은 공개 채널과 내가 멤버인 채널만 목록으로 받아요', async () => {
    await assertSucceeds(getDocs(query(collection(as(P.b), 'channels'), where('priv', '==', false))));
    await assertSucceeds(getDocs(query(collection(as(P.b), 'channels'), where('mem', 'array-contains', P.b.email))));
    await assertFails(getDocs(collection(as(P.b), 'channels')));
  });
  it('프로젝트 할 일: 멤버는 만들고 고치지만, 만든 사람을 바꾸거나 남의 것을 지우진 못해요', async () => {
    const db = as(P.b);
    await assertSucceeds(
      setDoc(doc(db, 'channels', 'proj', 'tasks', 't2'), { title: '전단', by: P.b.uid, st: 'todo' }),
    );
    await assertFails(setDoc(doc(db, 'channels', 'proj', 'tasks', 't3'), { title: '사칭', by: P.a.uid }));
    await assertSucceeds(updateDoc(doc(db, 'channels', 'proj', 'tasks', 't1'), { st: 'doing' }));
    await assertFails(updateDoc(doc(db, 'channels', 'proj', 'tasks', 't1'), { by: P.b.uid }));
    await assertFails(deleteDoc(doc(db, 'channels', 'proj', 'tasks', 't1')));
    await assertSucceeds(deleteDoc(doc(as(P.a), 'channels', 'proj', 'tasks', 't1')));
  });
  it('프로젝트 멤버가 아니면 할 일을 못 봐요', async () => {
    await assertFails(getDocs(collection(as(P.c), 'channels', 'proj', 'tasks')));
  });
});

describe('DM', () => {
  it('두 사람만 읽어요 (관리자·원제님도 못 봐요)', async () => {
    await assertSucceeds(getDocs(collection(as(P.a), 'dms', 'uA_uB', 'msgs')));
    await assertSucceeds(getDocs(collection(as(P.b), 'dms', 'uA_uB', 'msgs')));
    await assertFails(getDocs(collection(as(P.c), 'dms', 'uA_uB', 'msgs')));
    await assertFails(getDocs(collection(as(P.boss), 'dms', 'uA_uB', 'msgs')));
    await assertFails(getDocs(collection(as(P.owner), 'dms', 'uA_uB', 'msgs')));
    await assertFails(getDoc(doc(as(P.c), 'dms', 'uA_uB')));
  });
  it('내 DM 목록만 받아요', async () => {
    await assertSucceeds(getDocs(query(collection(as(P.a), 'dms'), where('m', 'array-contains', P.a.uid))));
    await assertFails(getDocs(collection(as(P.a), 'dms')));
  });
  it('DM 방은 id 규칙(작은 uid_큰 uid)을 지켜야 만들어져요', async () => {
    await assertSucceeds(setDoc(doc(as(P.b), 'dms', 'uB_uC'), { m: ['uB', 'uC'] }));
    await assertFails(setDoc(doc(as(P.b), 'dms', 'uC_uB'), { m: ['uC', 'uB'] }));
    await assertFails(setDoc(doc(as(P.c), 'dms', 'uA_uB'), { m: ['uA', 'uB'] }));
  });
  it('DM 메시지는 내 이름으로만 보내고, 내 것만 지워요', async () => {
    await assertSucceeds(setDoc(doc(as(P.b), 'dms', 'uA_uB', 'msgs', 'm2'), { uid: P.b.uid, text: '응' }));
    await assertFails(setDoc(doc(as(P.b), 'dms', 'uA_uB', 'msgs', 'm3'), { uid: P.a.uid, text: '사칭' }));
    await assertFails(deleteDoc(doc(as(P.b), 'dms', 'uA_uB', 'msgs', 'm1')));
    await assertSucceeds(deleteDoc(doc(as(P.a), 'dms', 'uA_uB', 'msgs', 'm1')));
  });
});

describe('그룹 DM', () => {
  const g = { m: ['uA', 'uB', 'uC'], g: true };
  it('3~8명, 내가 들어 있고 g_ 로 시작하는 id면 만들어져요', async () => {
    await assertSucceeds(setDoc(doc(as(P.a), 'dms', 'g_abc1'), g));
    await assertFails(setDoc(doc(as(P.boss), 'dms', 'g_abc2'), g));
    await assertFails(setDoc(doc(as(P.a), 'dms', 'uA_uB_uC'), g));
    await assertFails(setDoc(doc(as(P.a), 'dms', 'g_abc3'), { m: ['uA', 'uB'], g: true }));
    await assertFails(setDoc(doc(as(P.a), 'dms', 'g_abc4'), { m: ['uA', 'uB', 'uB'], g: true }));
    await assertFails(
      setDoc(doc(as(P.a), 'dms', 'g_abc5'), { m: ['uA', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'], g: true }),
    );
    await assertFails(setDoc(doc(as(P.a), 'dms', 'g_abc6'), { ...g, name: '덧붙인 칸' }));
  });
  it('멤버만 읽고 쓰고, 관리자·바깥 사람은 못 봐요', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'dms', 'g_x', 'msgs', 'm1'), { uid: 'uA', text: '셋이서' });
      await setDoc(doc(db, 'dms', 'g_x'), g);
    });
    await assertSucceeds(getDocs(collection(as(P.c), 'dms', 'g_x', 'msgs')));
    await assertSucceeds(setDoc(doc(as(P.c), 'dms', 'g_x', 'msgs', 'm2'), { uid: P.c.uid, text: '네' }));
    await assertFails(getDocs(collection(as(P.boss), 'dms', 'g_x', 'msgs')));
    await assertFails(getDoc(doc(as(P.owner), 'dms', 'g_x')));
  });
  it('멤버를 나중에 바꾸지 못해요', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), 'dms', 'g_x'), g));
    await assertFails(updateDoc(doc(as(P.a), 'dms', 'g_x'), { m: ['uA', 'uB', 'uC', 'uD'] }));
  });
});

describe('고정 · 나중에 보기', () => {
  it('멤버는 남의 메시지를 고정·해제해요 (고정한 사람은 나로만)', async () => {
    const ref = (p) => doc(as(p), 'channels', 'pub', 'msgs', 'm1');
    await assertSucceeds(updateDoc(ref(P.a), { pinAt: serverTimestamp(), pinBy: P.a.uid }));
    await assertFails(updateDoc(ref(P.a), { pinAt: serverTimestamp(), pinBy: P.c.uid }));
    await assertSucceeds(updateDoc(ref(P.c), { pinAt: deleteField(), pinBy: deleteField() }));
    await assertFails(updateDoc(ref(P.a), { pinAt: serverTimestamp(), pinBy: P.a.uid, text: '바꿈' }));
  });
  it('비공개 채널·DM 밖 사람은 고정 못 해요', async () => {
    await assertFails(
      updateDoc(doc(as(P.b), 'channels', 'sec', 'msgs', 'm1'), { pinAt: serverTimestamp(), pinBy: P.b.uid }),
    );
    await assertFails(
      updateDoc(doc(as(P.c), 'dms', 'uA_uB', 'msgs', 'm1'), { pinAt: serverTimestamp(), pinBy: P.c.uid }),
    );
    await assertSucceeds(
      updateDoc(doc(as(P.b), 'dms', 'uA_uB', 'msgs', 'm1'), { pinAt: serverTimestamp(), pinBy: P.b.uid }),
    );
  });
  it('내 스레드 목록은 본인만 보고 써요', async () => {
    await assertSucceeds(setDoc(doc(as(P.a), 'users', P.a.uid, 'threads', 'c_pub_m1'), { mid: 'm1' }));
    await assertFails(getDoc(doc(as(P.b), 'users', P.a.uid, 'threads', 'c_pub_m1')));
    await assertFails(setDoc(doc(as(P.b), 'users', P.a.uid, 'threads', 'x'), { mid: 'm1' }));
  });
  it('저장 목록은 본인만 보고 써요', async () => {
    await assertSucceeds(setDoc(doc(as(P.a), 'users', P.a.uid, 'saved', 'c_pub_m1'), { mid: 'm1' }));
    await assertFails(getDoc(doc(as(P.b), 'users', P.a.uid, 'saved', 'c_pub_m1')));
    await assertFails(setDoc(doc(as(P.b), 'users', P.a.uid, 'saved', 'x'), { mid: 'm1' }));
  });
});

describe('내 활동', () => {
  const act = (from, extra = {}) => ({
    t: 'men',
    from: from.uid,
    k: 'c',
    cid: 'pub',
    mid: 'm2',
    text: '@B 확인해 주세요',
    at: serverTimestamp(),
    ...extra,
  });
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', P.b.uid), { email: P.b.email, name: 'B' });
      await setDoc(doc(db, 'users', P.c.uid), { email: P.c.email, name: 'C' });
    });
  });
  it('내 이름으로, 받는 사람도 볼 수 있는 대화에만 남겨요', async () => {
    await assertSucceeds(setDoc(doc(as(P.a), 'users', P.b.uid, 'act', 'x1'), act(P.a)));
    await assertFails(setDoc(doc(as(P.a), 'users', P.b.uid, 'act', 'x2'), act(P.c)));
    await assertFails(setDoc(doc(as(P.a), 'users', P.a.uid, 'act', 'x3'), act(P.a)));
    await assertFails(setDoc(doc(as(P.a), 'users', P.b.uid, 'act', 'x4'), act(P.a, { secret: 1 })));
    await assertFails(setDoc(doc(as(P.a), 'users', P.b.uid, 'act', 'x5'), act(P.a, { text: 'x'.repeat(121) })));
  });
  it('비공개 채널 내용은 멤버 아닌 사람에게 못 남겨요', async () => {
    await assertFails(setDoc(doc(as(P.a), 'users', P.b.uid, 'act', 'x6'), act(P.a, { cid: 'sec' })));
    await assertFails(setDoc(doc(as(P.c), 'users', P.a.uid, 'act', 'x7'), act(P.c, { cid: 'sec' })));
  });
  it('DM은 두 사람 사이에서만 남겨요', async () => {
    await assertSucceeds(setDoc(doc(as(P.a), 'users', P.b.uid, 'act', 'x8'), act(P.a, { k: 'd', cid: 'uA_uB' })));
    await assertFails(setDoc(doc(as(P.a), 'users', P.c.uid, 'act', 'x9'), act(P.a, { k: 'd', cid: 'uA_uB' })));
  });
  it('활동은 받는 사람만 읽고, 남긴 사람은 지울 수만 있어요', async () => {
    await assertSucceeds(setDoc(doc(as(P.a), 'users', P.b.uid, 'act', 'x1'), act(P.a)));
    await assertSucceeds(getDocs(collection(as(P.b), 'users', P.b.uid, 'act')));
    await assertFails(getDocs(collection(as(P.a), 'users', P.b.uid, 'act')));
    await assertFails(getDocs(collection(as(P.c), 'users', P.b.uid, 'act')));
    await assertSucceeds(deleteDoc(doc(as(P.a), 'users', P.b.uid, 'act', 'x1')));
  });
});
