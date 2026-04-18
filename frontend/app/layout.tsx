import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import Preloader from "@/src/components/Preloader";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans"
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "ResearchPilot x AskMyNotes",
  description: "Research assistant and study copilot workspace"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <Preloader />
        {children}
      </body>
    </html>
  );
}
