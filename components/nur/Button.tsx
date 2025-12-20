'use client'

import { ReactNode, ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    fullWidth?: boolean
    loading?: boolean
    icon?: ReactNode
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    icon,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const classes = [
        styles.button,
        styles[`variant-${variant}`],
        styles[`size-${size}`],
        fullWidth ? styles.fullWidth : '',
        loading ? styles.loading : '',
        className
    ].filter(Boolean).join(' ')

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className={styles.spinner} />
            ) : icon ? (
                <span className={styles.icon}>{icon}</span>
            ) : null}
            <span>{children}</span>
        </button>
    )
}
