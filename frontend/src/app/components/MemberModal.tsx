import styles from '../page.module.css';
import { FaUsers } from 'react-icons/fa';
import type { Group } from '../types';

interface MemberModalProps {
  group: Group;
  myId: string | null;
  onClose: () => void;
}

export default function MemberModal({ group, onClose }: MemberModalProps) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <FaUsers className={styles.modalIcon} />
          <h3>Members in "{group.name}"</h3>
        </div>

        <ul className={styles.memberList}>
          {group.members.map((m) => (
            <li key={m.id} className={styles.memberItem}>
              <span className={styles.memberDot}>•</span>
              <span className={styles.memberName}>{m.name}</span>
            </li>
          ))}
        </ul>

        <button onClick={onClose} className={styles.modalCloseButton}>
          Close
        </button>
      </div>
    </div>
  );
}
