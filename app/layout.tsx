import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Goodkind Portal",
    template: "%s | Goodkind Portal",
  },
  description: "Client portal for Goodkind Co contract manufacturing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          // Match the Goodkind brand
          colorPrimary: "#283434", // primary-green
          colorText: "#283434",
          colorBackground: "#ebf7ef", // green-tint-01 (card)
          colorInputBackground: "#ffffff",
          fontFamily: "Filson Pro, ui-sans-serif, system-ui, sans-serif",
          borderRadius: "0.5rem",
        },
      }}
    >
      <html lang="en">
        <head>
          <link rel="stylesheet" href="https://use.typekit.net/ika6gcf.css" />
        </head>
        <body className="antialiased">
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
