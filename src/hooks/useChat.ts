import { useState } from 'react';

export type ChatMessage = {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
};

export const useChat = () => {
  // モックデータ
  const initialMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      content: 'みなさん、API設計は終わりましたか？',
      sender: '山田太郎',
      timestamp: new Date('2024-04-01T09:00:00')
    },
    {
      id: 'msg-2',
      content: 'はい、完了しました。ドキュメントも作成中です。',
      sender: '鈴木一郎',
      timestamp: new Date('2024-04-01T09:05:00')
    },
    {
      id: 'msg-3',
      content: 'フロントエンドの実装もほぼ終わっています。あとは認証部分だけです。',
      sender: '佐藤花子',
      timestamp: new Date('2024-04-01T09:10:00')
    },
    {
      id: 'msg-4',
      content: '今週中に完成させる予定です。何か問題があれば教えてください。',
      sender: '田中次郎',
      timestamp: new Date('2024-04-01T09:15:00')
    }
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  // メッセージの送信
  const sendMessage = (content: string, sender: string) => {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      content,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
    return message;
  };

  // メッセージの削除（管理者機能など）
  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(message => message.id !== messageId));
  };

  // メッセージの編集
  const editMessage = (messageId: string, newContent: string) => {
    setMessages(prev => 
      prev.map(message => 
        message.id === messageId 
          ? { ...message, content: newContent } 
          : message
      )
    );
  };

  return {
    messages,
    sendMessage,
    deleteMessage,
    editMessage
  };
}; 