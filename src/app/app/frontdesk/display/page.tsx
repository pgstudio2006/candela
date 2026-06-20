"use client";

import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { isRedFlagVisit, patientDisplayName, sortQueueVisits } from "@/lib/frontdesk-workflow";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/candela/session-provider";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function QueueDisplayPage() {
  const { session } = useSession();
  const { visits, getQueueVisits, getPatient, roster, refresh, ready } = useFrontdeskStore();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const poll = setInterval(() => void refresh({ silent: true }), 15_000);
    return () => clearInterval(poll);
  }, [ready, refresh]);

  const doctors = roster.allDoctors;
  const nowServing = useMemo(() => {
    const serving = visits.filter((v) => v.stage === "with_doctor" && v.token != null);
    return sortQueueVisits(serving).pop();
  }, [visits]);

  const timeLabel = clock.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateLabel = clock.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex min-h-screen flex-col p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-sm font-medium tracking-wide text-slate-400 uppercase">
            {session?.branchName ?? "Navayu Clinic"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">OPD Queue</h1>
          <p className="mt-1 text-slate-400">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-4xl font-light tabular-nums md:text-5xl">{timeLabel}</p>
          <Link
            href="/app/frontdesk/queue"
            className="mt-2 inline-block text-xs text-slate-500 hover:text-slate-300"
          >
            Staff queue →
          </Link>
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_2fr]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-semibold tracking-[0.12em] text-emerald-400 uppercase">Now serving</p>
          {nowServing ? (
            (() => {
              const p = getPatient(nowServing.patientId);
              return (
                <div className="mt-4">
                  <p className="font-mono text-6xl font-bold text-white md:text-7xl">
                    {nowServing.token != null ? `#${nowServing.token}` : "—"}
                  </p>
                  <p className="mt-3 text-xl font-medium">{p ? patientDisplayName(p) : "Patient"}</p>
                  <p className="text-slate-400">{nowServing.doctorName}</p>
                </div>
              );
            })()
          ) : (
            <p className="mt-6 text-2xl text-slate-500">—</p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doc) => {
            const queue = sortQueueVisits(getQueueVisits(doc.id)).filter(
              (v) => v.stage !== "with_doctor",
            );
            const next = queue[0];
            const rest = queue.slice(1, 4);
            const nextPatient = next ? getPatient(next.patientId) : undefined;

            return (
              <article
                key={doc.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <h2 className="text-sm font-medium text-slate-300">{doc.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{queue.length} waiting</p>

                {next ? (
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold tracking-wide text-amber-400 uppercase">Up next</p>
                    <p
                      className={cn(
                        "mt-1 font-mono text-4xl font-bold",
                        isRedFlagVisit(next) ? "text-red-400" : "text-white",
                      )}
                    >
                      #{next.token ?? "—"}
                    </p>
                    <p className="mt-1 truncate text-sm">{nextPatient ? patientDisplayName(nextPatient) : "—"}</p>
                    {isRedFlagVisit(next) && (
                      <p className="mt-1 text-xs font-medium text-red-400">RED FLAG</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-500">Queue clear</p>
                )}

                {rest.length > 0 && (
                  <ul className="mt-4 space-y-1 border-t border-white/10 pt-3">
                    {rest.map((v) => {
                      const p = getPatient(v.patientId);
                      return (
                        <li key={v.id} className="flex justify-between text-xs text-slate-400">
                          <span className="truncate">#{v.token} {p ? patientDisplayName(p).split(" ")[0] : ""}</span>
                          {isRedFlagVisit(v) && <span className="text-red-400">!</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}
        </section>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-600">
        Auto-refreshes every 15 seconds · Candela Front Desk
      </footer>
    </div>
  );
}
