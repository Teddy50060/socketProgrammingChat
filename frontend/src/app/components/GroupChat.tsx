import styles from '../page.module.css';
import MessageBubble from './MessageBubble';
import type { Group, Message } from '../types';

interface Props {
  group: Group;
  messages: Message[];
  myId: string | null;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onLeave: () => void;
}

export default function GroupChat({ group, messages, myId, input, setInput, onSend, onLeave }: Props) {
  return (
    <section className={styles.chatBox}>
      <div className={styles.groupHeader}>
        <h3>Group: {group.name}</h3>
        <button onClick={onLeave} className={styles.dangerButton}>
          Leave
        </button>
      </div>
      <div className={styles.chatWindow}>
        {messages.length === 0 ? (
          <p className={styles.emptyText}>No messages yet.</p>
        ) : (
          messages.map((msg) =>
            msg.fromId === 'system' ? (
              <div key={msg.timestamp} className={styles.systemMessage}>
                {msg.message}
              </div>
            ) : (
              <MessageBubble key={msg.timestamp} msg={msg} isOwn={msg.fromId === myId} />
            )
          )
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
