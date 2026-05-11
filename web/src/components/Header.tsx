"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="border-b" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-mono text-xl tracking-tight">
            <span style={{ color: "var(--accent)" }}>$</span>PICK
          </span>
          <nav className="hidden sm:flex gap-6 text-sm font-mono uppercase tracking-wider"
               style={{ color: "var(--fg-muted)" }}>
            <a href="#genesis" className="hover:text-white">genesis</a>
            <a href="#mine" className="hover:text-white">mine</a>
            <a href="#docs" className="hover:text-white">docs</a>
          </nav>
        </div>
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
        />
      </div>
    </header>
  );
}
