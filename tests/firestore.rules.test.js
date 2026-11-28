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
  it('관리자는 남의 메시지를 지울 수 있어요', async () => {
    await assertSucceeds(deleteDoc(doc(as(P.boss), 'channels', 'pub', 'msgs', 'm1')));
  });
  it('직원은 채널의 마지막 메시지 표시만 바꾸고, 채널은 관리자만 만들어요', async () => {
    await assertSucceeds(
      updateDoc(doc(as(P.a), 'channels', 'pub'), { last: { text: '네', by: P.a.uid }, lastAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(doc(as(P.a), 'channels', 'pub'), { name: '바꿈' }));
    await assertFails(setDoc(doc(as(P.a), 'channels', 'x'), { name: '새', priv: false }));
    await assertSucceeds(setDoc(doc(as(P.boss), 'channels', 'x'), { name: '새', priv: false }));
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
