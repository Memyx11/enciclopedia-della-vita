'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './goals.module.css'
import { AREA_INFO, AreaSlug } from '@/lib/supabase/types'

interface Goal {
    id: string
    title: string
    description: string | null
    type: 'obiettivo' | 'boss' | 'sogno'
    status: 'active' | 'blocked' | 'completed'
    progress: number
    is_primary: boolean
    xp_reward: number
    area: {
        slug: string
        name: string
    }
    tasks_count: number
    tasks_completed: number
    dependencies: Array<{
        type: string
        target_title: string
        satisfied: boolean
    }>
    unlocks: string[]
}

interface Area {
    slug: string
    name: string
    goals_count: number
    progress: number
}

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [areas, setAreas] = useState<Area[]>([])
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
    const [filter, setFilter] = useState<'all' | 'active' | 'boss' | 'sogno'>('all')
    const [selectedArea, setSelectedArea] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchGoals()
    }, [])

    const fetchGoals = async () => {
        try {
            const res = await fetch('/api/goals')
            if (res.ok) {
                const data = await res.json()
                setGoals(data.goals)
                setAreas(data.areas)
                if (data.goals.length > 0) {
                    setSelectedGoal(data.goals[0])
                }
            }
        } catch (error) {
            console.error('Failed to fetch goals:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredGoals = goals.filter(goal => {
        if (filter === 'active' && goal.status !== 'active') return false
        if (filter === 'boss' && goal.type !== 'boss') return false
        if (filter === 'sogno' && goal.type !== 'sogno') return false
        if (selectedArea && goal.area.slug !== selectedArea) return false
        return true
    })

    const getGoalIcon = (goal: Goal) => {
        if (goal.type === 'boss') return '🐉'
        if (goal.type === 'sogno') return '✨'
        if (goal.status === 'completed') return '✅'
        if (goal.status === 'blocked') return '🔒'
        return '🎯'
    }

    const getGoalClass = (goal: Goal) => {
        if (goal.type === 'boss') return styles.boss
        if (goal.type === 'sogno') return styles.dream
        if (goal.status === 'completed') return styles.completed
        if (goal.status === 'blocked') return styles.blocked
        return styles.active
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <div className="bg-gradient" />
                <div className={styles.loading}>Caricamento...</div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className="bg-gradient" />

            {/* Header */}
            <header className={styles.header}>
                <h1 className={styles.title}>🎯 I Tuoi Obiettivi</h1>
                <div className={styles.headerActions}>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            Tutti
                        </button>
                        <button
                            className={`${styles.tab} ${filter === 'active' ? styles.tabActive : ''}`}
                            onClick={() => setFilter('active')}
                        >
                            Attivi
                        </button>
                        <button
                            className={`${styles.tab} ${filter === 'boss' ? styles.tabActive : ''}`}
                            onClick={() => setFilter('boss')}
                        >
                            Boss
                        </button>
                        <button
                            className={`${styles.tab} ${filter === 'sogno' ? styles.tabActive : ''}`}
                            onClick={() => setFilter('sogno')}
                        >
                            Sogni
                        </button>
                    </div>
                    <Link href="/chat" className={styles.newButton}>
                        <span>💬</span> Nuovo con NUR
                    </Link>
                </div>
            </header>

            {/* Areas Overview */}
            <div className={styles.areasOverview}>
                {areas.map(area => {
                    const info = AREA_INFO[area.slug as AreaSlug]
                    return (
                        <button
                            key={area.slug}
                            className={`${styles.areaCard} ${selectedArea === area.slug ? styles.areaActive : ''}`}
                            onClick={() => setSelectedArea(selectedArea === area.slug ? null : area.slug)}
                        >
                            <div className={styles.areaIcon}>{info?.icon || '📌'}</div>
                            <div className={styles.areaName}>{area.name}</div>
                            <div className={styles.areaCount}>{area.goals_count} obiettivi</div>
                            <div className={styles.areaProgress}>
                                <div
                                    className={styles.areaProgressFill}
                                    style={{
                                        width: `${area.progress}%`,
                                        background: info?.color || 'var(--purple)'
                                    }}
                                />
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Main Grid */}
            <div className={styles.mainGrid}>
                {/* Goals List */}
                <div className={styles.goalsList}>
                    {filteredGoals.map(goal => (
                        <div
                            key={goal.id}
                            className={`${styles.goalCard} ${getGoalClass(goal)} ${selectedGoal?.id === goal.id ? styles.selected : ''}`}
                            onClick={() => setSelectedGoal(goal)}
                        >
                            <div className={styles.goalHeader}>
                                <div className={`${styles.goalIcon} ${getGoalClass(goal)}`}>
                                    {getGoalIcon(goal)}
                                </div>
                                <div className={styles.goalInfo}>
                                    <div className={styles.goalTitle}>{goal.title}</div>
                                    <div className={styles.goalArea}>
                                        <span>{AREA_INFO[goal.area.slug as AreaSlug]?.icon} {goal.area.name}</span>
                                        {goal.status === 'blocked' && (
                                            <span className={styles.blockedText}>🔒 Bloccato</span>
                                        )}
                                    </div>
                                </div>
                                <div className={`${styles.goalBadge} ${getGoalClass(goal)}`}>
                                    {goal.type === 'boss' ? '⚔️ BOSS' :
                                     goal.type === 'sogno' ? '🌙 Sogno' :
                                     goal.status === 'active' ? '⚡ Attivo' : ''}
                                </div>
                            </div>
                            <div className={styles.goalProgress}>
                                <div className={styles.goalProgressBar}>
                                    <div
                                        className={styles.goalProgressFill}
                                        style={{ width: `${goal.progress}%` }}
                                    />
                                </div>
                                <div className={styles.goalProgressText}>{goal.progress}%</div>
                            </div>
                        </div>
                    ))}

                    {/* Add Goal Card */}
                    <Link href="/chat" className={styles.addGoalCard}>
                        <div className={styles.addIcon}>➕</div>
                        <div className={styles.addText}>Parla con NUR per aggiungere un obiettivo</div>
                    </Link>
                </div>

                {/* Goal Detail */}
                {selectedGoal && (
                    <div className={styles.goalDetail}>
                        <div className={styles.detailHeader}>
                            <div className={`${styles.detailIcon} ${getGoalClass(selectedGoal)}`}>
                                {getGoalIcon(selectedGoal)}
                            </div>
                            <div className={styles.detailInfo}>
                                <div className={styles.detailTitle}>{selectedGoal.title}</div>
                                <div className={styles.detailMeta}>
                                    <span className={`${styles.detailTag} ${getGoalClass(selectedGoal)}`}>
                                        {selectedGoal.type === 'boss' ? '⚔️ Boss Fight' :
                                         selectedGoal.type === 'sogno' ? '🌙 Sogno' : '🎯 Obiettivo'}
                                    </span>
                                    <span className={styles.detailTag}>
                                        {AREA_INFO[selectedGoal.area.slug as AreaSlug]?.icon} {selectedGoal.area.name}
                                    </span>
                                    <span className={styles.detailTag}>💎 +{selectedGoal.xp_reward} XP</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className={styles.progressSection}>
                            <div className={styles.progressHeader}>
                                <span className={styles.progressTitle}>Progresso</span>
                                <span className={styles.progressValue}>
                                    {selectedGoal.progress}% · {selectedGoal.tasks_completed}/{selectedGoal.tasks_count} task
                                </span>
                            </div>
                            <div className={styles.progressBarLarge}>
                                <div
                                    className={styles.progressBarLargeFill}
                                    style={{ width: `${selectedGoal.progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        {selectedGoal.description && (
                            <div className={styles.descriptionSection}>
                                <div className={styles.sectionTitle}>📝 Descrizione</div>
                                <p className={styles.description}>{selectedGoal.description}</p>
                            </div>
                        )}

                        {/* Dependencies */}
                        {selectedGoal.dependencies.length > 0 && (
                            <div className={styles.dependenciesSection}>
                                <div className={styles.sectionTitle}>⛓️ Dipendenze</div>
                                <div className={styles.depChain}>
                                    {selectedGoal.dependencies.map((dep, idx) => (
                                        <div
                                            key={idx}
                                            className={`${styles.depItem} ${dep.satisfied ? styles.satisfied : styles.missing}`}
                                        >
                                            <span className={styles.depIcon}>
                                                {dep.satisfied ? '✅' : '🔒'}
                                            </span>
                                            <div className={styles.depInfo}>
                                                <div className={styles.depName}>{dep.target_title}</div>
                                                <div className={styles.depType}>{dep.type}</div>
                                            </div>
                                            <span className={`${styles.depStatus} ${dep.satisfied ? styles.satisfied : styles.missing}`}>
                                                {dep.satisfied ? '✓ Completato' : 'Da completare'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Unlocks */}
                        {selectedGoal.unlocks.length > 0 && (
                            <div className={styles.unlocksSection}>
                                <div className={styles.unlockTitle}>
                                    🔓 Completando questo obiettivo sblocchi:
                                </div>
                                <div className={styles.unlocksList}>
                                    {selectedGoal.unlocks.map((unlock, idx) => (
                                        <div key={idx} className={styles.unlockItem}>
                                            <span className={styles.unlockIcon}>🎯</span>
                                            <span>{unlock}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* BOTTOM NAV */}
            <nav className={styles.bottomNav}>
                <Link href="/la-mia-vita" className={styles.navItem}>
                    <span className={styles.navIcon}>🏠</span>
                    <span className={styles.navLabel}>Home</span>
                </Link>
                <Link href="/routine" className={styles.navItem}>
                    <span className={styles.navIcon}>📅</span>
                    <span className={styles.navLabel}>Routine</span>
                </Link>
                <Link href="/goals" className={`${styles.navItem} ${styles.navActive}`}>
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
