import styles from '../page.module.css';
import type { Group } from '../types';
import { FaUsers } from 'react-icons/fa';

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
    <section className={styles.groupSection}>
      <div className={styles.groupHeader}>
        <h2>Groups</h2>
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
      </div>

      <div className={styles.groupListBox}>
        {groups.length === 0 ? (
          <p className={styles.emptyText}>No groups available. Create one!</p>
        ) : (
          groups.map((g) => {
            const isMember = g.members.some((m) => m.id === myId);
            const isSelected = currentGroup?.id === g.id;

            return (
              <div
                key={g.id}
                className={`${styles.groupCard} ${isSelected ? styles.selectedCard : ''}`}
                onClick={() => onSelect(g)}
              >
                <div className={styles.groupTopRow}>
                  <div>
                    <strong className={styles.groupName}>{g.name}</strong>
                    <div className={styles.groupMeta}>
                      by {g.creatorName}
                      <span className={styles.divider}>|</span>
                      <span
                        className={styles.memberClickable}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewMembers(g);
                        }}
                      >
                        <FaUsers className={styles.memberIcon} /> {g.members.length} members
                      </span>
                    </div>
                  </div>

                  <div className={`${styles.statusBadge} ${isMember ? styles.joined : styles.notJoined}`}>
                    {isMember ? 'Joined' : 'Not Joined'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
