import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers.js";
import ClientToastContainer from "./components/ClientToastContainer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Enguio Inventory Management System",
  description: "Comprehensive inventory management system for Enguio",
  // Optimize CSS loading
  other: {
    'preload-css': 'false', // Disable automatic CSS preloading
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <ClientToastContainer />
        </Providers>
      </body>
    </html>
  );
}
