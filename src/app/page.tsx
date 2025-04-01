'use client';

import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaTasks, FaComments, FaUsers } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-teal-100 flex flex-col items-center justify-center p-6 text-gray-800">
      <div className="max-w-4xl w-full bg-white rounded-3xl p-8 shadow-xl border-2 border-gray-200">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center text-pink-500 border-b-2 border-pink-100 pb-4">
          Talk & Task
        </h1>
        
        <div className="grid md:grid-cols-2 gap-12 mt-12">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800">シームレスなチーム連携のために</h2>
            <p className="text-gray-600">
              チームでのTODO管理や進捗報告をシンプルかつ効率的に行うためのプラットフォームです。
              タスク管理からチャットまで、チームの生産性向上に必要な機能を全て集約しました。
            </p>
            
            <div className="space-y-5">
              <div className="flex items-start bg-white p-4 rounded-2xl shadow-sm transform transition-all hover:scale-105 border-2 border-pink-200">
                <div className="bg-pink-500 p-3 rounded-xl mr-4 text-white">
                  <FaTasks className="h-5 w-5" />
                </div>
                <p className="text-gray-700 font-medium">タスクをカード形式で直感的に管理</p>
              </div>
              <div className="flex items-start bg-white p-4 rounded-2xl shadow-sm transform transition-all hover:scale-105 border-2 border-teal-200">
                <div className="bg-teal-500 p-3 rounded-xl mr-4 text-white">
                  <FaComments className="h-5 w-5" />
                </div>
                <p className="text-gray-700 font-medium">リアルタイムの進捗共有とチャット機能</p>
              </div>
              <div className="flex items-start bg-white p-4 rounded-2xl shadow-sm transform transition-all hover:scale-105 border-2 border-yellow-200">
                <div className="bg-yellow-500 p-3 rounded-xl mr-4 text-white">
                  <FaUsers className="h-5 w-5" />
                </div>
                <p className="text-gray-700 font-medium">簡単なルーム作成でチーム単位の管理が可能</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col justify-center space-y-6">
            <div className="bg-white p-8 rounded-3xl border-2 border-pink-200 shadow-lg">
              <h3 className="text-xl font-medium mb-6 text-gray-800 text-center border-b-2 border-pink-100 pb-3">ログインしてはじめる</h3>
              <button
                onClick={signInWithGoogle}
                className="w-full bg-pink-500 text-white flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-medium hover:bg-pink-600 transition-all duration-300 shadow-md transform hover:-translate-y-1"
              >
                <FcGoogle className="text-xl bg-white rounded-full p-1" />
                <span>Googleでログイン</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-12 text-center text-gray-700 text-sm">
        © 2025 Talk & Task - Yumekawa Holdings All reserved
      </footer>
    </div>
  );
}