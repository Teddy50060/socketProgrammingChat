import styles from '../page.module.css';
import type { Group } from '../types';

interface Props {
  groups: Group[];
  myId: string | null;
  currentGroup: Group | null;
  groupNameInput: string;
  setGroupNameInput: (v: string) => void;
  onSelect: (g: Group) => void;
  onCreate: () => void;
  onViewMembers: (g: Group) => void;
}

export default function GroupList({
  groups,
  myId,
  currentGroup,
  groupNameInput,
  setGroupNameInput,
  onSelect,
  onCreate,
  onViewMembers,
}: Props) {
  return (
    <section className={styles.section}>
      <h2>👨‍👩‍👧‍👦 Groups</h2>
      <div className={styles.inputGroup}>
        <input
          value={groupNameInput}
          onChange={(e) => setGroupNameInput(e.target.value)}
          placeholder="Enter group name"
          className={styles.input}
          onKeyPress={(e) => e.key === 'Enter' && onCreate()}
        />
        <button onClick={onCreate} className={styles.button}>
          Create
        </button>
      </div>

      <div className={styles.listBox}>
        {groups.length === 0 ? (
          <p className={styles.emptyText}>No groups available. Create one!</p>
        ) : (
          groups.map((g) => (
            <div key={g.id} className={`${styles.listItem} ${currentGroup?.id === g.id ? styles.selected : ''}`}>
              <div className={styles.groupHeaderRow}>
                <div onClick={() => onSelect(g)} className={styles.groupMain}>
                  <strong>{g.name}</strong>
                  <span className={styles.groupInfo}>
                    {' '}
                    by {g.creatorName} | Members: {g.members.length}
                  </span>
                </div>
                <button className={styles.toggleButton} onClick={() => onViewMembers(g)}>
                  👥
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
