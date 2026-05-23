'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { api, ApiResponse } from '@/lib/apiClient'
import Image from 'next/image'

interface AvatarUploadProps {
  currentAvatarUrl?: string
  userName?: string
  onUploadSuccess: (newAvatarUrl: string) => void
}

export function AvatarUpload({ currentAvatarUrl, userName, onUploadSuccess }: AvatarUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
      // Create local preview
      const objectUrl = URL.createObjectURL(selected)
      setPreview(objectUrl)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      setResult(null)

      const formData = new FormData()
      formData.append('avatar', file)

      console.log('Sending file to backend:', file.name, file.type, file.size)

      // Use axios (apiClient) WITHOUT manually setting Content-Type to multipart/form-data
      // so the browser can automatically set the boundary!
      const response = await api.post<ApiResponse<{ profilePicture: string }>>(
        '/api/uploads/avatar',
        formData
      )

      if (response.success && response.data?.profilePicture) {
        console.log('Cloudinary upload success:', response.data.profilePicture)
        setResult({ success: 'Avatar updated successfully!' })
        // Clear local preview
        setPreview(null)
        setFile(null)
        // Notify parent
        onUploadSuccess(response.data.profilePicture)
      } else {
        throw new Error(response.message || 'Upload failed')
      }
    } catch (err: unknown) {
      console.error('Upload error:', err)
      setResult({ error: err instanceof Error ? err.message : 'An unknown error occurred during upload.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-display font-semibold mb-6 text-white">Profile Avatar</h2>
      
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
        
        {/* Display Area */}
        <div className="relative shrink-0 w-32 h-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden bg-black/50 group">
          {preview ? (
            <Image src={preview} alt="Local Preview" fill className="object-cover" />
          ) : currentAvatarUrl ? (
            <Image src={currentAvatarUrl} alt="Current Avatar" fill className="object-cover" />
          ) : (
            <div className="text-white/40 flex flex-col items-center">
              <span className="text-4xl font-display font-medium">
                {userName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
              <Loader2 className="animate-spin text-cyan-400" size={24} />
            </div>
          )}
          
          <div 
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-0"
          >
            <Upload size={20} className="text-white/70 mb-1" />
            <span className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">Change</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col w-full max-w-sm gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
          />
          
          <div className="text-sm text-white/50 mb-1">
            Upload a new avatar. Recommended size: 400x400px.
            <br/>Accepted formats: JPG, PNG, WEBP (Max 5MB).
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 py-2 px-4 rounded-lg border border-white/20 hover:bg-white/5 transition-colors disabled:opacity-50 text-sm font-semibold text-white/80"
            >
              Select Image
            </button>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 py-2 px-4 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:bg-white/20 disabled:text-white/50 flex items-center justify-center gap-2 text-sm"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Uploading
                </>
              ) : (
                <>
                  <Upload size={16} /> Save Avatar
                </>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {result?.error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-2 text-sm"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{result.error}</p>
            </motion.div>
          )}

          {result?.success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="w-full p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2 text-sm"
            >
              <CheckCircle size={16} />
              <span className="font-semibold">{result.success}</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
