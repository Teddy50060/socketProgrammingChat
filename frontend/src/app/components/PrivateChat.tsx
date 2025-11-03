import styles from '../page.module.css';
import MessageBubble from './MessageBubble';
import type { Client, Message } from '../types';

interface Props {
  client: Client;
  messages: Message[];
  myId: string | null;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
}

export default function PrivateChat({ client, messages, myId, input, setInput, onSend }: Props) {
  return (
    <section className={styles.chatBox}>
      <h3>Chatting with: {client.name}</h3>
      <div className={styles.chatWindow}>
        {messages.length === 0 ? (
          <p className={styles.emptyText}>No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.timestamp} msg={msg} isOwn={msg.fromId === myId} />)
        )}
      </div>
      <div className={styles.chatInput}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className={styles.input}
          onKeyPress={(e) => e.key === 'Enter' && onSend()}
        />
        <button onClick={onSend} className={styles.button}>
          Send
        </button>
      </div>
    </section>
  );
}
