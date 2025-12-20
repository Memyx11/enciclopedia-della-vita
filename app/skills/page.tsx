'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './skills.module.css'
import { Stars } from '@/components/nur'

interface Skill {
    id: string
    name: string
    description: string | null
    category: string
    level: number
    progress: number
    area: {
        slug: string
        name: string
    } | null
    linked_goals: Array<{
        id: string
        title: string
    }>
}

const SKILL_LEVELS = [
    { level: 1, name: 'Base', description: 'Fondamenti' },
    { level: 2, name: 'Intermedio', description: 'Competenza crescente' },
    { level: 3, name: 'Avanzato', description: 'Padronanza solida' },
    { level: 4, name: 'Esperto', description: 'Eccellenza' },
    { level: 5, name: 'Leggenda', description: 'Maestria assoluta' }
]

const CATEGORIES = [
    { id: 'all', label: 'Tutte', icon: '🌟' },
    { id: 'lingua', label: 'Lingue', icon: '🗣️' },
    { id: 'tech', label: 'Tech', icon: '💻' },
    { id: 'lavoro', label: 'Lavoro', icon: '💼' },
    { id: 'soft', label: 'Soft Skills', icon: '🧠' },
    { id: 'fisica', label: 'Fisiche', icon: '💪' }
]

export default function SkillsPage() {
    const [skills, setSkills] = useState<Skill[]>([])
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSkills()
    }, [])

    const fetchSkills = async () => {
        try {
            const res = await fetch('/api/skills')
            if (res.ok) {
                const data = await res.json()
                setSkills(data.skills)
                if (data.skills.length > 0) {
                    setSelectedSkill(data.skills[0])
                }
            }
        } catch (error) {
            console.error('Failed to fetch skills:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredSkills = skills.filter(skill => {
        if (filter === 'all') return true
        return skill.category === filter
    })

    const getCategoryIcon = (category: string) => {
        const cat = CATEGORIES.find(c => c.id === category)
        return cat?.icon || '📌'
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'lingua': return 'blue'
            case 'tech': return 'green'
            case 'lavoro': return 'gold'
            case 'soft': return 'pink'
            case 'fisica': return 'cyan'
            default: return 'purple'
        }
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
                <h1 className={styles.title}>🛠️ Le Tue Skills</h1>
                <Link href="/chat" className={styles.addButton}>
                    ➕ Aggiungi Skill
                </Link>
            </header>

            {/* Categories */}
            <div className={styles.categories}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        className={`${styles.categoryBtn} ${filter === cat.id ? styles.active : ''}`}
                        onClick={() => setFilter(cat.id)}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* Main Grid */}
            <div className={styles.mainGrid}>
                {/* Skills List */}
                <div className={styles.skillsList}>
                    {filteredSkills.map(skill => (
                        <div
                            key={skill.id}
                            className={`${styles.skillCard} ${skill.level === 5 ? styles.maxed : ''} ${selectedSkill?.id === skill.id ? styles.selected : ''}`}
                            onClick={() => setSelectedSkill(skill)}
                        >
                            <div className={styles.skillHeader}>
                                <div className={`${styles.skillIcon} ${styles[getCategoryColor(skill.category)]}`}>
                                    {getCategoryIcon(skill.category)}
                                </div>
                                <div className={styles.skillInfo}>
                                    <div className={styles.skillName}>{skill.name}</div>
                                    <div className={styles.skillCategory}>
                                        {getCategoryIcon(skill.category)} {CATEGORIES.find(c => c.id === skill.category)?.label || skill.category}
                                    </div>
                                </div>
                                <div className={styles.skillLevel}>
                                    <Stars value={skill.level} />
                                    <div className={styles.skillLevelText}>
                                        {skill.level === 5 ? 'MAX' : `Lv.${skill.level}/5`}
                                    </div>
                                </div>
                            </div>
                            {skill.level < 5 && (
                                <div className={styles.skillProgress}>
                                    <div className={styles.skillProgressHeader}>
                                        <span className={styles.skillProgressLabel}>
                                            Progresso verso Lv.{skill.level + 1}
                                        </span>
                                        <span className={styles.skillProgressValue}>{skill.progress}%</span>
                                    </div>
                                    <div className={styles.skillProgressBar}>
                                        <div
                                            className={`${styles.skillProgressFill} ${styles[getCategoryColor(skill.category)]}`}
                                            style={{ width: `${skill.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            {skill.linked_goals.length > 0 && (
                                <div className={styles.skillMeta}>
                                    <span className={styles.linkedGoals}>
                                        🎯 Collegato a: {skill.linked_goals.map(g => g.title).join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Skill Card */}
                    <Link href="/chat" className={styles.addSkillCard}>
                        <div className={styles.addIcon}>➕</div>
                        <div className={styles.addText}>Aggiungi una nuova skill</div>
                    </Link>
                </div>

                {/* Skill Detail */}
                {selectedSkill && (
                    <div className={styles.skillDetail}>
                        <div className={styles.detailHeader}>
                            <div className={`${styles.detailIcon} ${styles[getCategoryColor(selectedSkill.category)]}`}>
                                {getCategoryIcon(selectedSkill.category)}
                            </div>
                            <div className={styles.detailInfo}>
                                <div className={styles.detailName}>{selectedSkill.name}</div>
                                <div className={styles.detailCategory}>
                                    {getCategoryIcon(selectedSkill.category)} {CATEGORIES.find(c => c.id === selectedSkill.category)?.label}
                                    {selectedSkill.area && ` · ${selectedSkill.area.name}`}
                                </div>
                                <Stars value={selectedSkill.level} size="lg" />
                            </div>
                        </div>

                        {/* Description */}
                        {selectedSkill.description && (
                            <div className={styles.section}>
                                <p className={styles.description}>{selectedSkill.description}</p>
                            </div>
                        )}

                        {/* Upgrade Path */}
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>📈 Percorso di Upgrade</div>
                            <div className={styles.upgradePath}>
                                {SKILL_LEVELS.map((lvl) => (
                                    <div
                                        key={lvl.level}
                                        className={`${styles.upgradeLevel} ${
                                            lvl.level < selectedSkill.level ? styles.completed :
                                            lvl.level === selectedSkill.level ? styles.current :
                                            styles.locked
                                        }`}
                                    >
                                        <div className={styles.upgradeLevelNum}>
                                            {lvl.level < selectedSkill.level ? '✓' : lvl.level}
                                        </div>
                                        <div className={styles.upgradeLevelInfo}>
                                            <div className={styles.upgradeLevelTitle}>{lvl.name}</div>
                                            <div className={styles.upgradeLevelDesc}>{lvl.description}</div>
                                        </div>
                                        <div className={styles.upgradeLevelStatus}>
                                            {lvl.level < selectedSkill.level ? '✓' :
                                             lvl.level === selectedSkill.level ? `${selectedSkill.progress}%` :
                                             '🔒'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Linked Goals */}
                        {selectedSkill.linked_goals.length > 0 && (
                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>🎯 Obiettivi Collegati</div>
                                <div className={styles.linkedGoalsList}>
                                    {selectedSkill.linked_goals.map(goal => (
                                        <Link
                                            key={goal.id}
                                            href={`/goals?id=${goal.id}`}
                                            className={styles.linkedGoal}
                                        >
                                            <span className={styles.linkedGoalIcon}>🎯</span>
                                            <div className={styles.linkedGoalInfo}>
                                                <div className={styles.linkedGoalTitle}>{goal.title}</div>
                                                <div className={styles.linkedGoalRelation}>
                                                    Questa skill aiuta l'obiettivo
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upgrade Button */}
                        {selectedSkill.level < 5 && (
                            <Link href="/chat" className={styles.upgradeBtn}>
                                ⬆️ Crea Task per Upgrade
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
