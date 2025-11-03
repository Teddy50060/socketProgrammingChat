import styles from '../page.module.css';
import { FaUserCircle } from 'react-icons/fa';

interface HeaderProps {
  myName: string;
  isConnected: boolean;
}

export default function Header({ myName, isConnected }: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Socket.IO Chat Application</h1>
      <div className={styles.userInfo}>
        <FaUserCircle className={styles.icon} />
        <span className={styles.userName}>{myName}</span>
      </div>
    </header>
  );
}
