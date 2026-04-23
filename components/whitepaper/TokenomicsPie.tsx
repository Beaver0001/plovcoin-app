"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useI18n } from "../I18nProvider";

const COLORS = ["#FF6B1A", "#FF8A3D", "#FFB700", "#F5C842", "#D44A00", "#C8951C"];

export function TokenomicsPie() {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const allocations = t.whitepaper.wpTokenomics.allocations;

  const data = allocations.map((a, i) => ({
    name: a.label,
    value: parseFloat(a.pct.replace("%", "")),
    pct: a.pct,
    tokens: a.tokens,
    logic: a.logic,
    emoji: a.emoji,
    fill: COLORS[i % COLORS.length],
  }));

  const active = activeIndex !== null ? data[activeIndex] : data[0];

  return (
    <div className="card-warm grid gap-8 !p-6 md:grid-cols-[1fr_1.1fr]">
      {/* Pie */}
      <div className="relative h-72 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.fill}
                  stroke="#0A0806"
                  strokeWidth={2}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
                  style={{
                    cursor: "pointer",
                    transition: "opacity 0.2s, transform 0.2s",
                    transformOrigin: "center",
                    transform: activeIndex === i ? "scale(1.04)" : "scale(1)",
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
            {active.name}
          </div>
          <div className="mt-1 font-display text-4xl text-fire-gradient">{active.pct}</div>
          <div className="mt-0.5 font-mono text-[10px] text-rice-dim">{active.tokens}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
        {data.map((entry, i) => {
          const isActive = activeIndex === i;
          return (
            <button
              key={entry.name}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`group w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                isActive
                  ? "border-fire/50 bg-fire/10"
                  : "border-fire/10 bg-bg/30 hover:border-fire/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: entry.fill }}
                  />
                  <span className="truncate font-display text-sm text-rice">{entry.name}</span>
                </div>
                <span className="shrink-0 font-mono text-xs font-semibold text-fire">
                  {entry.pct}
                </span>
              </div>
              <div className="mt-1 pl-5 font-mono text-[10px] leading-snug text-rice-dim">
                {entry.logic}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
