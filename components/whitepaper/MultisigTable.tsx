"use client";

import { useI18n } from "../I18nProvider";

export function MultisigTable() {
  const { t } = useI18n();
  const rows = t.whitepaper.governance.multisigRows;

  return (
    <div className="overflow-hidden rounded-2xl border border-fire/15 bg-bg-soft/40">
      <table className="w-full">
        <thead className="bg-bg-soft">
          <tr>
            <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-fire-glow">
              Role
            </th>
            <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-fire-glow">
              Threshold
            </th>
            <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-fire-glow">
              Timelock
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-t border-fire/10 ${i % 2 === 0 ? "" : "bg-bg/20"}`}
            >
              <td className="p-4 font-display text-sm text-rice">{r.role}</td>
              <td className="p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-fire/30 bg-fire/10 px-2.5 py-0.5 font-mono text-xs text-fire">
                  {r.threshold}
                </span>
              </td>
              <td className="p-4 font-mono text-sm text-rice-soft">{r.timelock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
