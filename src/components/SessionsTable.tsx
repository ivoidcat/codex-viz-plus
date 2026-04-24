"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type {
  SessionBackupResponse,
  SessionRestoreResponse,
  SessionSummary,
  SessionsListResponse
} from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function formatSec(sec: number | null) {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function formatTokens(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString();
}

function formatUsd(value: number | null | undefined) {
  if (value == null) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function formatUsdPer1M(value: number | null | undefined) {
  if (value == null) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}/1M`;
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${(value * 100).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatBytes(value: number | null | undefined) {
  if (value == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toLocaleString("en-US", { minimumFractionDigits: size >= 10 || unit === 0 ? 0 : 1, maximumFractionDigits: 1 })} ${units[unit]}`;
}

export default function SessionsTable() {
  const [onlyWithTools, setOnlyWithTools] = useState(false);
  const [onlyWithErrors, setOnlyWithErrors] = useState(false);
  const [q, setQ] = useState("");
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [backupMode, setBackupMode] = useState<"full" | "incremental">("incremental");
  const [backupPath, setBackupPath] = useState("");
  const [restorePath, setRestorePath] = useState("");
  const [backupState, setBackupState] = useState<{
    status: "idle" | "running" | "success" | "error";
    message: string;
    result?: SessionBackupResponse | null;
  }>({ status: "idle", message: "" });
  const [restoreState, setRestoreState] = useState<{
    status: "idle" | "running" | "success" | "error";
    message: string;
    result?: SessionRestoreResponse | null;
  }>({ status: "idle", message: "" });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("codex-viz-backup-path");
      if (saved) setBackupPath(saved);
      const savedMode = window.localStorage.getItem("codex-viz-backup-mode");
      if (savedMode === "full" || savedMode === "incremental") setBackupMode(savedMode);
      const restoreSaved = window.localStorage.getItem("codex-viz-restore-path");
      if (restoreSaved) setRestorePath(restoreSaved);
    } catch {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [onlyWithTools, onlyWithErrors, q]);

  const key = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (onlyWithTools) sp.set("withTools", "1");
    if (onlyWithErrors) sp.set("withErrors", "1");
    sp.set("limit", String(limit));
    sp.set("offset", String(offset));
    return `/api/sessions?${sp.toString()}`;
  }, [q, onlyWithTools, onlyWithErrors, limit, offset]);

  const { data, error, isLoading } = useSWR<SessionsListResponse>(key, fetcher, {
    refreshInterval: 15_000
  });

  const sessions = useMemo(() => {
    return data?.items ?? [];
  }, [data?.items]);

  const runBackup = async () => {
    const targetDir = backupPath.trim();
    if (!targetDir) {
      setBackupState({ status: "error", message: "请输入备份路径" });
      return;
    }
    setBackupState({ status: "running", message: "正在备份…" });
    try {
      const res = await fetch("/api/backup/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDir, mode: backupMode })
      });
      const payload = (await res.json()) as SessionBackupResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "备份失败");
      }
      try {
        window.localStorage.setItem("codex-viz-backup-path", targetDir);
        window.localStorage.setItem("codex-viz-backup-mode", backupMode);
      } catch {
        // ignore
      }
      setBackupState({ status: "success", message: "备份完成", result: payload });
    } catch (error) {
      setBackupState({
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const runRestore = async () => {
    const sourceDir = restorePath.trim();
    if (!sourceDir) {
      setRestoreState({ status: "error", message: "请输入恢复来源路径" });
      return;
    }
    setRestoreState({ status: "running", message: "正在恢复…" });
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDir })
      });
      const payload = (await res.json()) as SessionRestoreResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "恢复失败");
      }
      try {
        window.localStorage.setItem("codex-viz-restore-path", sourceDir);
      } catch {
        // ignore
      }
      setRestoreState({ status: "success", message: "恢复完成", result: payload });
    } catch (error) {
      setRestoreState({
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };

  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        载入失败：{String(error)}
      </section>
    );
  }

  if (isLoading || !data) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        正在加载…
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-cyan-950">备份</div>
            <div className="mt-1 text-xs text-cyan-800/80">
              支持全量或增量备份，都会把原始 jsonl 按目录结构复制到指定路径。
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-cyan-200 bg-white p-1 text-xs">
              <button
                type="button"
                onClick={() => setBackupMode("incremental")}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  backupMode === "incremental"
                    ? "bg-cyan-600 text-white"
                    : "text-cyan-800 hover:bg-cyan-50"
                }`}
              >
                增量
              </button>
              <button
                type="button"
                onClick={() => setBackupMode("full")}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  backupMode === "full" ? "bg-cyan-600 text-white" : "text-cyan-800 hover:bg-cyan-50"
                }`}
              >
                全量
              </button>
            </div>
            <input
              value={backupPath}
              onChange={(e) => setBackupPath(e.target.value)}
              placeholder="例如：~/Backups/codex-viz"
              className="w-[320px] max-w-[75vw] rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={runBackup}
              disabled={backupState.status === "running"}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {backupState.status === "running" ? "备份中…" : "开始备份"}
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs">
          {backupState.status === "success" && backupState.result ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              {backupState.message}：{backupState.result.mode === "incremental" ? "增量" : "全量"}备份，复制{" "}
              {backupState.result.copiedFiles}/{backupState.result.totalFiles} 个文件，跳过 {backupState.result.skippedFiles} 个，
              {formatBytes(backupState.result.bytesCopied)}，目标：{backupState.result.targetDir}
              {backupState.result.note ? `（${backupState.result.note}）` : ""}
            </div>
          ) : null}
          {backupState.status === "error" ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {backupState.message}
            </div>
          ) : null}
          {backupState.status === "idle" ? (
            <div className="text-cyan-800/70">支持输入绝对路径或 `~/` 开头路径。Windows 上可直接输入 `C:\...` 格式。</div>
          ) : null}
        </div>

        <div className="mt-5 border-t border-cyan-100 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-cyan-950">恢复备份</div>
              <div className="mt-1 text-xs text-cyan-800/80">
                从备份目录恢复到当前 sessions 目录，已存在的文件会自动跳过，不会重复恢复。
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={restorePath}
                onChange={(e) => setRestorePath(e.target.value)}
                placeholder="例如：~/Backups/codex-viz"
                className="w-[320px] max-w-[75vw] rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={runRestore}
                disabled={restoreState.status === "running"}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
              >
                {restoreState.status === "running" ? "恢复中…" : "开始恢复"}
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs">
            {restoreState.status === "success" && restoreState.result ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                {restoreState.message}：恢复 {restoreState.result.restoredFiles}/{restoreState.result.totalFiles}
                个文件，跳过 {restoreState.result.skippedFiles} 个已存在文件，{formatBytes(
                  restoreState.result.bytesRestored
                )}，来源：{restoreState.result.sourceDir}
              </div>
            ) : null}
            {restoreState.status === "error" ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                {restoreState.message}
              </div>
            ) : null}
            {restoreState.status === "idle" ? (
              <div className="text-cyan-800/70">支持输入绝对路径或 `~/` 开头路径。Windows 上可直接输入 `C:\...` 格式。</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={onlyWithTools}
              onChange={(e) => setOnlyWithTools(e.target.checked)}
            />
            仅看包含工具
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={onlyWithErrors}
              onChange={(e) => setOnlyWithErrors(e.target.checked)}
            />
            仅看有错误/中断
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索 id/cwd/originator/model…"
            className="w-64 max-w-[70vw] rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <div>
          共 {data?.total ?? 0} 条，当前展示 {sessions.length} 条（offset={offset}）
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOffset(0)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-50"
          >
            回到第一页
          </button>
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset((v) => Math.max(0, v - limit))}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-50 disabled:opacity-50"
          >
            上一页
          </button>
          <button
            type="button"
            disabled={offset + limit >= (data?.total ?? 0)}
            onClick={() => setOffset((v) => v + limit)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-50 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[1500px] w-full table-fixed border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-zinc-600">
              <th className="w-[150px] px-2">开始</th>
              <th className="w-[90px] px-2">时长</th>
              <th className="w-[70px] px-2">消息</th>
              <th className="w-[70px] px-2">工具</th>
              <th className="w-[70px] px-2">错误</th>
              <th className="w-[150px] px-2">模型</th>
              <th className="w-[120px] px-2">Token</th>
              <th className="w-[120px] px-2">费用</th>
              <th className="w-[300px] px-2">费用明细</th>
              <th className="w-[300px] px-2">cwd</th>
              <th className="w-[88px] px-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td className="px-2 py-6 text-zinc-500" colSpan={11}>
                  没有匹配的会话。
                </td>
              </tr>
            ) : (
              sessions.map((s: SessionSummary) => (
                <tr key={s.id} className="rounded-lg bg-zinc-50 text-zinc-800">
                  <td className="px-2 py-2 tabular-nums">{formatDate(s.startedAt)}</td>
                  <td className="px-2 py-2 tabular-nums">{formatSec(s.durationSec ?? null)}</td>
                  <td className="px-2 py-2 tabular-nums">{s.messages ?? 0}</td>
                  <td className="px-2 py-2 tabular-nums">{s.toolCalls ?? 0}</td>
                  <td className="px-2 py-2 tabular-nums">{s.errors ?? 0}</td>
                  <td className="px-2 py-2 max-w-[180px] truncate text-zinc-600">{s.model ?? "—"}</td>
                  <td className="px-2 py-2 tabular-nums text-zinc-600">{formatTokens(s.tokensTotal)}</td>
                  <td className="px-2 py-2 tabular-nums text-zinc-700">{formatUsd(s.estimatedCostUsd)}</td>
                  <td className="px-2 py-2 align-top">
                    {s.costBreakdown ? (
                      <div className="space-y-1 break-words text-[11px] leading-4 text-zinc-600">
                        <div>
                          缓存 {formatPercent(s.costBreakdown.cachedInputRatio)} ({formatTokens(
                            s.costBreakdown.cachedInputTokens
                          )} / {formatTokens(s.tokensInput)})
                        </div>
                        <div>
                          单价 U {formatUsdPer1M(s.costBreakdown.inputPricePer1M)} C{" "}
                          {formatUsdPer1M(s.costBreakdown.cachedInputPricePer1M)} O{" "}
                          {formatUsdPer1M(s.costBreakdown.outputPricePer1M)}
                        </div>
                        <div>
                          费用 U {formatUsd(s.costBreakdown.nonCachedInputCostUsd)} + C{" "}
                          {formatUsd(s.costBreakdown.cachedInputCostUsd)} + O{" "}
                          {formatUsd(s.costBreakdown.outputCostUsd)} = {formatUsd(s.costBreakdown.totalCostUsd)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-400">无公开价格，未统计</span>
                    )}
                  </td>
                  <td className="px-2 py-2 max-w-[320px] truncate text-zinc-600">{s.cwd ?? "—"}</td>
                  <td className="px-2 py-2">
                    <Link
                      className="inline-flex whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                      href={`/sessions/${encodeURIComponent(s.id)}`}
                    >
                      查看
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
