"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/#story", label: "Story" },
  { href: "/#tokenomics", label: "Tokenomics" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/#security", label: "Security" },
  { href: "/proof", label: "Proof-Hub" },
  { href: "/whitepaper", label: "Whitepaper" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-fire/10 bg-bg/80 backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <nav className="container-narrow flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-display text-2xl text-fire-gradient glow-text"
        >
          $PLOV
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-xs uppercase tracking-wider text-rice-soft transition-colors hover:text-fire"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <Link href="/#community" className="hidden md:inline-flex btn-primary !py-2 !px-5 !text-sm">
          Join PlovArmy
        </Link>

        <button
          className="md:hidden text-rice"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-fire/10 bg-bg-soft md:hidden">
          <div className="container-narrow flex flex-col gap-4 py-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-mono text-sm uppercase tracking-wider text-rice-soft hover:text-fire"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/#community"
              onClick={() => setOpen(false)}
              className="btn-primary !py-2.5 !text-sm mt-2"
            >
              Join PlovArmy
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
