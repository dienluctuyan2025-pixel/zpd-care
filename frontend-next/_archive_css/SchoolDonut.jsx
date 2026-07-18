"use client";
import React from "react";

const COLORS = {
  "Level 1 (An Toàn)": "#34c759",
  "Level 2 (Tiềm Ẩn)": "#ff9f0a",
  "Level 3 (Đáng Kể)": "#ff8c00",
  "Level 4 (Báo Động)": "#ff3b30",
};

export default function SchoolDonut({ levels = {}, total = 0 }) {
  const entries = Object.entries(levels);
  const sum = entries.reduce((a, [, v]) => a + (v || 0), 0) || 1;
  let acc = 0;
  const segments = entries.map(([k, v]) => {
    const start = acc / sum;
    acc += v || 0;
    const end = acc / sum;
    return { k, v: v || 0, start, end, color: COLORS[k] || "#007aff" };
  });

  const size = 72;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="school-donut">
      <svg width={size} height={size} className="school-donut-svg">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
        {segments.map((s) => {
          const len = (s.end - s.start) * c;
          const offset = c * (1 - s.start) - len;
          if (!s.v) return null;
          return (
            <circle
              key={s.k}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="school-donut-total">
          {total}
        </text>
      </svg>
      <div className="school-donut-legend">
        {segments.map((s) => (
          <div key={s.k} className="school-donut-row">
            <span className="school-donut-dot" style={{ background: s.color }} />
            <span>{s.k.replace("Level ", "L")}</span>
            <strong>{s.v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
