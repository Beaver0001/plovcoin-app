"use client";
import { useEffect } from "react";
export function SetLangRu() {
  useEffect(() => { document.documentElement.lang = "ru"; }, []);
  return null;
}
