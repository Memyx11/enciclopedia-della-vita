'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './materials.module.css'

interface Material {
    id: string
    name: string
    description: string | null
    category: string
    rarity: 'comune' | 'non_comune' | 'raro' | 'epico' | 'leggendario'
    is_owned: boolean
    progress: number
    acquired_at: string | null
    linked_goals: Array<{
        id: string
        title: string
    }>
}

const CATEGORIES = [
    { id: 'all', label: 'Tutti', icon: '📦' },
    { id: 'tech', label: 'Tech', icon: '💻' },
    { id: 'libri', label: 'Libri', icon: '📚' },
    { id: 'corsi', label: 'Corsi', icon: '🎓' },
    { id: 'strumenti', label: 'Strumenti', icon: '🔧' },
    { id: 'documenti', label: 'Documenti', icon: '📄' },
    { id: 'veicoli', label: 'Veicoli', icon: '🚗' }
]

const RARITY_INFO = {
    comune: { label: 'Comune', color: '#718096' },
    non_comune: { label: 'Non Comune', color: '#48BB78' },
    raro: { label: 'Raro', color: '#4299E1' },
    epico: { label: 'Epico', color: '#9F7AEA' },
    leggendario: { label: 'Leggendario', color: '#F6AD55' }
}

export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMaterials()
    }, [])

    const fetchMaterials = async () => {
        try {
            const res = await fetch('/api/materials')
            if (res.ok) {
                const data = await res.json()
                setMaterials(data.materials)
            }
        } catch (error) {
            console.error('Failed to fetch materials:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredMaterials = materials.filter(m => {
        if (filter === 'all') return true
        return m.category === filter
    })

    const owned = filteredMaterials.filter(m => m.is_owned && m.progress >= 100)
    const inProgress = filteredMaterials.filter(m => m.is_owned && m.progress < 100 && m.progress > 0)
    const needed = filteredMaterials.filter(m => !m.is_owned)

    const stats = {
        owned: materials.filter(m => m.is_owned).length,
        inProgress: materials.filter(m => m.is_owned && m.progress < 100 && m.progress > 0).length,
        completed: materials.filter(m => m.progress >= 100).length
    }

    const getCategoryIcon = (category: string) => {
        const cat = CATEGORIES.find(c => c.id === category)
        return cat?.icon || '📦'
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
                <h1 className={styles.title}>📚 Materiali & Risorse</h1>
                <div className={styles.headerStats}>
                    <div className={styles.headerStat}>
                        <div className={`${styles.headerStatValue} ${styles.blue}`}>{stats.owned}</div>
                        <div className={styles.headerStatLabel}>Posseduti</div>
                    </div>
                    <div className={styles.headerStat}>
                        <div className={`${styles.headerStatValue} ${styles.gold}`}>{stats.inProgress}</div>
                        <div className={styles.headerStatLabel}>In Corso</div>
                    </div>
                    <div className={styles.headerStat}>
                        <div className={`${styles.headerStatValue} ${styles.green}`}>{stats.completed}</div>
                        <div className={styles.headerStatLabel}>Completati</div>
                    </div>
                </div>
                <Link href="/chat" className={styles.addButton}>
                    ➕ Aggiungi Materiale
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

            {/* Owned Section */}
            {owned.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitle}>✅ Posseduti</div>
                        <span className={styles.sectionCount}>{owned.length} elementi</span>
                    </div>
                    <div className={styles.materialsGrid}>
                        {owned.map(material => (
                            <MaterialCard key={material.id} material={material} />
                        ))}
                    </div>
                </section>
            )}

            {/* In Progress Section */}
            {inProgress.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitle}>⚡ In Corso</div>
                        <span className={styles.sectionCount}>{inProgress.length} elementi</span>
                    </div>
                    <div className={styles.materialsGrid}>
                        {inProgress.map(material => (
                            <MaterialCard key={material.id} material={material} showProgress />
                        ))}
                    </div>
                </section>
            )}

            {/* Needed Section */}
            {needed.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitle}>🔒 Da Acquisire</div>
                        <span className={styles.sectionCount}>{needed.length} elementi</span>
                    </div>
                    <div className={styles.materialsGrid}>
                        {needed.map(material => (
                            <MaterialCard key={material.id} material={material} />
                        ))}
                        {/* Add Card */}
                        <Link href="/chat" className={styles.addMaterialCard}>
                            <div className={styles.addMaterialIcon}>➕</div>
                            <div className={styles.addMaterialText}>Aggiungi materiale</div>
                        </Link>
                    </div>
                </section>
            )}

            {materials.length === 0 && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📚</div>
                    <div className={styles.emptyTitle}>Nessun materiale</div>
                    <div className={styles.emptyText}>
                        Parla con NUR per aggiungere i tuoi primi materiali
                    </div>
                    <Link href="/chat" className={styles.addButton}>
                        💬 Parla con NUR
                    </Link>
                </div>
            )}
        </div>
    )
}

function MaterialCard({ material, showProgress = false }: { material: Material; showProgress?: boolean }) {
    const rarityInfo = RARITY_INFO[material.rarity]

    const getStatusClass = () => {
        if (!material.is_owned) return styles.needed
        if (material.progress < 100 && material.progress > 0) return styles.inProgress
        return styles.owned
    }

    const getStatusLabel = () => {
        if (!material.is_owned) return '🔒 Da Ottenere'
        if (material.progress < 100 && material.progress > 0) return '⚡ In Corso'
        return '✓ Posseduto'
    }

    const getCategoryIcon = (category: string) => {
        const cat = CATEGORIES.find(c => c.id === category)
        return cat?.icon || '📦'
    }

    return (
        <div className={`${styles.materialCard} ${getStatusClass()}`}>
            <div
                className={`${styles.materialRarity} ${styles[material.rarity]}`}
                title={rarityInfo.label}
            />
            <div className={styles.materialHeader}>
                <div className={styles.materialIcon}>
                    {getCategoryIcon(material.category)}
                </div>
                <div className={styles.materialInfo}>
                    <div className={styles.materialName}>{material.name}</div>
                    <div className={styles.materialCategory}>
                        {getCategoryIcon(material.category)} {CATEGORIES.find(c => c.id === material.category)?.label || material.category}
                    </div>
                </div>
            </div>

            <div className={`${styles.materialStatus} ${getStatusClass()}`}>
                {getStatusLabel()}
            </div>

            {material.description && (
                <div className={styles.materialMeta}>{material.description}</div>
            )}

            {showProgress && (
                <div className={styles.materialProgress}>
                    <div className={styles.materialProgressHeader}>
                        <span className={styles.materialProgressLabel}>Progresso</span>
                        <span className={styles.materialProgressValue}>{material.progress}%</span>
                    </div>
                    <div className={styles.materialProgressBar}>
                        <div
                            className={styles.materialProgressFill}
                            style={{ width: `${material.progress}%` }}
                        />
                    </div>
                </div>
            )}

            {material.linked_goals.length > 0 && (
                <div className={styles.materialLinked}>
                    {material.linked_goals.map(goal => (
                        <span key={goal.id} className={styles.materialLink}>
                            🎯 {goal.title}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}
