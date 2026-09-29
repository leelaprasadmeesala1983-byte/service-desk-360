import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Roboto } from "next/font/google";
import Script from "next/script";
import Providers from "@/components/providers";
import { cn } from "@/lib/utils";

import "./globals.css";

const robotoHeading = Roboto({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Service Desk 360",
  description: "Service Desk Management System",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
        robotoHeading.variable,
      )}
    >
      <body className="h-full overflow-hidden">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {`try{var d=document.documentElement,m=localStorage.getItem("theme")||"system",s=window.matchMedia("(prefers-color-scheme: dark)").matches;if(m==="dark"||(m==="system"&&s)){d.classList.add("dark");d.style.colorScheme="dark";}else{d.classList.remove("dark");d.style.colorScheme="light";}var den=localStorage.getItem("servicedesk-ui-density")||"compact";d.setAttribute("data-density",den);}catch(e){}`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
