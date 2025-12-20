'use client'

import { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
    children: ReactNode
    variant?: 'purple' | 'gold' | 'green' | 'red' | 'blue' | 'muted'
    size?: 'sm' | 'md'
    icon?: string
    className?: string
}

export function Badge({
    children,
    variant = 'purple',
    size = 'md',
    icon,
    className = ''
}: BadgeProps) {
    return (
        <span className={`${styles.badge} ${styles[`variant-${variant}`]} ${styles[`size-${size}`]} ${className}`}>
            {icon && <span className={styles.icon}>{icon}</span>}
            {children}
        </span>
    )
}
