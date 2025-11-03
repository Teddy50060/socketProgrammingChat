import styles from '../page.module.css';
import type { Message } from '../types';

interface Props {
  msg: Message;
  isOwn: boolean;
}

export default function MessageBubble({ msg, isOwn }: Props) {
  return (
    <div className={`${styles.messageRow} ${isOwn ? styles.ownRow : styles.otherRow}`}>
      <div className={styles.senderName}>{isOwn ? 'You' : msg.from}</div>
      <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble}`}>{msg.message}</div>
      <div className={styles.time}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
    </div>
  );
}
