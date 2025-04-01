'use client';

import Link from 'next/link';
import { FaHome, FaArrowLeft } from 'react-icons/fa';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-teal-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-xl border-2 border-gray-200 text-center">
        <div className="flex flex-col items-center">
          <div className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-teal-500 mb-4">
            404
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            ページが見つかりません 😢
          </h1>
          
          <p className="text-gray-600 mb-8">
            お探しのページは存在しないか、移動または削除された可能性があります。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button 
              onClick={() => window.history.back()}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
            >
              <FaArrowLeft />
              <span>前のページに戻る</span>
            </button>
            
            <Link 
              href="/dashboard" 
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md"
            >
              <FaHome />
              <span>ダッシュボードへ</span>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-gray-600 text-sm">
        <Link href="/" className="hover:text-pink-500 transition-colors">
          Talk & Task ホームへ戻る
        </Link>
      </div>
    </div>
  );
} 