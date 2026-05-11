"use client";

import { ConnectWallet } from "./ConnectWallet";

export function Header() {
  return (
    <header className="app-header">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <span className="app-logo">
            <span className="glyph">$</span>PICK
          </span>
          <nav className="hidden sm:flex gap-7">
            <a href="#genesis" className="nav-link">genesis</a>
            <a href="#mine" className="nav-link">mine</a>
            <a href="/whitepaper" className="nav-link">whitepaper</a>
          </nav>
        </div>
        <ConnectWallet />
      </div>
    </header>
  );
}
