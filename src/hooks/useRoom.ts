import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/config';

export type TaskStatus = '未着手' | '対応中' | '完了';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  assignedTo: string;
  assignedUserName: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    profileImage?: string;
  };
  timestamp: Timestamp;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  members: string[];
}

export const useRoom = (roomId: string) => {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState({
    room: true,
    tasks: true,
    messages: true
  });
  const [error, setError] = useState<string | null>(null);

  // ルーム情報の取得
  useEffect(() => {
    if (!roomId || !user) return;

    const fetchRoom = async () => {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (!roomSnap.exists()) {
          setError('指定されたルームは存在しません');
          setLoading(prev => ({ ...prev, room: false }));
          return;
        }
        
        const roomData = roomSnap.data() as Omit<Room, 'id'>;
        
        // ユーザーがこのルームのメンバーか確認
        if (!roomData.members.includes(user.uid)) {
          setError('このルームにアクセスする権限がありません');
          setLoading(prev => ({ ...prev, room: false }));
          return;
        }
        
        setRoom({ id: roomSnap.id, ...roomData });
        setLoading(prev => ({ ...prev, room: false }));
      } catch (err) {
        console.error('Failed to fetch room:', err);
        setError('ルーム情報の取得に失敗しました');
        setLoading(prev => ({ ...prev, room: false }));
      }
    };

    fetchRoom();
  }, [roomId, user]);

  // タスクのリアルタイム取得
  useEffect(() => {
    if (!roomId || !user) return;
    
    const q = query(
      collection(db, 'rooms', roomId, 'tasks'),
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(tasksData);
      setLoading(prev => ({ ...prev, tasks: false }));
    }, (err) => {
      console.error('Failed to fetch tasks:', err);
      setError('タスクの取得に失敗しました');
      setLoading(prev => ({ ...prev, tasks: false }));
    });
    
    return () => unsubscribe();
  }, [roomId, user]);

  // メッセージのリアルタイム取得
  useEffect(() => {
    if (!roomId || !user) return;
    
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const messagesData: ChatMessage[] = [];
      
      // メッセージの送信者情報を取得する処理を追加
      const senderPromises: Promise<void>[] = [];
      const senderCache: Record<string, {
        id: string;
        name: string;
        profileImage?: string;
      }> = {}; // 同じユーザーの情報を何度も取得しないためのキャッシュ
      
      querySnapshot.forEach((docSnapshot) => {
        const messageData = docSnapshot.data();
        const senderId = messageData.sender.id;
        
        // 送信者の最新情報を取得する処理を追加（キャッシュしながら）
        if (!senderCache[senderId]) {
          senderPromises.push(
            getDoc(doc(db, 'users', senderId)).then(userDoc => {
              if (userDoc.exists()) {
                const userData = userDoc.data();
                senderCache[senderId] = {
                  id: senderId,
                  name: userData.displayName || 'ユーザー',
                  profileImage: userData.profileImage || ''
                };
              } else {
                senderCache[senderId] = messageData.sender;
              }
            }).catch(error => {
              console.error('Error fetching sender info:', error);
              senderCache[senderId] = messageData.sender;
            })
          );
        }
        
        messagesData.push({ 
          id: docSnapshot.id,
          ...messageData
        } as ChatMessage);
      });
      
      // 全ての送信者情報の取得を待つ
      if (senderPromises.length > 0) {
        await Promise.all(senderPromises);
        
        // 取得した送信者情報でメッセージを更新
        messagesData.forEach(message => {
          if (senderCache[message.sender.id]) {
            message.sender = senderCache[message.sender.id];
          }
        });
      }
      
      setMessages(messagesData);
      setLoading(prev => ({ ...prev, messages: false }));
    }, (err) => {
      console.error('Failed to fetch messages:', err);
      setError('メッセージの取得に失敗しました');
      setLoading(prev => ({ ...prev, messages: false }));
    });
    
    return () => unsubscribe();
  }, [roomId, user]);

  // タスクの追加
  const addTask = async (newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!roomId || !user) return null;
    
    try {
      const taskData = {
        ...newTask,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'rooms', roomId, 'tasks'), taskData);
      return { id: docRef.id, ...taskData };
    } catch (err) {
      console.error('Failed to add task:', err);
      setError('タスクの追加に失敗しました');
      return null;
    }
  };

  // タスクのステータス更新
  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!roomId || !user) return false;
    
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'tasks', taskId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error('Failed to update task status:', err);
      setError('タスクのステータス更新に失敗しました');
      return false;
    }
  };

  // タスクの削除
  const deleteTask = async (taskId: string) => {
    if (!roomId || !user) return false;
    
    try {
      await deleteDoc(doc(db, 'rooms', roomId, 'tasks', taskId));
      return true;
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('タスクの削除に失敗しました');
      return false;
    }
  };

  // タスクの編集
  const editTask = async (taskId: string, updatedTask: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!roomId || !user) return false;
    
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'tasks', taskId), {
        ...updatedTask,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error('Failed to edit task:', err);
      setError('タスクの編集に失敗しました');
      return false;
    }
  };

  // メッセージの送信
  const sendMessage = async (content: string) => {
    if (!roomId || !user) return null;
    
    try {
      // ユーザー情報を取得
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        setError('ユーザー情報の取得に失敗しました');
        return null;
      }
      
      const userData = userSnap.data();
      
      const messageData = {
        content,
        sender: {
          id: user.uid,
          name: userData.displayName || 'ユーザー',
          profileImage: userData.profileImage || ''
        },
        timestamp: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
      return { id: docRef.id, ...messageData };
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('メッセージの送信に失敗しました');
      return null;
    }
  };

  // ステータス別にタスクを取得
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  // ルームのメンバー情報を取得
  const fetchRoomMembers = async () => {
    if (!room) return [];
    
    try {
      const members = [];
      
      for (const memberId of room.members) {
        const memberRef = doc(db, 'users', memberId);
        const memberSnap = await getDoc(memberRef);
        
        if (memberSnap.exists()) {
          const memberData = memberSnap.data();
          members.push({
            id: memberId,
            name: memberData.displayName || 'ユーザー',
            email: memberData.email,
            profileImage: memberData.profileImage || ''
          });
        }
      }
      
      return members;
    } catch (err) {
      console.error('Failed to fetch room members:', err);
      setError('ルームメンバーの取得に失敗しました');
      return [];
    }
  };

  return {
    room,
    tasks,
    messages,
    loading,
    error,
    addTask,
    updateTaskStatus,
    deleteTask,
    editTask,
    sendMessage,
    getTasksByStatus,
    fetchRoomMembers
  };
}; 