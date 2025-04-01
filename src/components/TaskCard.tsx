import { FaUser, FaTrash, FaEdit, FaArrowRight } from 'react-icons/fa';
import { Task, TaskStatus } from '@/hooks/useTaskManager';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  // タスクの次のステータスを取得する関数
  const getNextStatus = (currentStatus: TaskStatus): TaskStatus | null => {
    switch (currentStatus) {
      case '未着手':
        return '対応中';
      case '対応中':
        return '完了';
      case '完了':
        return null;
    }
  };

  const nextStatus = getNextStatus(task.status);

  // ステータスに応じて背景色を変更
  const getBgColor = (status: TaskStatus) => {
    switch (status) {
      case '未着手':
        return 'bg-indigo-800/30';
      case '対応中':
        return 'bg-purple-800/30';
      case '完了':
        return 'bg-green-800/30';
    }
  };

  return (
    <div className={`${getBgColor(task.status)} border border-indigo-300/20 rounded-lg p-4 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex justify-between mb-2">
        <h3 className="font-medium text-white">{task.title}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(task.id)}
            className="text-indigo-300 hover:text-indigo-200 transition-colors"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <FaTrash size={16} />
          </button>
        </div>
      </div>

      <p className="text-indigo-200 text-sm mb-4 line-clamp-2">{task.description}</p>

      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center text-indigo-300 text-sm">
          <FaUser className="mr-1" size={12} />
          <span>{task.assignedTo}</span>
        </div>

        <div>
          {nextStatus && (
            <button
              onClick={() => onStatusChange(task.id, nextStatus)}
              className="flex items-center text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded transition-colors"
            >
              <span>{nextStatus}へ</span>
              <FaArrowRight className="ml-1" size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 