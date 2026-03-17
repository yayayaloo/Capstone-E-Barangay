'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminSetup() {
    const [email, setEmail] = useState('admin@ebarangay.com')
    const [password, setPassword] = useState('admin123')
    const [status, setStatus] = useState('')

    const handleCreateAdmin = async () => {
        setStatus('Creating user...')
        
        // 1. Sign up the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: 'System Administrator',
                    role: 'admin' // Some triggers might use this
                }
            }
        })

        if (authError) {
            setStatus(`Error creating user: ${authError.message}`)
            return
        }

        if (!authData.user) {
            setStatus('Error: User not returned after creation.')
            return
        }

        // Wait a brief moment for the database trigger to create the profile row
        setStatus('User created. Promoting to Admin...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 2. Force the profile role to admin
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', authData.user.id)

        if (updateError) {
            setStatus(`Created user, but failed to promote to Admin: ${updateError.message}`)
        } else {
            setStatus('SUCCESS! Admin account created. You can now login at /login')
        }
    }

    return (
        <div style={{ padding: '4rem', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
            <h2>Secret Admin Generator 🤫</h2>
            <p>This page will create a new admin account for you automatically.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                <input 
                    type="text" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ padding: '0.5rem', background: '#222', color: 'white' }}
                />
                <input 
                    type="text" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ padding: '0.5rem', background: '#222', color: 'white' }}
                />
                <button 
                    onClick={handleCreateAdmin}
                    style={{ padding: '1rem', background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    Create Admin Account
                </button>
            </div>
            
            {status && (
                <div style={{ marginTop: '2rem', padding: '1rem', background: '#333', color: 'white', borderRadius: '8px' }}>
                    {status}
                </div>
            )}
        </div>
    )
}
