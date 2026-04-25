"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CubeContainer, type CubeFace } from "./components/CubeContainer";

const faceOrder: CubeFace[] = ["front", "right", "back", "left"];
const accountStorageKey = "ambitious-accounts";
const currentAccountStorageKey = "ambitious-current-account";

type AuthMode = "login" | "register";

const faceMeta: Record<
  CubeFace,
  {
    title: string;
    subtitle: string;
    eyebrow: string;
  }
> = {
  front: {
    title: "对话模块",
    subtitle: "系统主动发问，持续收集成长信息。",
    eyebrow: "Conversation",
  },
  right: {
    title: "成长档案",
    subtitle: "沉淀经历、项目、实习、论文与综合能力。",
    eyebrow: "Archive",
  },
  back: {
    title: "资料搜索更新",
    subtitle: "围绕你的兴趣方向持续补充外部 memory。",
    eyebrow: "Memory Update",
  },
  left: {
    title: "计划模块",
    subtitle: "基于规划问题生成短期与长期行动路线。",
    eyebrow: "Plan System",
  },
};

function moveFace(current: CubeFace, direction: 1 | -1) {
  const index = faceOrder.indexOf(current);
  const nextIndex = (index + direction + faceOrder.length) % faceOrder.length;
  return faceOrder[nextIndex];
}

function AccountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [accountInput, setAccountInput] = useState("");
  const [accounts, setAccounts] = useState<string[]>([]);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const storedAccounts = window.localStorage.getItem(accountStorageKey);
    const storedCurrentAccount = window.localStorage.getItem(
      currentAccountStorageKey,
    );

    let nextAccounts: string[] | null = null;
    if (storedAccounts) {
      try {
        const parsedAccounts = JSON.parse(storedAccounts);
        if (Array.isArray(parsedAccounts)) {
          nextAccounts = parsedAccounts.filter((account) => typeof account === "string");
        }
      } catch {
        window.localStorage.removeItem(accountStorageKey);
      }
    }

    window.queueMicrotask(() => {
      if (nextAccounts) {
        setAccounts(nextAccounts);
      }
      if (storedCurrentAccount) {
        setCurrentAccount(storedCurrentAccount);
      }
    });
  }, []);

  function persistAccounts(nextAccounts: string[]) {
    setAccounts(nextAccounts);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(nextAccounts));
  }

  function loginAccount(account: string) {
    setCurrentAccount(account);
    window.localStorage.setItem(currentAccountStorageKey, account);
    setNotice(`已登录：${account}`);
    setAccountInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const account = accountInput.trim();
    if (!account) {
      setNotice("请输入账号");
      return;
    }

    if (mode === "register") {
      if (accounts.includes(account)) {
        setNotice("这个账号已经注册过了，可以直接登录");
        return;
      }

      persistAccounts([...accounts, account]);
      loginAccount(account);
      return;
    }

    if (!accounts.includes(account)) {
      setNotice("还没有这个账号，请先注册");
      return;
    }

    loginAccount(account);
  }

  function handleLogout() {
    setCurrentAccount(null);
    window.localStorage.removeItem(currentAccountStorageKey);
    setNotice("已退出当前账号");
  }

  return (
    <div className="absolute right-6 top-6 z-30">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-red-950/80 bg-[linear-gradient(135deg,rgba(10,10,10,0.92),rgba(34,6,6,0.84))] px-4 py-2 text-sm text-zinc-200 shadow-[0_0_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:border-red-700 hover:text-white"
      >
        <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
        {currentAccount ? currentAccount : "登录 / 注册"}
      </button>

      {isOpen ? (
        <div className="mt-3 w-[320px] rounded-[26px] border border-red-950/70 bg-[linear-gradient(145deg,rgba(7,7,7,0.98),rgba(24,4,4,0.96))] p-4 text-left shadow-[0_28px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl">
          <div className="mb-4 flex rounded-full border border-red-950/60 bg-black/35 p-1">
            {(["login", "register"] as AuthMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setNotice("");
                }}
                className={`flex-1 rounded-full px-3 py-2 text-sm transition ${
                  mode === item
                    ? "bg-red-600 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {item === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          {currentAccount ? (
            <div className="rounded-[20px] border border-red-950/50 bg-black/28 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-red-300/70">
                Current Account
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {currentAccount}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 w-full rounded-full border border-red-900/70 px-4 py-2 text-sm text-red-100 transition hover:border-red-600 hover:bg-red-950/30"
              >
                退出账号
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block text-xs uppercase tracking-[0.24em] text-red-300/70">
                Account
              </label>
              <input
                value={accountInput}
                onChange={(event) => {
                  setAccountInput(event.target.value);
                  setNotice("");
                }}
                placeholder="输入你的账号"
                className="mt-3 w-full rounded-2xl border border-red-950/70 bg-black/45 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-600 focus:shadow-[0_0_22px_rgba(220,38,38,0.14)]"
              />
              <button
                type="submit"
                className="mt-4 w-full rounded-full bg-gradient-to-r from-red-800 via-red-600 to-orange-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
              >
                {mode === "login" ? "用账号登录" : "注册并登录"}
              </button>
            </form>
          )}

          {notice ? (
            <p className="mt-3 rounded-2xl border border-red-950/45 bg-red-950/16 px-3 py-2 text-xs text-red-100">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function LandingPageClient() {
  const [activeFace, setActiveFace] = useState<CubeFace>("front");
  const pointerStartX = useRef<number | null>(null);

  const faces = useMemo(
    () => ({
      front: (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-red-300/70">
            {faceMeta.front.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {faceMeta.front.title}
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
            {faceMeta.front.subtitle}
          </p>
        </div>
      ),
      right: (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-red-300/70">
            {faceMeta.right.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {faceMeta.right.title}
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
            {faceMeta.right.subtitle}
          </p>
        </div>
      ),
      back: (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-red-300/70">
            {faceMeta.back.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {faceMeta.back.title}
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
            {faceMeta.back.subtitle}
          </p>
        </div>
      ),
      left: (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-red-300/70">
            {faceMeta.left.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {faceMeta.left.title}
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
            {faceMeta.left.subtitle}
          </p>
        </div>
      ),
    }),
    [],
  );

  function handlePointerStart(clientX: number) {
    pointerStartX.current = clientX;
  }

  function handlePointerEnd(clientX: number) {
    if (pointerStartX.current === null) {
      return;
    }

    const delta = clientX - pointerStartX.current;
    pointerStartX.current = null;

    if (Math.abs(delta) < 45) {
      return;
    }

    setActiveFace((current) => moveFace(current, delta < 0 ? 1 : -1));
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#020202] text-white">
      <AccountMenu />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[48%] h-[70vw] w-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-950/20 blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/2 h-[28vw] w-[56vw] -translate-x-1/2 rounded-full bg-red-950/14 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,10,10,0.12),transparent_26%),radial-gradient(circle_at_top,rgba(239,68,68,0.08),transparent_18%),linear-gradient(180deg,#010101_0%,#020202_48%,#070202_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-6">
        <div className="relative z-10 mb-8 flex justify-center overflow-visible px-4">
          <div className="relative w-full max-w-[1600px] text-center leading-none">
            <span className="absolute inset-0 select-none text-[clamp(4.2rem,11vw,9rem)] font-black uppercase tracking-[0.12em] text-transparent [-webkit-text-stroke:1px_rgba(248,113,113,0.34)]">
              Ambitious
            </span>
            <span className="absolute inset-0 select-none text-[clamp(4.2rem,11vw,9rem)] font-black uppercase tracking-[0.12em] text-red-500/25 blur-[10px]">
              Ambitious
            </span>
            <h1 className="relative select-none bg-[linear-gradient(180deg,rgba(254,202,202,0.9)_0%,rgba(248,113,113,0.72)_24%,rgba(239,68,68,0.48)_56%,rgba(127,29,29,0.12)_100%)] bg-clip-text text-[clamp(4.2rem,11vw,9rem)] font-black uppercase tracking-[0.12em] text-transparent [text-shadow:0_0_42px_rgba(220,38,38,0.2)]">
              Ambitious
            </h1>
          </div>
        </div>

        <div
          className="relative z-10 h-[280px] w-[280px] cursor-grab active:cursor-grabbing sm:h-[320px] sm:w-[320px]"
          onPointerDown={(event) => handlePointerStart(event.clientX)}
          onPointerUp={(event) => handlePointerEnd(event.clientX)}
          onPointerLeave={(event) => {
            if (pointerStartX.current !== null) {
              handlePointerEnd(event.clientX);
            }
          }}
          onTouchStart={(event) => handlePointerStart(event.touches[0].clientX)}
          onTouchEnd={(event) => handlePointerEnd(event.changedTouches[0].clientX)}
        >
          <div className="absolute inset-x-[8%] bottom-[2%] h-16 rounded-full bg-black/85 blur-2xl" />
          <div className="absolute inset-x-[18%] bottom-[8%] h-8 rounded-full bg-red-950/25 blur-xl" />
          <button
            type="button"
            onClick={() => setActiveFace((current) => moveFace(current, -1))}
            className="absolute left-[-18px] top-1/2 z-20 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-red-950/80 bg-[linear-gradient(180deg,rgba(10,10,10,0.96),rgba(24,4,4,0.96))] text-2xl text-zinc-200 shadow-[0_0_24px_rgba(0,0,0,0.45)] transition hover:border-red-800 hover:text-white hover:shadow-[0_0_24px_rgba(220,38,38,0.18)] sm:left-[-52px]"
            aria-label="查看上一面"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setActiveFace((current) => moveFace(current, 1))}
            className="absolute right-[-18px] top-1/2 z-20 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-red-950/80 bg-[linear-gradient(180deg,rgba(10,10,10,0.96),rgba(24,4,4,0.96))] text-2xl text-zinc-200 shadow-[0_0_24px_rgba(0,0,0,0.45)] transition hover:border-red-800 hover:text-white hover:shadow-[0_0_24px_rgba(220,38,38,0.18)] sm:right-[-52px]"
            aria-label="查看下一面"
          >
            ›
          </button>
          <div className="absolute inset-0 rounded-full bg-red-900/8 blur-3xl" />
          <div className="absolute inset-0 animate-[float_6s_ease-in-out_infinite]">
            <CubeContainer
              activeFace={activeFace}
              faces={faces}
              size={280}
              perspective={1350}
              tiltX={-18}
            />
          </div>
        </div>

        <p className="relative z-10 mt-8 text-[11px] uppercase tracking-[0.42em] text-red-300/70">
          Yexinjia
        </p>

        <div className="relative z-10 mt-5 text-center">
          <Link
            href={`/dashboard?face=${activeFace}`}
            className="inline-flex rounded-full bg-gradient-to-r from-red-800 via-red-600 to-orange-400 px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            进入模块
          </Link>
        </div>
      </div>
    </main>
  );
}
