import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Navigationbar.module.css';

const Navigationbar = () => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <h1 className={styles.logo}>SmartDriller</h1>
        <div className={styles.navButtons}>
          <Link to="/login" className={styles.loginButton}>
            Login
          </Link>
          <Link to="/register" className={styles.signupButton}>
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigationbar;