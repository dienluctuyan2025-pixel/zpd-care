"use client";
import React, { useEffect, useState } from "react";

const COLOR = {
  green: "#34c759",
  yellow: "#ff9f0a",
  orange: "#ff8c00",
  red: "#ff3b30",
  blue: "#007aff",
};

export default function RiskRing({ score = 1, status = "", color = "green", size = 112 }) {
  const [display, setDisplay] = useState(0);
  const pct = Math.max(0, Math.min(1, (Number(score) - 1) / 3)); // 1..4 -> 0..1
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const ringColor = COLOR[color] || COLOR.blue;

  useEffect(() => {
    const target = Number(score) || 0;
    let frame;
    const start = performance.now();
    const from = 0;
    const dur = 700;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * ease);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="risk-ring-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="risk-ring-svg">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="risk-ring-progress"
            style={{ filter: `drop-shadow(0 0 8px ${ringColor}55)` }}
          />
        </svg>
        <div className="risk-ring-center">
          <div className="risk-ring-score" style={{ color: ringColor }}>
            {display.toFixed(2)}
          </div>
          <div className="risk-ring-label">CARS</div>
        </div>
      </div>
      {status ? <div className="risk-ring-status" style={{ color: ringColor }}>{status}</div> : null}
    </div>
  );
}
