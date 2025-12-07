'use client'

import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import AchievementsList from '@/components/profile/AchievementsList'
import MoodChart from '@/components/profile/MoodChart'
import HabitsList from '@/components/profile/HabitsList'
import './profilo.css'

export default function ProfiloPage() {
    const { user, isLoaded } = useUser()

    if (!isLoaded) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Caricamento...</p>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="auth-required">
                <h2>Accedi per vedere il tuo profilo</h2>
                <Link href="/sign-in" className="btn-primary">Accedi</Link>
            </div>
        )
    }

    return (
        <>
            <div className="bg-gradient"></div>

            <header>
                <div className="header-content">
                    <Link href="/" className="logo">NUR</Link>
                    <Link href="/la-mia-vita" className="back-link">← Torna indietro</Link>
                </div>
            </header>

            <main className="profilo-container">
                <div className="profilo-header">
                    <div className="user-avatar">
                        {user.imageUrl ? (
                            <img src={user.imageUrl} alt={user.firstName || 'Avatar'} />
                        ) : (
                            <div className="avatar-placeholder">
                                {(user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || '?').toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="user-info">
                        <h1>{user.firstName || 'Utente'}</h1>
                        <p className="user-email">{user.emailAddresses[0]?.emailAddress}</p>
                    </div>
                </div>

                <div className="profilo-sections">
                    <AchievementsList userId={user.id} />
                    <MoodChart userId={user.id} />
                    <HabitsList userId={user.id} />
                </div>
            </main>

            <Link href="/chat" className="chat-button" title="Chatta con NUR">
                💬
            </Link>

            <footer>
                <p>NUR - Il tuo coach personale</p>
            </footer>
        </>
    )
}
