import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/layout/Providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Newgen Education - Student Management & Analysis System",
  description: "Modern, high-clarity Student Management & Performance Analysis System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(poppins.variable, poppins.className)}>
      <body className="min-h-screen bg-background text-foreground font-sans tabular-nums antialiased selection:bg-primary selection:text-primary-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
