'use client'

import styles from './ProgressBar.module.css'

interface ProgressBarProps {
    value: number
    max?: number
    color?: 'purple' | 'gold' | 'green' | 'red' | 'blue' | 'gradient'
    size?: 'sm' | 'md' | 'lg'
    showLabel?: boolean
    label?: string
    className?: string
}

export function ProgressBar({
    value,
    max = 100,
    color = 'purple',
    size = 'md',
    showLabel = false,
    label,
    className = ''
}: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
        <div className={`${styles.wrapper} ${className}`}>
            {(showLabel || label) && (
                <div className={styles.header}>
                    {label && <span className={styles.label}>{label}</span>}
                    {showLabel && (
                        <span className={`${styles.value} mono`}>
                            {Math.round(percentage)}%
                        </span>
                    )}
                </div>
            )}
            <div className={`${styles.bar} ${styles[`size-${size}`]}`}>
                <div
                    className={`${styles.fill} ${styles[`color-${color}`]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}
