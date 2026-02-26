import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Synalabs Perf | Modern Infrastructure Benchmark",
  description: "Next-generation performance testing dashboard and analytics suite for engineering teams.",
  keywords: ["performance testing", "k6", "benchmarking", "stress test", "latency monitoring"],
  authors: [{ name: "Synalabs Engineering" }],
  creator: "Synalabs",
  publisher: "Synalabs",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#4f6ef7",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=account_circle,add,add_task,analytics,api,arrow_back,auto_graph,bolt,calendar_today,check_circle,chevron_right,close,cloud,code,compare_arrows,dashboard,data_usage,delete,download,edit,encrypted,error,error_outline,folder_managed,grid_view,groups,health_and_safety,info,layers,logout,monitoring,person,person_add,person_check,person_off,psychology,query_stats,router,schema,search,settings,settings_suggest,show_chart,speed,stop_circle,terminal,timer,verified,verified_user,warning&display=block" />
      </head>
      <body className="antialiased geometric-bg min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
