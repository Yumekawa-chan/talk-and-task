'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaUser, FaSignOutAlt, FaPlus, FaKey, FaTimes, FaHome, FaCopy, FaUserPlus} from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import toast from 'react-hot-toast';

interface Room {
  id: string;
  name: string;
  createdBy: string;
  lastActive: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState(false);
  const [joinRoomModalOpen, setJoinRoomModalOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', password: '' });
  const [joinRoomData, setJoinRoomData] = useState({ roomId: '', password: '' });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      if (!user) return;

      try {
        const roomsQuery = query(
          collection(db, 'rooms'),
          where('members', 'array-contains', user.uid)
        );
        
        const querySnapshot = await getDocs(roomsQuery);
        const roomsData: Room[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          roomsData.push({
            id: doc.id,
            name: data.name,
            createdBy: data.createdBy,
            lastActive: formatLastActive(data.updatedAt?.toDate() || data.createdAt.toDate())
          });
        });
        
        setRooms(roomsData);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [user]);

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}分前`;
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else {
      return `${diffDays}日前`;
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const roomRef = await addDoc(collection(db, 'rooms'), {
        name: newRoomData.name,
        password: newRoomData.password,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      const newRoom = {
        id: roomRef.id,
        name: newRoomData.name,
        createdBy: user.uid,
        lastActive: '今'
      };
      
      setRooms([...rooms, newRoom]);
      setNewRoomData({ name: '', password: '' });
      setCreateRoomModalOpen(false);
      toast.success('ルームを作成しました');
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('ルームの作成に失敗しました');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const roomRef = doc(db, 'rooms', joinRoomData.roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        toast.error('ルームが見つかりません');
        return;
      }
      
      const roomData = roomSnap.data();
      
      if (roomData.password !== joinRoomData.password) {
        toast.error('パスワードが正しくありません');
        return;
      }
      
      if (roomData.members.includes(user.uid)) {
        toast.error('すでに参加しているルームです');
        setJoinRoomData({ roomId: '', password: '' });
        setJoinRoomModalOpen(false);
        return;
      }
      
      // Update room members
      const updatedMembers = [...roomData.members, user.uid];
      await updateDoc(doc(db, 'rooms', joinRoomData.roomId), {
        members: updatedMembers,
        updatedAt: serverTimestamp()
      });
      
      const newRoom = {
        id: joinRoomData.roomId,
        name: roomData.name,
        createdBy: roomData.createdBy,
        lastActive: '今'
      };
      
      setRooms([...rooms, newRoom]);
      setJoinRoomData({ roomId: '', password: '' });
      setJoinRoomModalOpen(false);
      toast.success('ルームに参加しました');
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('ルームへの参加に失敗しました');
    }
  };

  // 招待リンクの生成とコピー
  const handleCreateInvite = (e: React.MouseEvent, roomId: string, roomName: string) => {
    e.preventDefault(); // リンククリックを防止
    e.stopPropagation(); // イベントの伝播を防止
    
    // アプリのベースURL（本番環境では適切なドメインに変更）
    const baseUrl = window.location.origin;
    
    // 招待メッセージの作成
    const inviteMessage = 
`【Talk & Task招待】
「${roomName}」ルームに参加しませんか？

▼ルーム情報
ルームID: ${roomId}

▼アプリを開く
${baseUrl}

※アプリにログイン後、「既存のルームに参加」から上記IDとパスワードを入力してください。`;
    
    navigator.clipboard.writeText(inviteMessage)
      .then(() => {
        toast.success('招待メッセージをコピーしました！友達に共有してください', {
          duration: 4000,
          icon: '🎉'
        });
      })
      .catch((error) => {
        console.error('クリップボードへのコピーに失敗しました', error);
        toast.error('コピーに失敗しました');
      });
  };

  // ルームIDをコピーする関数
  const handleCopyRoomId = (roomId: string, event: React.MouseEvent) => {
    event.preventDefault(); // リンククリックを防止
    event.stopPropagation(); // イベントの伝播を防止
    
    navigator.clipboard.writeText(roomId)
      .then(() => {
        toast.success('ルームIDをコピーしました', {
          duration: 3000,
          icon: '📋'
        });
      })
      .catch((error) => {
        console.error('クリップボードへのコピーに失敗しました', error);
        toast.error('コピーに失敗しました');
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-teal-100 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-pink-500 rounded-full"></div>
          <div className="mt-4 text-pink-500 font-medium">ルームを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-100">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Link href="/" className="flex items-center gap-2">
                <FaHome className="text-pink-500 text-xl" />
                <h1 className="text-2xl font-bold text-pink-500">Talk & Task</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/profile" className="text-gray-700 hover:text-pink-500 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-pink-50 transition-colors">
                <FaUser />
                <span>プロフィール</span>
              </Link>
              <button
                onClick={signOut}
                className="text-gray-700 hover:text-pink-500 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-pink-50 transition-colors"
              >
                <FaSignOutAlt />
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="bg-white rounded-3xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold text-pink-500">あなたのルーム</h2>
            <button 
              className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-md transform hover:-translate-y-1"
              onClick={() => setCreateRoomModalOpen(true)}
            >
              <FaPlus size={14} />
              <span>新規ルーム作成</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <Link 
                key={room.id} 
                href={`/dashboard/${room.id}`}
                className="block bg-white hover:bg-pink-50 border-2 border-gray-200 rounded-2xl p-5 transition-all hover:shadow-lg transform hover:-translate-y-1 duration-300"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-medium text-gray-800 mb-2">{room.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleCopyRoomId(room.id, e)}
                      className="text-gray-400 hover:text-pink-500 transition-colors p-1"
                      title="ルームIDをコピー"
                    >
                      <FaCopy size={14} />
                    </button>
                    <button
                      onClick={(e) => handleCreateInvite(e, room.id, room.name)}
                      className="text-gray-400 hover:text-teal-500 transition-colors p-1"
                      title="招待メッセージを作成"
                    >
                      <FaUserPlus size={14} />
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded mr-1">ID: {room.id}</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">最終アクティブ: {room.lastActive}</p>
                <div className="flex justify-end">
                  <span className="text-pink-500 text-sm flex items-center font-medium">
                    入室する →
                  </span>
                </div>
              </Link>
            ))}

            {rooms.length === 0 && (
              <div className="col-span-full text-center py-10">
                <p className="text-gray-500 mb-4">参加しているルームがありません</p>
                <p className="text-gray-600">新しいルームを作成するか、既存のルームに参加しましょう</p>
              </div>
            )}

            <button
              className="flex flex-col items-center justify-center h-full min-h-[180px] bg-white hover:bg-teal-50 border-2 border-dashed border-teal-300 rounded-2xl p-5 transition-all transform hover:-translate-y-1 duration-300 hover:shadow-md"
              onClick={() => setJoinRoomModalOpen(true)}
            >
              <div className="bg-teal-500 p-4 rounded-xl text-white mb-4">
                <FaKey className="text-2xl" />
              </div>
              <p className="text-gray-700 text-center font-medium">既存のルームに参加</p>
            </button>
          </div>
        </section>
      </main>

      {/* ルーム作成モーダル */}
      {createRoomModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-pink-500">新規ルーム作成</h3>
              <button 
                onClick={() => setCreateRoomModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateRoom}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="roomName" className="block text-gray-700 mb-2 font-medium">
                    ルーム名
                  </label>
                  <input
                    type="text"
                    id="roomName"
                    value={newRoomData.name}
                    onChange={(e) => setNewRoomData({...newRoomData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="roomPassword" className="block text-gray-700 mb-2 font-medium">
                    パスワード
                  </label>
                  <input
                    type="password"
                    id="roomPassword"
                    value={newRoomData.password}
                    onChange={(e) => setNewRoomData({...newRoomData, password: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setCreateRoomModalOpen(false)}
                  className="px-5 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-3 rounded-xl transition-all duration-300 shadow-md font-medium"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ルーム参加モーダル */}
      {joinRoomModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-teal-500">既存のルームに参加</h3>
              <button 
                onClick={() => setJoinRoomModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <form onSubmit={handleJoinRoom}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="joinRoomId" className="block text-gray-700 mb-2 font-medium">
                    ルームID
                  </label>
                  <input
                    type="text"
                    id="joinRoomId"
                    value={joinRoomData.roomId}
                    onChange={(e) => setJoinRoomData({...joinRoomData, roomId: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="joinRoomPassword" className="block text-gray-700 mb-2 font-medium">
                    パスワード
                  </label>
                  <input
                    type="password"
                    id="joinRoomPassword"
                    value={joinRoomData.password}
                    onChange={(e) => setJoinRoomData({...joinRoomData, password: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setJoinRoomModalOpen(false)}
                  className="px-5 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-3 rounded-xl transition-all duration-300 shadow-md font-medium"
                >
                  参加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 