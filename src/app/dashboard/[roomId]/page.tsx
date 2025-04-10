/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaPlus, FaPaperPlane, FaTimes, FaArrowRight, FaHome, FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';
import ChatMessage from '@/components/ChatMessage';
import { useRoom, TaskStatus, Task } from '@/hooks/useRoom';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { Timestamp } from 'firebase/firestore';

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  // React.use() を使用してparamsを展開
  const { roomId } = React.use(params);
  const { user } = useAuth();
  
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<(Task & { dueDate?: Timestamp | null }) | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat'>('tasks');
  const [roomMembers, setRoomMembers] = useState<{
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  }[]>([]);
  
  // タスクフィルター用の状態
  const [taskFilter, setTaskFilter] = useState<string>('all');

  // useRoomフックを使用してFirebaseからデータを取得
  const { 
    room,
    tasks, 
    messages,
    loading,
    error,
    getTasksByStatus, 
    addTask, 
    updateTaskStatus, 
    deleteTask, 
    editTask,
    sendMessage,
    fetchRoomMembers
  } = useRoom(roomId);

  // 新規タスクのフォームデータ
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    assignedUserName: '',
    status: '未着手' as TaskStatus,
    dueDate: ''
  });

  // チャットエリアのrefを追加
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // チャットを最下部にスクロールする関数
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
      
      // 念のため、直接スクロールコンテナも操作
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  // メッセージが更新されたらスクロール
  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0) {
      // 即時と少し遅延させたスクロールの両方を実行
      scrollToBottom();
      setTimeout(scrollToBottom, 300);
    }
  }, [messages, activeTab]);

  // ルームメンバーを取得
  useEffect(() => {
    const loadMembers = async () => {
      const members = await fetchRoomMembers();
      setRoomMembers(members);
      
      // デフォルトで自分を担当者に設定
      if (members.length > 0 && user) {
        const currentUserMember = members.find(member => member.id === user.uid);
        if (currentUserMember) {
          setNewTaskForm(prev => ({
            ...prev,
            assignedTo: currentUserMember.id,
            assignedUserName: currentUserMember.name
          }));
        }
      }
    };
    
    if (room) {
      loadMembers();
    }
  }, [room, fetchRoomMembers, user]);

  // タスク編集ハンドラー
  const handleEditTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setCurrentTask(task);
      setEditTaskModalOpen(true);
    }
  };

  // ルームメンバーから担当者のプロフィール画像を取得する関数
  const getAssigneeProfileImage = (assigneeId: string) => {
    const member = roomMembers.find(member => member.id === assigneeId);
    return member?.profileImage || '';
  };

  // メッセージ送信ハンドラー
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const messageText = newMessage.trim();
      setNewMessage('');
      
      try {
        // メッセージ送信
        await sendMessage(messageText);
        
        // スクロール処理を確実に行う
        setTimeout(() => {
          scrollToBottom();
          // 少し遅延してもう一度スクロール（データ反映後のため）
          setTimeout(scrollToBottom, 300);
        }, 100);
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('送信に失敗しました');
      }
    }
  };

  // 期日が過ぎているかどうかをチェックする関数
  const isOverdue = (dueDate?: Timestamp) => {
    if (!dueDate) return false;
    
    const now = new Date();
    const dueDateJs = dueDate.toDate();
    
    // 日付のみで比較（時間は無視）
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateTime = new Date(dueDateJs.getFullYear(), dueDateJs.getMonth(), dueDateJs.getDate());
    
    return nowDate > dueDateTime;
  };

  // 期日を日本語フォーマットで表示する関数
  const formatDueDate = (dueDate?: Timestamp) => {
    if (!dueDate) return '';
    
    const date = dueDate.toDate();
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // 新規タスク追加ハンドラー
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedMember = roomMembers.find(member => member.id === newTaskForm.assignedTo);
    
    if (!selectedMember) {
      toast.error('担当者が選択されていません');
      return;
    }
    
    const task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { dueDate?: Timestamp } = {
      title: newTaskForm.title,
      description: newTaskForm.description,
      assignedTo: selectedMember.id,
      assignedUserName: selectedMember.name,
      status: newTaskForm.status
    };
    
    // 期日が入力されていれば追加
    if (newTaskForm.dueDate) {
      task.dueDate = Timestamp.fromDate(new Date(newTaskForm.dueDate));
    }
    
    const success = await addTask(task);
    if (success) {
      toast.success('タスクを追加しました');
    }
    
    setNewTaskForm({
      title: '',
      description: '',
      assignedTo: user?.uid || '',
      assignedUserName: selectedMember.name,
      status: '未着手',
      dueDate: ''
    });
    
    setNewTaskModalOpen(false);
  };

  // ステータス変更ハンドラー
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const success = await updateTaskStatus(taskId, newStatus);
    if (success) {
      toast.success(`タスクを「${newStatus}」に更新しました`);
      
      // タスクが完了になった場合、紙吹雪エフェクトを表示
      if (newStatus === '完了') {
        triggerConfetti();
      }
    }
  };
  
  // 紙吹雪エフェクトをトリガーする関数
  const triggerConfetti = () => {
    // 最初の紙吹雪（中央から）
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#FFC0CB', '#FF69B4', '#FFB6C1', '#FF1493', '#DB7093'], // ピンク系の色
    });

    // 少し遅れて2回目の紙吹雪（左から）
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.65 },
        colors: ['#20B2AA', '#48D1CC', '#40E0D0', '#00CED1', '#5F9EA0'], // ティール系の色
      });
    }, 250);

    // 少し遅れて3回目の紙吹雪（右から）
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.65 },
        colors: ['#FFD700', '#FFA500', '#FF8C00', '#FF7F50', '#FF6347'], // オレンジ/イエロー系の色
      });
    }, 400);

    // 最後のフィナーレ（下から上へ）
    setTimeout(() => {
      confetti({
        particleCount: 120,
        startVelocity: 30,
        spread: 180,
        ticks: 100,
        gravity: 0.8,
        origin: { x: 0.5, y: 1 },
        scalar: 1.2,
        shapes: ['circle', 'square'],
        zIndex: 9999,
      });
    }, 650);
  };
  
  // 担当者選択時の処理
  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMemberId = e.target.value;
    const selectedMember = roomMembers.find(member => member.id === selectedMemberId);
    
    if (selectedMember) {
      setNewTaskForm({
        ...newTaskForm,
        assignedTo: selectedMember.id,
        assignedUserName: selectedMember.name
      });
    }
  };
  
  // 編集中のタスクの担当者変更時の処理
  const handleEditAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!currentTask) return;
    
    const selectedMemberId = e.target.value;
    const selectedMember = roomMembers.find(member => member.id === selectedMemberId);
    
    if (selectedMember) {
      setCurrentTask({
        ...currentTask,
        assignedTo: selectedMember.id,
        assignedUserName: selectedMember.name
      });
    }
  };
  
  // タスク編集の保存処理
  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    
    // 更新用のオブジェクトを作成
    const updatedTask: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> = {
      title: currentTask.title,
      description: currentTask.description,
      assignedTo: currentTask.assignedTo,
      assignedUserName: currentTask.assignedUserName,
      status: currentTask.status
    };
    
    try {
      // 期日の更新処理を改善
      if (typeof currentTask.dueDate === 'string') {
        // 文字列タイプの場合
        if (currentTask.dueDate === '') {
          // 空文字の場合、フィールドを削除
          await editTask(currentTask.id, {
            ...updatedTask,
            dueDate: undefined
          });
        } else {
          // 有効な日付文字列がある場合、Timestampに変換
          await editTask(currentTask.id, {
            ...updatedTask,
            dueDate: Timestamp.fromDate(new Date(currentTask.dueDate))
          });
        }
      } else {
        // Timestamp型またはnullの場合
        await editTask(currentTask.id, {
          ...updatedTask,
          dueDate: currentTask.dueDate
        });
      }
      
      toast.success('タスクを更新しました');
    } catch (error) {
      console.error('タスク更新エラー:', error);
      toast.error('タスクの更新に失敗しました');
    }
    
    setEditTaskModalOpen(false);
  };

  // タスク削除ハンドラーを追加
  const handleDeleteTask = async (taskId: string) => {
    const success = await deleteTask(taskId);
    if (success) {
      toast.success('タスクを削除しました');
    }
  };

  // フィルターに基づいてタスクをフィルタリングする関数
  const getFilteredTasksByStatus = (status: TaskStatus) => {
    const tasksWithStatus = getTasksByStatus(status);
    
    // 'all'の場合はフィルタリングなし
    if (taskFilter === 'all') {
      return tasksWithStatus;
    }
    
    // 特定のユーザーでフィルタリング
    return tasksWithStatus.filter(task => task.assignedTo === taskFilter);
  };
  
  // ステータスと表示形式に基づいて、"全て(5)" のような表示テキストを生成
  const getStatusDisplayText = (status: TaskStatus) => {
    const allTasks = getTasksByStatus(status);
    const filteredTasks = getFilteredTasksByStatus(status);
    
    if (taskFilter === 'all') {
      return `(${allTasks.length})`;
    }
    
    return `(${filteredTasks.length}/${allTasks.length})`;
  };

  // マルチセクションでタスクをステータス別に表示
  const todoTasks = getFilteredTasksByStatus('未着手');
  const inProgressTasks = getFilteredTasksByStatus('対応中');
  const completedTasks = getFilteredTasksByStatus('完了');
  
  // キーボードショートカットの処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enterキーで送信（Shiftキーが押されていない場合）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  // タブ切り替え時のハンドラー
  const handleTabChange = (tab: 'tasks' | 'chat') => {
    setActiveTab(tab);
    
    if (tab === 'chat') {
      // 少し待ってからスクロール（レンダリング完了を待つ）
      setTimeout(() => {
        scrollToBottom();
        // 二重に実行して確実にスクロール
        setTimeout(scrollToBottom, 300);
      }, 100);
    }
  };

  // ローディング表示
  if (loading.room || loading.tasks || loading.messages) {
    return (
      <div className="min-h-screen bg-teal-100 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-pink-500 rounded-full"></div>
          <div className="mt-4 text-pink-500 font-medium">ルーム情報を読み込み中...</div>
        </div>
      </div>
    );
  }
  
  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-teal-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-4">エラーが発生しました</h2>
          <p className="text-gray-700">{error}</p>
          <Link href="/dashboard" className="mt-6 block bg-pink-500 text-white py-2 px-4 rounded-lg text-center hover:bg-pink-600 transition-colors">
            ダッシュボードに戻る
          </Link>
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
            {room && (
              <div className="ml-auto text-gray-700">
                <span className="font-semibold">{room.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-200">
          {/* タブナビゲーション */}
          <div className="flex border-b-2 border-gray-200">
            <button 
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'tasks' 
                  ? 'text-gray-800 bg-white border-b-2 border-pink-500' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              } transition-all duration-200`}
              onClick={() => handleTabChange('tasks')}
            >
              タスク管理
            </button>
            <button 
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'chat' 
                  ? 'text-gray-800 bg-white border-b-2 border-teal-500' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              } transition-all duration-200`}
              onClick={() => handleTabChange('chat')}
            >
              チャット
            </button>
          </div>

          {/* タスク管理セクション */}
          {activeTab === 'tasks' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h2 className="text-xl font-semibold text-pink-500">タスク管理</h2>
                
                <div className="flex flex-wrap gap-3 items-center">
                  {/* フィルター選択を削除し、新規タスクボタンのみを残す */}
                  <button 
                    className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-md transform hover:-translate-y-1"
                    onClick={() => setNewTaskModalOpen(true)}
                  >
                    <FaPlus size={14} />
                    <span>新規タスク</span>
                  </button>
                </div>
              </div>

              {/* 参加者一覧 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="text-md font-medium text-gray-700 mb-3 border-b border-gray-200 pb-2">参加者一覧</h3>
                <div className="flex flex-wrap gap-3">
                  {roomMembers.map(member => (
                    <div 
                      key={member.id} 
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                        taskFilter === member.id ? 'bg-pink-100 border border-pink-300' : 'bg-white border border-gray-200'
                      } cursor-pointer hover:bg-pink-50 transition-colors`}
                      onClick={() => setTaskFilter(member.id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {member.profileImage ? (
                          <Image 
                            src={member.profileImage}
                            alt={member.name}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-sm text-gray-600 font-bold">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {member.name}
                        {member.id === user?.uid && <span className="text-xs text-pink-500 ml-1">(自分)</span>}
                      </span>
                    </div>
                  ))}
                  <div 
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      taskFilter === 'all' ? 'bg-teal-100 border border-teal-300' : 'bg-white border border-gray-200'
                    } cursor-pointer hover:bg-teal-50 transition-colors`}
                    onClick={() => setTaskFilter('all')}
                  >
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-500">
                      <FaCheckCircle size={16} />
                    </div>
                    <span className="text-sm font-medium">全て表示</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 未着手タスク */}
                <div className="bg-pink-50 rounded-2xl p-5 shadow-md border border-pink-200">
                  <h3 className="text-lg font-medium text-pink-600 mb-4 border-b-2 border-pink-200 pb-2 flex items-center">
                    <span className="flex-1">未着手 {getStatusDisplayText('未着手')}</span>
                  </h3>
                  <div className="space-y-4">
                    {todoTasks.map((task) => (
                      <div key={task.id} className="bg-white border-2 border-pink-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 duration-200">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-medium text-gray-800">{task.title}</h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditTask(task.id)}
                              className="text-pink-500 hover:text-pink-700 transition-colors"
                              title="タスクを編集"
                            >
                              <FaPlus size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="タスクを削除"
                            >
                              <FaTimes size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                        
                        {/* 期日表示を追加 */}
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 text-xs mb-2 ${isOverdue(task.dueDate instanceof Timestamp ? task.dueDate : undefined) ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                            <FaCalendarAlt />
                            <span>期日: {task.dueDate instanceof Timestamp ? formatDueDate(task.dueDate) : ''}</span>
                            {isOverdue(task.dueDate instanceof Timestamp ? task.dueDate : undefined) && (
                              <span className="bg-red-100 text-red-500 px-2 py-0.5 rounded-full text-xs ml-2">期限切れ</span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-pink-500 text-sm font-medium flex items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-xs overflow-hidden">
                              {getAssigneeProfileImage(task.assignedTo) ? (
                                <Image 
                                  src={getAssigneeProfileImage(task.assignedTo)}
                                  alt={task.assignedUserName}
                                  width={20}
                                  height={20}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                task.assignedUserName.charAt(0).toUpperCase()
                              )}
                            </div>
                            {task.assignedUserName}
                          </span>
                          <button
                            onClick={() => handleStatusChange(task.id, '対応中')}
                            className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition-all duration-200 shadow-sm transform hover:-translate-y-0.5"
                            title="対応中に移動"
                          >
                            <span>対応中へ</span>
                            <FaArrowRight size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {todoTasks.length === 0 && (
                      <div className="text-center py-6 text-pink-400 bg-white rounded-xl border border-pink-100">
                        <p>タスクがありません</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 対応中タスク */}
                <div className="bg-teal-50 rounded-2xl p-5 shadow-md border border-teal-200">
                  <h3 className="text-lg font-medium text-teal-600 mb-4 border-b-2 border-teal-200 pb-2 flex items-center">
                    <span className="flex-1">対応中 {getStatusDisplayText('対応中')}</span>
                  </h3>
                  <div className="space-y-4">
                    {inProgressTasks.map((task) => (
                      <div key={task.id} className="bg-white border-2 border-teal-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 duration-200">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-medium text-gray-800">{task.title}</h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditTask(task.id)}
                              className="text-teal-500 hover:text-teal-700 transition-colors"
                              title="タスクを編集"
                            >
                              <FaPlus size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="タスクを削除"
                            >
                              <FaTimes size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                        
                        {/* 期日表示を追加 */}
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 text-xs mb-2 ${isOverdue(task.dueDate instanceof Timestamp ? task.dueDate : undefined) ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                            <FaCalendarAlt />
                            <span>期日: {task.dueDate instanceof Timestamp ? formatDueDate(task.dueDate) : ''}</span>
                            {isOverdue(task.dueDate instanceof Timestamp ? task.dueDate : undefined) && (
                              <span className="bg-red-100 text-red-500 px-2 py-0.5 rounded-full text-xs ml-2">期限切れ</span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-teal-500 text-sm font-medium flex items-center gap-1">
                              <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-xs overflow-hidden">
                                {getAssigneeProfileImage(task.assignedTo) ? (
                                  <Image 
                                    src={getAssigneeProfileImage(task.assignedTo)}
                                    alt={task.assignedUserName}
                                    width={20}
                                    height={20}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  task.assignedUserName.charAt(0).toUpperCase()
                                )}
                              </div>
                              {task.assignedUserName}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusChange(task.id, '未着手')}
                              className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition-all duration-200 shadow-sm transform hover:-translate-y-0.5"
                              title="未着手に戻す"
                            >
                              <FaArrowLeft size={10} />
                              <span>未着手へ</span>
                            </button>
                            <button
                              onClick={() => handleStatusChange(task.id, '完了')}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition-all duration-200 shadow-sm transform hover:-translate-y-0.5"
                              title="完了に移動"
                            >
                              <span>完了へ</span>
                              <FaArrowRight size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {inProgressTasks.length === 0 && (
                      <div className="text-center py-6 text-teal-400 bg-white rounded-xl border border-teal-100">
                        <p>タスクがありません</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 完了タスク */}
                <div className="bg-yellow-50 rounded-2xl p-5 shadow-md border border-yellow-200">
                  <h3 className="text-lg font-medium text-yellow-600 mb-4 border-b-2 border-yellow-200 pb-2 flex items-center">
                    <span className="flex-1">完了 {getStatusDisplayText('完了')}</span>
                  </h3>
                  <div className="space-y-4">
                    {completedTasks.map((task) => (
                      <div key={task.id} className="bg-gray-800/20 border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 duration-200 opacity-75">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-medium text-gray-600 flex items-center">
                            <FaCheckCircle className="inline mr-1 text-gray-500" size={14} />
                            {task.title}
                          </h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditTask(task.id)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                              title="タスクを編集"
                            >
                              <FaPlus size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                              title="タスクを削除"
                            >
                              <FaTimes size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{task.description}</p>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm font-medium flex items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden">
                              {getAssigneeProfileImage(task.assignedTo) ? (
                                <Image 
                                  src={getAssigneeProfileImage(task.assignedTo)}
                                  alt={task.assignedUserName}
                                  width={20}
                                  height={20}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                task.assignedUserName.charAt(0).toUpperCase()
                              )}
                            </div>
                            {task.assignedUserName}
                          </span>
                          <button
                            onClick={() => handleStatusChange(task.id, '対応中')}
                            className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition-all duration-200 shadow-sm transform hover:-translate-y-0.5"
                            title="対応中に戻す"
                          >
                            <FaArrowLeft size={10} />
                            <span>対応中へ</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {completedTasks.length === 0 && (
                      <div className="text-center py-6 text-gray-500 bg-white rounded-xl border border-gray-200">
                        <p>タスクがありません</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* チャットセクション */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[calc(100vh-250px)]">
              <div className="flex-1 p-6 overflow-y-auto" id="chat-messages-container">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <p className="text-center mb-2">まだメッセージがありません</p>
                    <p className="text-center text-sm">最初のメッセージを送信しましょう</p>
                  </div>
                ) : (
                  <div className="space-y-2 pb-2">
                    {messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isCurrentUser={message.sender.id === user?.uid}
                      />
                    ))}
                    {/* 最下部へのスクロール用の空のdiv要素 */}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              <div className="border-t-2 border-gray-200 p-4 bg-white">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="メッセージを入力...(Enterで送信)"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className={`${
                      !newMessage.trim() 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-pink-500 hover:bg-pink-600 transform hover:-translate-y-1'
                    } text-white p-3 rounded-xl transition-all duration-300 shadow-md`}
                  >
                    <FaPaperPlane size={16} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 新規タスク追加モーダル */}
      {newTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-lg">
            <div className="flex justify-between items-center mb-6 border-b-2 border-gray-100 pb-3">
              <h3 className="text-xl font-semibold text-pink-500">新規タスク</h3>
              <button 
                onClick={() => setNewTaskModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddTask}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="title" className="block text-gray-700 mb-2 font-medium">
                    タイトル
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm({...newTaskForm, title: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-gray-700 mb-2 font-medium">
                    説明
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={newTaskForm.description}
                    onChange={(e) => setNewTaskForm({...newTaskForm, description: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="dueDate" className="block text-gray-700 mb-2 font-medium">
                    期日
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm({...newTaskForm, dueDate: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="assignedTo" className="block text-gray-700 mb-2 font-medium">
                    担当者
                  </label>
                  <select
                    id="assignedTo"
                    value={newTaskForm.assignedTo}
                    onChange={handleAssigneeChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="">担当者を選択</option>
                    {roomMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8 border-t-2 border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setNewTaskModalOpen(false)}
                  className="px-5 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-3 rounded-xl transition-all duration-300 shadow-md transform hover:-translate-y-1 font-medium"
                >
                  追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* タスク編集モーダル */}
      {editTaskModalOpen && currentTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 w-full max-w-md shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold bg-clip-text bg-gradient-to-r text-pink-500">タスク編集</h3>
              <button 
                onClick={() => setEditTaskModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEditTask}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="edit-title" className="block text-gray-700 mb-2 font-medium">
                    タイトル
                  </label>
                  <input
                    type="text"
                    id="edit-title"
                    value={currentTask.title}
                    onChange={(e) => setCurrentTask({...currentTask, title: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-description" className="block text-gray-700 mb-2 font-medium">
                    説明
                  </label>
                  <textarea
                    id="edit-description"
                    rows={3}
                    value={currentTask.description}
                    onChange={(e) => setCurrentTask({...currentTask, description: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="edit-dueDate" className="block text-gray-700 mb-2 font-medium">
                    期日
                  </label>
                  <input
                    type="date"
                    id="edit-dueDate"
                    value={
                      !currentTask ? '' :
                      currentTask.dueDate instanceof Timestamp 
                        ? currentTask.dueDate.toDate().toISOString().split('T')[0] 
                        : typeof currentTask.dueDate === 'string' 
                          ? currentTask.dueDate 
                          : ''
                    }
                    onChange={(e) => {
                      if (currentTask) {
                        setCurrentTask({
                          ...currentTask, 
                          dueDate: e.target.value === '' ? undefined : (e.target.value as any)
                        });
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="edit-assignedTo" className="block text-gray-700 mb-2 font-medium">
                    担当者
                  </label>
                  <select
                    id="edit-assignedTo"
                    value={currentTask.assignedTo}
                    onChange={handleEditAssigneeChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    {roomMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-status" className="block text-gray-700 mb-2 font-medium">
                    ステータス
                  </label>
                  <select
                    id="edit-status"
                    value={currentTask.status}
                    onChange={(e) => setCurrentTask({...currentTask, status: e.target.value as TaskStatus})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="未着手">未着手</option>
                    <option value="対応中">対応中</option>
                    <option value="完了">完了</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setEditTaskModalOpen(false)}
                  className="px-5 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-3 rounded-xl transition-all duration-300 shadow-md transform hover:-translate-y-1 font-medium"
                >
                  更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 