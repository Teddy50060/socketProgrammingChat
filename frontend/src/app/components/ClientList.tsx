import styles from '../page.module.css';
import type { Client } from '../types';
import { FaUser } from 'react-icons/fa';

interface Props {
  clients: Client[];
  myId: string | null;
  selectedClient: Client | null;
  onSelect: (client: Client) => void;
}

export default function ClientList({ clients, myId, selectedClient, onSelect }: Props) {
  return (
    <section className={styles.section}>
      <h2>Connected Clients</h2>

      <div className={styles.clientListBox}>
        {clients.length === 0 ? (
          <p className={styles.emptyText}>No other clients connected</p>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              onClick={() => onSelect(client)}
              className={`${styles.clientCard} ${selectedClient?.id === client.id ? styles.selectedCard : ''}`}
            >
              <div className={styles.clientRow}>
                <div className={styles.clientInfo}>
                  <FaUser className={styles.clientIcon} />
                  <span className={styles.clientName}>
                    {client.name} {client.id === myId && <span className={styles.youTag}>(You)</span>}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
