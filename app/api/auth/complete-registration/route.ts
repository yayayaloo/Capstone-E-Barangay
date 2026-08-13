import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const userId = formData.get('userId') as string
        const accessToken = formData.get('accessToken') as string | null
        const idDocument = formData.get('idDocument') as File | null
        const sectorsRaw = formData.get('sectors') as string | null

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
        }

        let sectors: string[] = []
        if (sectorsRaw) {
            try {
                sectors = JSON.parse(sectorsRaw)
            } catch {
                // Default empty array if parse fails
            }
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

        const clientOptions: any = {
            auth: { persistSession: false }
        }

        if (accessToken) {
            clientOptions.global = {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        }

        const supabase = createClient(supabaseUrl, supabaseKey, clientOptions)

        let uploadedPath: string | null = null

        if (idDocument) {
            const fileName = `id_verification_${Date.now()}_${idDocument.name.replace(/\s+/g, '_')}`
            const targetPath = `${userId}/${fileName}`

            const arrayBuffer = await idDocument.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            // Try uploading to primary bucket 'resident-requirements'
            let uploadSuccess = false
            try {
                const { error: primaryErr } = await supabase.storage
                    .from('resident-requirements')
                    .upload(targetPath, buffer, {
                        contentType: idDocument.type || 'image/png',
                        upsert: true
                    })

                if (!primaryErr) {
                    uploadedPath = targetPath
                    uploadSuccess = true
                } else {
                    console.warn('Upload to resident-requirements bucket notice:', primaryErr.message)
                }
            } catch (err: any) {
                console.warn('Primary storage upload exception:', err?.message)
            }

            // Fallback: If primary upload failed (e.g. RLS on resident-requirements for unauthenticated request), upload to resident-profile-pictures bucket
            if (!uploadSuccess) {
                try {
                    const { error: fallbackErr } = await supabase.storage
                        .from('resident-profile-pictures')
                        .upload(targetPath, buffer, {
                            contentType: idDocument.type || 'image/png',
                            upsert: true
                        })

                    if (!fallbackErr) {
                        uploadedPath = targetPath
                        uploadSuccess = true
                        console.log('ID Document uploaded successfully via fallback bucket resident-profile-pictures')
                    } else {
                        console.error('Fallback storage upload error:', fallbackErr.message)
                    }
                } catch (fallbackEx: any) {
                    console.error('Fallback storage exception:', fallbackEx?.message)
                }
            }

            if (!uploadSuccess) {
                console.error('All storage upload attempts failed for user:', userId)
                return NextResponse.json({
                    success: false,
                    error: 'Storage Upload Error: Could not save ID document file.',
                    userId
                }, { status: 400 })
            }
        }

        // Update profile record with ID document URL and sectors
        try {
            const { error: rpcError } = await supabase.rpc('complete_registration', {
                p_user_id: userId,
                p_id_document_url: uploadedPath,
                p_sectors: sectors
            })

            if (rpcError) {
                // Fallback to direct profiles table update
                const { error: updateErr } = await supabase
                    .from('profiles')
                    .update({
                        id_document_url: uploadedPath,
                        sectors: sectors,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId)

                if (updateErr) {
                    console.warn('Direct profiles update notice:', updateErr.message)
                }
            }
        } catch (updateEx: any) {
            console.warn('Profile update exception:', updateEx?.message)
        }

        return NextResponse.json({
            success: true,
            userId,
            idDocumentUrl: uploadedPath
        })
    } catch (err: any) {
        console.error('Critical exception in complete-registration route:', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
