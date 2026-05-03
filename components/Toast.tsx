'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import styles from './Toast.module.css'

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
    id: number
    text: string
    type: ToastType
}

interface ToastContextType {
    showToast: (text: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const showToast = useCallback((text: string, type: ToastType = 'info') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, text, type }])
    }, [])

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className={styles.toastContainer}>
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(toast.id), 4000)
        return () => clearTimeout(timer)
    }, [toast.id, onRemove])

    const icons: Record<ToastType, string> = {
        success: '',
        error: '',
        info: '',
    }

    return (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
            <span className={styles.icon}>{icons[toast.type]}</span>
            <span className={styles.text}>{toast.text}</span>
            <button className={styles.close} onClick={() => onRemove(toast.id)}>✕</button>
        </div>
    )
}
