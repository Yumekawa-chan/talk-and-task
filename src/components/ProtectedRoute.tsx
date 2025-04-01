'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && pathname.startsWith('/dashboard')) {
        router.push('/');
      } else if (user && pathname === '/') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-100">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-pink-500 rounded-full"></div>
          <div className="mt-4 text-pink-500 font-medium">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {((user && !pathname.startsWith('/dashboard')) || 
       (!user && pathname.startsWith('/dashboard'))) ? null : children}
    </>
  );
} 