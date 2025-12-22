'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase/client'
import styles from './routine.module.css'

// ============================================
// TYPES
// ============================================

interface RoutineItem {
    id: string
    title: string
    description: string | null
    time_of_day: string | null
    duration_minutes: number
    days_of_week: number[]
    is_active: boolean
    order_index: number
    xp_reward: number
}

interface GroupedRoutine {
    morning: RoutineItem[]
    afternoon: RoutineItem[]
    evening: RoutineItem[]
}

// ============================================
// HELPERS
// ============================================

function parseTimeToMinutes(time: string | null): number {
    if (!time) return 0
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function groupByTimeOfDay(items: RoutineItem[]): GroupedRoutine {
    const grouped: GroupedRoutine = {
        morning: [],
        afternoon: [],
        evening: []
    }

    items.forEach(item => {
        const minutes = parseTimeToMinutes(item.time_of_day)
        if (minutes < 720) { // Before 12:00
            grouped.morning.push(item)
        } else if (minutes < 1080) { // 12:00 - 18:00
            grouped.afternoon.push(item)
        } else { // After 18:00
            grouped.evening.push(item)
        }
    })

    // Sort each group by time
    grouped.morning.sort((a, b) => parseTimeToMinutes(a.time_of_day) - parseTimeToMinutes(b.time_of_day))
    grouped.afternoon.sort((a, b) => parseTimeToMinutes(a.time_of_day) - parseTimeToMinutes(b.time_of_day))
    grouped.evening.sort((a, b) => parseTimeToMinutes(a.time_of_day) - parseTimeToMinutes(b.time_of_day))

    return grouped
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

// ============================================
// COMPONENT
// ============================================

export default function RoutinePage() {
    const router = useRouter()
    const { user, isLoaded } = useUser()

    const [loading, setLoading] = useState(true)
    const [routineItems, setRoutineItems] = useState<RoutineItem[]>([])
    const [showAddModal, setShowAddModal] = useState(false)
    const [newItem, setNewItem] = useState({
        title: '',
        time_of_day: '08:00',
        duration_minutes: 30,
        days_of_week: [1, 2, 3, 4, 5] // Mon-Fri default
    })

    useEffect(() => {
        if (!isLoaded) return
        if (!user) {
            router.push('/sign-in')
            return
        }
        loadRoutine()
    }, [isLoaded, user, router])

    const loadRoutine = async () => {
        if (!user) return

        try {
            const { data, error } = await supabaseClient
                .from('routine_items')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('is_active', true)
                .order('order_index', { ascending: true })

            if (error) throw error
            setRoutineItems(data || [])
        } catch (error) {
            console.error('Error loading routine:', error)
        } finally {
            setLoading(false)
        }
    }

    const addRoutineItem = async () => {
        if (!user || !newItem.title.trim()) return

        try {
            const { error } = await supabaseClient
                .from('routine_items')
                .insert({
                    clerk_user_id: user.id,
                    title: newItem.title,
                    time_of_day: newItem.time_of_day,
                    duration_minutes: newItem.duration_minutes,
                    days_of_week: newItem.days_of_week,
                    is_active: true,
                    order_index: routineItems.length,
                    xp_reward: 5
                })

            if (error) throw error

            setShowAddModal(false)
            setNewItem({
                title: '',
                time_of_day: '08:00',
                duration_minutes: 30,
                days_of_week: [1, 2, 3, 4, 5]
            })
            loadRoutine()
        } catch (error) {
            console.error('Error adding routine item:', error)
        }
    }

    const deleteRoutineItem = async (id: string) => {
        try {
            const { error } = await supabaseClient
                .from('routine_items')
                .update({ is_active: false })
                .eq('id', id)

            if (error) throw error
            loadRoutine()
        } catch (error) {
            console.error('Error deleting routine item:', error)
        }
    }

    const toggleDay = (day: number) => {
        setNewItem(prev => ({
            ...prev,
            days_of_week: prev.days_of_week.includes(day)
                ? prev.days_of_week.filter(d => d !== day)
                : [...prev.days_of_week, day].sort()
        }))
    }

    if (!isLoaded || loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Caricamento...</p>
                </div>
            </div>
        )
    }

    const grouped = groupByTimeOfDay(routineItems)
    const hasItems = routineItems.length > 0

    return (
        <div className={styles.container}>
            <div className="bg-gradient" />

            {/* HEADER */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/la-mia-vita" className={styles.backBtn}>←</Link>
                    <h1>ROUTINE</h1>
                </div>
                <button
                    className={styles.addBtn}
                    onClick={() => setShowAddModal(true)}
                >
                    + Aggiungi
                </button>
            </header>

            {/* MAIN CONTENT */}
            <main className={styles.main}>
                {!hasItems ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📅</div>
                        <h2>Nessuna routine impostata</h2>
                        <p>Crea la tua giornata tipo per strutturare le tue abitudini.</p>
                        <button
                            className={styles.emptyBtn}
                            onClick={() => setShowAddModal(true)}
                        >
                            Crea la tua routine
                        </button>
                    </div>
                ) : (
                    <>
                        {/* MORNING */}
                        {grouped.morning.length > 0 && (
                            <section className={styles.timeSection}>
                                <div className={styles.timeSectionHeader}>
                                    <span className={styles.timeIcon}>☀️</span>
                                    <span className={styles.timeLabel}>MATTINA</span>
                                </div>
                                <div className={styles.routineList}>
                                    {grouped.morning.map(item => (
                                        <RoutineCard
                                            key={item.id}
                                            item={item}
                                            onDelete={() => deleteRoutineItem(item.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* AFTERNOON */}
                        {grouped.afternoon.length > 0 && (
                            <section className={styles.timeSection}>
                                <div className={styles.timeSectionHeader}>
                                    <span className={styles.timeIcon}>⛅</span>
                                    <span className={styles.timeLabel}>POMERIGGIO</span>
                                </div>
                                <div className={styles.routineList}>
                                    {grouped.afternoon.map(item => (
                                        <RoutineCard
                                            key={item.id}
                                            item={item}
                                            onDelete={() => deleteRoutineItem(item.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* EVENING */}
                        {grouped.evening.length > 0 && (
                            <section className={styles.timeSection}>
                                <div className={styles.timeSectionHeader}>
                                    <span className={styles.timeIcon}>🌙</span>
                                    <span className={styles.timeLabel}>SERA</span>
                                </div>
                                <div className={styles.routineList}>
                                    {grouped.evening.map(item => (
                                        <RoutineCard
                                            key={item.id}
                                            item={item}
                                            onDelete={() => deleteRoutineItem(item.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>

            {/* ADD MODAL */}
            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Nuova Attività</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowAddModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Attività</label>
                                <input
                                    type="text"
                                    value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                    placeholder="Es. Meditazione"
                                />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Orario</label>
                                    <input
                                        type="time"
                                        value={newItem.time_of_day}
                                        onChange={e => setNewItem({ ...newItem, time_of_day: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Durata (min)</label>
                                    <input
                                        type="number"
                                        value={newItem.duration_minutes}
                                        onChange={e => setNewItem({ ...newItem, duration_minutes: parseInt(e.target.value) || 0 })}
                                        min="5"
                                        max="480"
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Giorni</label>
                                <div className={styles.daysSelector}>
                                    {DAYS.map((day, index) => (
                                        <button
                                            key={index}
                                            className={`${styles.dayBtn} ${newItem.days_of_week.includes(index) ? styles.selected : ''}`}
                                            onClick={() => toggleDay(index)}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setShowAddModal(false)}
                            >
                                Annulla
                            </button>
                            <button
                                className={styles.saveBtn}
                                onClick={addRoutineItem}
                                disabled={!newItem.title.trim()}
                            >
                                Aggiungi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BOTTOM NAV */}
            <nav className={styles.bottomNav}>
                <Link href="/la-mia-vita" className={styles.navItem}>
                    <span className={styles.navIcon}>🏠</span>
                    <span className={styles.navLabel}>Home</span>
                </Link>
                <Link href="/routine" className={`${styles.navItem} ${styles.active}`}>
                    <span className={styles.navIcon}>📅</span>
                    <span className={styles.navLabel}>Routine</span>
                </Link>
                <Link href="/goals" className={styles.navItem}>
                    <span className={styles.navIcon}>🎯</span>
                    <span className={styles.navLabel}>Goals</span>
                </Link>
                <Link href="/chat" className={styles.navItem}>
                    <span className={styles.navIcon}>💬</span>
                    <span className={styles.navLabel}>Chat</span>
                </Link>
                <Link href="/profile" className={styles.navItem}>
                    <span className={styles.navIcon}>👤</span>
                    <span className={styles.navLabel}>Profilo</span>
                </Link>
            </nav>
        </div>
    )
}

// ============================================
// ROUTINE CARD COMPONENT
// ============================================

function RoutineCard({
    item,
    onDelete
}: {
    item: RoutineItem
    onDelete: () => void
}) {
    return (
        <div className={styles.routineCard}>
            <div className={styles.routineTime}>{item.time_of_day?.slice(0, 5) || '--:--'}</div>
            <div className={styles.routineInfo}>
                <span className={styles.routineTitle}>{item.title}</span>
                {item.description && (
                    <span className={styles.routineDesc}>{item.description}</span>
                )}
            </div>
            <div className={styles.routineMeta}>
                <span className={styles.routineDuration}>{formatDuration(item.duration_minutes)}</span>
                <button className={styles.deleteBtn} onClick={onDelete}>×</button>
            </div>
        </div>
    )
}
