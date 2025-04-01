import { useState } from 'react';

export type TaskStatus = '未着手' | '対応中' | '完了';

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: Date;
  assignedTo: string;
};

export const useTaskManager = () => {
  // モックデータ
  const initialTasks: Task[] = [
    {
      id: 'task-1',
      title: 'デザインの改善',
      description: 'ホームページのUI/UXを改善する',
      status: '未着手',
      createdAt: new Date('2024-04-01'),
      assignedTo: '山田太郎'
    },
    {
      id: 'task-2',
      title: 'APIエンドポイントの実装',
      description: 'ユーザー認証用のAPIエンドポイントを作成',
      status: '対応中',
      createdAt: new Date('2024-03-28'),
      assignedTo: '鈴木一郎'
    },
    {
      id: 'task-3',
      title: 'テスト作成',
      description: '認証機能のユニットテスト作成',
      status: '対応中',
      createdAt: new Date('2024-03-25'),
      assignedTo: '佐藤花子'
    },
    {
      id: 'task-4',
      title: 'ドキュメント作成',
      description: 'APIの使用方法ドキュメントを作成',
      status: '完了',
      createdAt: new Date('2024-03-20'),
      assignedTo: '田中次郎'
    }
  ];

  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // タスクの追加
  const addTask = (newTask: Omit<Task, 'id' | 'createdAt'>) => {
    const task: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      createdAt: new Date()
    };
    setTasks(prev => [...prev, task]);
    return task;
  };

  // タスクのステータス更新
  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus } 
          : task
      )
    );
  };

  // タスクの削除
  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  // タスクの編集
  const editTask = (taskId: string, updatedTask: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, ...updatedTask } 
          : task
      )
    );
  };

  // ステータス別にタスクを取得
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  return {
    tasks,
    addTask,
    updateTaskStatus,
    deleteTask,
    editTask,
    getTasksByStatus
  };
}; 