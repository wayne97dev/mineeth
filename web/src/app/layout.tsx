import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://daemonerc8004.com"),
  title: "Daemon — mined ERC-20 agent",
  description:
    "Daemon ($DMN) is a mined ERC-20 with a self-hook and an ERC-8004 agent identity. The token, the V4 hook, and the PoW miner are the same contract.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Daemon — mined ERC-20 agent",
    description:
      "Mined ERC-20 with a self-hook. ERC-8004 agent identity. Soulbound Miner Agent NFTs. No owner, no mint key, no proxy.",
    url: "https://daemonerc8004.com",
    siteName: "Daemon",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "Daemon sigil" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daemon — mined ERC-20 agent",
    description:
      "Mined ERC-20 with a self-hook. ERC-8004 agent identity. Soulbound Miner Agent NFTs.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
