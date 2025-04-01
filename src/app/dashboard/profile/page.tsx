'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaCheck, FaHome, FaUser } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setDisplayName(userData.displayName || '');
          setProfileImage(userData.profileImage || '');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 画像ファイルのみを許可
    if (!file.type.match('image.*')) {
      toast.error('画像ファイルを選択してください');
      return;
    }

    setUploading(true);
    try {
      // 古い画像が存在する場合は削除
      if (profileImage) {
        try {
          const oldImageRef = ref(storage, `profile_images/${user.uid}`);
          await deleteObject(oldImageRef);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }

      // 新しい画像をアップロード
      const storageRef = ref(storage, `profile_images/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // プロフィール画像URLを更新
      setProfileImage(downloadURL);
      
      // Firestoreにも画像URLを保存
      await updateDoc(doc(db, 'users', user.uid), {
        profileImage: downloadURL,
        updatedAt: new Date()
      });
      
      toast.success('プロフィール画像をアップロードしました');
      
      // AuthContextの更新を反映させるためにページを再読み込み
      // 注: コンテキストを直接更新できる関数があればそれを使用するのがベター
      window.location.reload();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        profileImage, // 画像URLも保存
        updatedAt: new Date()
      });

      toast.success('プロフィールを更新しました');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('プロフィールの更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-teal-100 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-pink-500 rounded-full"></div>
          <div className="mt-4 text-pink-500 font-medium">プロフィールを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-100">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/dashboard" className="text-gray-700 hover:text-pink-500 flex items-center gap-2 mr-6 transition-colors">
              <FaArrowLeft />
            </Link>
            <Link href="/" className="flex items-center gap-2 mr-6">
              <FaHome className="text-pink-500" />
              <h1 className="text-2xl font-bold text-pink-500">Talk & Task</h1>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 flex flex-col items-center">
              <div className="w-40 h-40 rounded-full bg-pink-100 flex items-center justify-center border-4 border-pink-200 relative overflow-hidden">
                <div 
                  className="w-full h-full cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const fileInput = fileInputRef.current;
                      if (fileInput) {
                        // DataTransferから取得したファイルをFileListに設定する方法がないため
                        // 手動でChangeイベントを発火させる代わりに関数を直接呼び出す
                        const event = {
                          target: {
                            files: files
                          }
                        } as unknown as React.ChangeEvent<HTMLInputElement>;
                        handleImageUpload(event);
                      }
                    }
                  }}
                >
                  {profileImage ? (
                    <Image 
                      src={profileImage}
                      alt="プロフィール画像"
                      width={160}
                      height={160}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="text-6xl text-pink-500 font-bold w-full h-full flex items-center justify-center">
                      {displayName ? displayName.charAt(0).toUpperCase() : <FaUser size={64} />}
                    </div>
                  )}
                </div>
                
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <p className="mt-4 text-gray-600 text-sm">
                {profileImage ? 'クリックして画像を変更' : 'クリックして画像をアップロード'}
              </p>
            </div>

            <div className="w-full md:w-2/3 space-y-6">
              <div>
                <label htmlFor="username" className="block text-gray-700 mb-2 font-medium">
                  ユーザー名
                </label>
                <input
                  type="text"
                  id="username"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-gray-700 mb-2 font-medium">
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  value={user?.email || ''}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  disabled
                />
                <p className="text-gray-500 text-xs mt-1">Google認証と連携しているため変更できません</p>
              </div>

              <div className="pt-4 border-t-2 border-gray-100 mt-6">
                <button
                  type="submit"
                  disabled={updating}
                  className={`bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-md ${
                    updating ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {updating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaCheck size={16} />
                  )}
                  <span>{updating ? '保存中...' : '変更を保存'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 