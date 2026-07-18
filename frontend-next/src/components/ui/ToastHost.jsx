"use client";
import React, { useEffect, useState, useCallback } from "react";
import { registerToast } from "@/lib/toast";

export default function ToastHost() {
  const [items, setItems] = useState([]);

  const push = useCallback((t) => {
    setItems((prev) => [...prev.slice(-4), t]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== t.id));
    }, t.duration || 3200);
  }, []);

  useEffect(() => {
    registerToast(push);
  }, [push]);

  if (!items.length) return null;

  return (
    <div className="toast-host" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <span className="toast-dot" />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
