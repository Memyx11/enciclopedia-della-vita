'use client'

import { useState, useRef, useCallback } from 'react'

interface FileUploadProps {
    userId: string
    objectiveId?: string | null
    onUploadComplete?: (material: any) => void
    onUploadError?: (error: string) => void
    className?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function FileUpload({
    userId,
    objectiveId,
    onUploadComplete,
    onUploadError,
    className = ''
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFile(files[0])
        }
    }, [userId, objectiveId])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            handleFile(files[0])
        }
    }, [userId, objectiveId])

    const handleFile = async (file: File) => {
        setError(null)

        // Validazione dimensione
        if (file.size > MAX_FILE_SIZE) {
            const errMsg = `File troppo grande. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`
            setError(errMsg)
            onUploadError?.(errMsg)
            return
        }

        setIsUploading(true)
        setUploadProgress(10)

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('userId', userId)
            if (objectiveId) {
                formData.append('objectiveId', objectiveId)
            }
            formData.append('title', file.name)

            setUploadProgress(30)

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            setUploadProgress(80)

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Upload fallito')
            }

            setUploadProgress(100)

            // Success!
            setTimeout(() => {
                setIsUploading(false)
                setUploadProgress(0)
                onUploadComplete?.(result.material)
            }, 500)

        } catch (err: any) {
            setError(err.message)
            onUploadError?.(err.message)
            setIsUploading(false)
            setUploadProgress(0)
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const openFilePicker = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className={`file-upload-container ${className}`}>
            <div
                className={`file-upload-dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={openFilePicker}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.mp4,.json"
                    style={{ display: 'none' }}
                />

                {isUploading ? (
                    <div className="upload-progress">
                        <div className="progress-icon">📤</div>
                        <div className="progress-text">Caricamento...</div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <div className="progress-percent">{uploadProgress}%</div>
                    </div>
                ) : (
                    <div className="upload-content">
                        <div className="upload-icon">
                            {isDragging ? '📥' : '📁'}
                        </div>
                        <div className="upload-text">
                            {isDragging
                                ? 'Rilascia qui!'
                                : 'Trascina un file o clicca per caricare'}
                        </div>
                        <div className="upload-hint">
                            PDF, DOC, TXT, immagini, video - Max 10MB
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="upload-error">
                    <span>⚠️</span> {error}
                </div>
            )}

            <style jsx>{`
                .file-upload-container {
                    width: 100%;
                }

                .file-upload-dropzone {
                    border: 2px dashed rgba(139, 92, 246, 0.3);
                    border-radius: 16px;
                    padding: 32px 24px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    background: rgba(139, 92, 246, 0.05);
                }

                .file-upload-dropzone:hover {
                    border-color: rgba(139, 92, 246, 0.5);
                    background: rgba(139, 92, 246, 0.1);
                }

                .file-upload-dropzone.dragging {
                    border-color: #8b5cf6;
                    background: rgba(139, 92, 246, 0.2);
                    transform: scale(1.02);
                }

                .file-upload-dropzone.uploading {
                    pointer-events: none;
                    border-color: rgba(139, 92, 246, 0.5);
                }

                .upload-content,
                .upload-progress {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }

                .upload-icon,
                .progress-icon {
                    font-size: 2.5rem;
                    margin-bottom: 8px;
                }

                .upload-text,
                .progress-text {
                    font-size: 0.9375rem;
                    font-weight: 600;
                    color: #f5f5f7;
                }

                .upload-hint {
                    font-size: 0.75rem;
                    color: #a0a0b0;
                }

                .progress-bar {
                    width: 100%;
                    max-width: 200px;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    overflow: hidden;
                    margin-top: 8px;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #8b5cf6, #d946ef);
                    transition: width 0.3s ease;
                }

                .progress-percent {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.75rem;
                    color: #8b5cf6;
                    font-weight: 700;
                }

                .upload-error {
                    margin-top: 12px;
                    padding: 10px 14px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 8px;
                    color: #ef4444;
                    font-size: 0.8125rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
            `}</style>
        </div>
    )
}
