"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";

export function useCopyFeedback(value: string) {
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setMessage(t.ui.copied);
      timer.current = setTimeout(() => { setCopied(false); setMessage(""); }, 2500);
    } catch {
      setCopied(false);
      setMessage(locale === "ru"
        ? "Не удалось скопировать. Выделите адрес и скопируйте его вручную."
        : "Could not copy. Select the address and copy it manually.");
    }
  }
  return { copied, message, copy };
}
