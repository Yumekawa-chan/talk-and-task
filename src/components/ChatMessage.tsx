import { ChatMessage as ChatMessageType } from '@/hooks/useRoom';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';

interface ChatMessageProps {
  message: ChatMessageType;
  isCurrentUser: boolean;
}

export default function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  // 日付をフォーマットする関数
  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      // エラーではなく、現在時刻を表示
      return '今';
    }
    
    try {
      return new Intl.DateTimeFormat('ja-JP', {
        hour: 'numeric',
        minute: 'numeric'
      }).format(timestamp.toDate());
    } catch {
      // 日付の変換に失敗した場合も静かに処理
      return '今';
    }
  };

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isCurrentUser && (
        <div className="mr-2 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden">
            {message.sender.profileImage ? (
              <Image 
                src={message.sender.profileImage}
                alt={message.sender.name}
                width={32}
                height={32}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-sm text-pink-500 font-bold">
                {message.sender.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
      
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
          isCurrentUser
            ? 'bg-pink-500 text-white rounded-br-none border-2 border-pink-600'
            : 'bg-white border-2 border-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        {!isCurrentUser && (
          <div className="flex items-center gap-2 text-xs font-medium text-pink-500 mb-1 border-b border-pink-100 pb-1">
            <span>{message.sender.name}</span>
          </div>
        )}
        <p className="text-sm">{message.content}</p>
        <div className={`text-xs mt-1 ${isCurrentUser ? 'text-white/80' : 'text-gray-500'} text-right`}>
          {formatDate(message.timestamp)}
        </div>
      </div>
      
      {isCurrentUser && (
        <div className="ml-2 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden">
            {message.sender.profileImage ? (
              <Image 
                src={message.sender.profileImage}
                alt={message.sender.name}
                width={32}
                height={32}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-sm text-pink-500 font-bold">
                {message.sender.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 