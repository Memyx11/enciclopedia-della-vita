/**
 * File Upload API Route
 * Gestisce upload di file su Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Configurazione
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
    // Documenti
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    // Immagini
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    // Video (per ora solo mp4)
    'video/mp4',
    // Altri
    'application/json',
]

const MIME_TO_TYPE: Record<string, string> = {
    'application/pdf': 'document',
    'application/msword': 'document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    'text/plain': 'document',
    'text/markdown': 'document',
    'image/png': 'image',
    'image/jpeg': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'video/mp4': 'video',
    'application/json': 'document',
}

const TYPE_ICONS: Record<string, string> = {
    'document': '📄',
    'image': '🖼️',
    'video': '🎬',
}

/**
 * POST - Upload file
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const userId = formData.get('userId') as string | null
        const objectiveId = formData.get('objectiveId') as string | null
        const title = formData.get('title') as string | null
        const description = formData.get('description') as string | null

        // Validazioni
        if (!file) {
            return NextResponse.json(
                { error: 'File mancante' },
                { status: 400 }
            )
        }

        if (!userId) {
            return NextResponse.json(
                { error: 'userId mancante' },
                { status: 400 }
            )
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File troppo grande. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            )
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Tipo file non supportato: ${file.type}` },
                { status: 400 }
            )
        }

        // Genera nome file unico
        const timestamp = Date.now()
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `${userId}/${timestamp}_${safeFileName}`

        // Upload su Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('user-files')
            .upload(filePath, file, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json(
                { error: `Upload fallito: ${uploadError.message}` },
                { status: 500 }
            )
        }

        // Ottieni URL pubblico
        const { data: urlData } = supabase.storage
            .from('user-files')
            .getPublicUrl(filePath)

        // Determina tipo materiale
        const materialType = MIME_TO_TYPE[file.type] || 'document'
        const icon = TYPE_ICONS[materialType] || '📄'

        // Salva in task_materials
        const { data: material, error: dbError } = await supabase
            .from('task_materials')
            .insert({
                clerk_user_id: userId,
                objective_id: objectiveId || null,
                title: title || file.name,
                description: description || null,
                material_type: materialType,
                url: urlData.publicUrl,
                file_path: filePath,
                file_size: file.size,
                file_mime_type: file.type,
                icon: icon,
                created_by: 'user',
                sort_order: 0
            })
            .select()
            .single()

        if (dbError) {
            console.error('DB error:', dbError)
            // Prova a eliminare il file caricato
            await supabase.storage.from('user-files').remove([filePath])
            return NextResponse.json(
                { error: `Errore database: ${dbError.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            material: material,
            url: urlData.publicUrl
        })

    } catch (error: any) {
        console.error('Upload Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * DELETE - Elimina file
 */
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const materialId = searchParams.get('materialId')
        const userId = searchParams.get('userId')

        if (!materialId || !userId) {
            return NextResponse.json(
                { error: 'Parametri mancanti' },
                { status: 400 }
            )
        }

        // Trova il materiale
        const { data: material } = await supabase
            .from('task_materials')
            .select('file_path')
            .eq('id', materialId)
            .eq('clerk_user_id', userId)
            .single()

        if (!material) {
            return NextResponse.json(
                { error: 'Materiale non trovato' },
                { status: 404 }
            )
        }

        // Elimina da storage (se ha file_path)
        if (material.file_path) {
            await supabase.storage
                .from('user-files')
                .remove([material.file_path])
        }

        // Elimina da DB
        await supabase
            .from('task_materials')
            .delete()
            .eq('id', materialId)
            .eq('clerk_user_id', userId)

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Delete Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
