import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: "Talk & Task",
  description: "チームでのTODO管理や進捗報告をシンプルかつ効率的に行うためのプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`antialiased`}
      >
        <AuthProvider>
          <Toaster position="top-center" />
          <ProtectedRoute>{children}</ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}
