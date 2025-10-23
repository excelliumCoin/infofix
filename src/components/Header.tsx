"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import WalletChips from "@/components/WalletChips";
import { NAV } from "@/config/nav";
import BrandLogo from "@/components/BrandLogo";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openMy, setOpenMy] = useState(false);

  const isActive = (href: string, starts?: string) =>
    starts
      ? pathname === starts || pathname.startsWith(starts)
      : pathname === href;

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-black/50 border-b border-white/10">
      <div className="mx-auto max-w-5xl px-3 sm:px-4">
        <div className="h-14 flex items-center justify-between gap-3">
          
          {/* ✅ LOGO EKLENDİ */}

<Link href="/" className="flex items-center gap-2 select-none" aria-label="InfoFix Home">
  <BrandLogo />
</Link>


          {/* Desktop */}
          <nav className="hidden md:flex items-center gap-2">
            {NAV.main.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  isActive(it.href) ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                {it.name}
              </Link>
            ))}

            {/* My Page dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenMy((s) => !s)}
                className={`px-3 py-1.5 rounded-lg text-sm transition hover:bg-white/5 ${
                  NAV.myMenu.some((m) => isActive(m.href))
                    ? "bg-white/10"
                    : ""
                }`}
              >
                My Page ▾
              </button>
              {openMy && (
                <div
                  onMouseLeave={() => setOpenMy(false)}
                  className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-black/90 p-1 shadow-lg"
                >
                  {NAV.myMenu.map((m) => (
                    <Link
                      key={m.href}
                      href={m.href}
                      className={`block px-3 py-2 rounded-lg text-sm hover:bg-white/5 ${
                        isActive(m.href) ? "bg-white/10" : ""
                      }`}
                    >
                      {m.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <WalletChips />
            <button
              className="md:hidden px-2 py-1 rounded-lg bg-white/10"
              onClick={() => setOpen((s) => !s)}
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden pb-3">
            <nav className="grid gap-1">
              {NAV.main.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    isActive(it.href) ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  {it.name}
                </Link>
              ))}

              <div className="px-3 pt-2 text-xs opacity-60">My Page</div>
              {NAV.myMenu.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    isActive(m.href) ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  {m.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
