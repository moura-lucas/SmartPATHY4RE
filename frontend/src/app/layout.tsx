import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getCurrentUser } from "@/lib/api";
import { AppSidebar } from "./_layout/AppSidebar";
import { SIDEBAR_WIDTH_INIT_SCRIPT } from "./_layout/sidebarWidth";
import { THEME_INIT_SCRIPT } from "./_layout/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartPATHY",
  description: "Generate PATHY personas and requirements with AI",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before the first paint so saved preferences do not cause a visible jump. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + SIDEBAR_WIDTH_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {user ? (
          <div className="flex min-h-screen flex-col md:flex-row">
            <AppSidebar user={user} />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
