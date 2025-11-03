import styles from '../page.module.css';
import type { Client } from '../types';

interface Props {
  clients: Client[];
  myId: string | null;
  selectedClient: Client | null;
  onSelect: (client: Client) => void;
}

export default function ClientList({ clients, myId, selectedClient, onSelect }: Props) {
  return (
    <section className={styles.section}>
      <h2>👥 Connected Clients</h2>
      <div className={styles.listBox}>
        {clients.length === 0 ? (
          <p className={styles.emptyText}>No other clients connected</p>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              onClick={() => onSelect(client)}
              className={`${styles.listItem} ${selectedClient?.id === client.id ? styles.selected : ''}`}
            >
              {client.name} {client.id === myId && '(You)'}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
