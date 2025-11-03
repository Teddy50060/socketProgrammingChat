import styles from '../page.module.css';

interface HeaderProps {
  myName: string;
  isConnected: boolean;
}

export default function Header({ myName, isConnected }: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>🚀 Socket.IO Chat Application</h1>
      <div className={styles.userInfo}>
        <span className={styles.userName}>👤 {myName}</span>
        <div className={`${styles.statusBadge} ${isConnected ? styles.connected : styles.disconnected}`}>
          {isConnected ? '● Online' : '● Offline'}
        </div>
      </div>
    </header>
  );
}
