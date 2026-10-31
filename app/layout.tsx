import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title: "Riplay — Your ideas in another dimension",
 description: "A creative studio for music-led videos, cinematic scenes and social-first stories. Powered by Aiplay.",
 openGraph: { title: "Riplay — Your ideas in another dimension", description: "Shape a thought into a visual story.", type: "website" },
 themeColor: "#08090e"
};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body>{children}</body></html>;
}
