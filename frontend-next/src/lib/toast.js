"use client";

let _push = null;

export function registerToast(fn) {
  _push = fn;
}

export function toast(message, type = "info", duration = 3200) {
  if (typeof _push === "function") {
    _push({ id: Date.now() + Math.random(), message, type, duration });
  }
}

export const toastSuccess = (m) => toast(m, "success");
export const toastError = (m) => toast(m, "error");
export const toastWarn = (m) => toast(m, "warn");
