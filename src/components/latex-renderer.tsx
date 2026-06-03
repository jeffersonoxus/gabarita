"use client";

import { useEffect, useRef } from "react";
import katex from "katex";

export default function LatexRenderer({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
      } catch {
        return formula;
      }
    });
  }, [text]);

  return <div ref={ref} className="whitespace-pre-wrap" />;
}
