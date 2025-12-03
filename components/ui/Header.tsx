'use client'

import Link from 'next/link'
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'
import styles from './Header.module.css'

export default function Header() {
  const { isSignedIn, isLoaded } = useUser()

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Enciclopedia della Vita
        </Link>

        <nav className={styles.nav}>
          {!isLoaded ? (
            <span className={styles.loading}>...</span>
          ) : isSignedIn ? (
            <>
              <Link href="/dashboard" className={styles.navLink}>
                Dashboard
              </Link>
              <Link href="/chat" className={styles.navLink}>
                Coach AI
              </Link>
              <Link href="/soluzioni" className={styles.navLink}>
                Soluzioni
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className={styles.btnLogin}>Accedi</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className={styles.btnSignup}>Registrati</button>
              </SignUpButton>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
