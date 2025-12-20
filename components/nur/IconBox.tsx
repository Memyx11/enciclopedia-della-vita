'use client'

import { ReactNode } from 'react'
import styles from './IconBox.module.css'

interface IconBoxProps {
    children: ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
    color?: 'purple' | 'gold' | 'green' | 'red' | 'blue' | 'pink' | 'cyan' | 'muted'
    className?: string
}

export function IconBox({
    children,
    size = 'md',
    color = 'purple',
    className = ''
}: IconBoxProps) {
    return (
        <div className={`${styles.iconBox} ${styles[`size-${size}`]} ${styles[`color-${color}`]} ${className}`}>
            {children}
        </div>
    )
}
