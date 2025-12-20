'use client'

import { ReactNode, HTMLAttributes } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode
    variant?: 'default' | 'elevated' | 'bordered' | 'interactive'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    borderLeft?: 'none' | 'purple' | 'gold' | 'green' | 'red' | 'blue'
}

export function Card({
    children,
    variant = 'default',
    padding = 'md',
    borderLeft = 'none',
    className = '',
    ...props
}: CardProps) {
    const classes = [
        styles.card,
        styles[`variant-${variant}`],
        styles[`padding-${padding}`],
        borderLeft !== 'none' ? styles[`border-${borderLeft}`] : '',
        className
    ].filter(Boolean).join(' ')

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    )
}
