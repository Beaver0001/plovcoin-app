"use client";

import { useI18n } from "../I18nProvider";

export function RiskMatrix() {
  const { t } = useI18n();
  const rows = t.whitepaper.risks.rows;

  return (
    <div className="overflow-hidden rounded-2xl border border-fire/15 bg-bg-soft/40">
      <table className="w-full">
        <thead className="bg-bg-soft">
          <tr>
            <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-fire-glow">
              Risk
            </th>
            <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-fire-glow">
              Manifestation
            </th>
            <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-fire-glow">
              Mitigation
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-t border-fire/10 ${i % 2 === 0 ? "" : "bg-bg/20"}`}
            >
              <td className="p-4 align-top">
                <span className="font-display text-sm text-rice">{r.risk}</span>
              </td>
              <td className="p-4 align-top text-sm text-rice-soft">{r.manifestation}</td>
              <td className="p-4 align-top text-sm text-rice-soft">{r.mitigation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
