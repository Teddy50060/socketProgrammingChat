import styles from '../page.module.css';
import type { Group } from '../types';

interface Props {
  group: Group;
  myId: string | null;
  onClose: () => void;
}

export default function MemberModal({ group, myId, onClose }: Props) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3>👥 Members in "{group.name}"</h3>
        <ul className={styles.memberList}>
          {group.members.map((m) => (
            <li key={m.id}>
              {m.name} {m.id === myId && '(You)'}
            </li>
          ))}
        </ul>
        <button onClick={onClose} className={styles.closeButton}>
          Close
        </button>
      </div>
    </div>
  );
}
