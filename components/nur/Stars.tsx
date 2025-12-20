'use client'

import styles from './Stars.module.css'

interface StarsProps {
    value: number
    max?: number
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function Stars({
    value,
    max = 5,
    size = 'md',
    className = ''
}: StarsProps) {
    return (
        <div className={`${styles.stars} ${styles[`size-${size}`]} ${className}`}>
            {Array.from({ length: max }, (_, i) => (
                <span
                    key={i}
                    className={`${styles.star} ${i < value ? styles.filled : styles.empty}`}
                >
                    {'\u2605'}
                </span>
            ))}
        </div>
    )
}
