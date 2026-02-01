import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { Modal } from '../ui/Modal'
import { supabase } from '../../lib/supabase'
import { useUIStore } from '../../stores/uiStore'
import { photoPrompts } from '../../data/photoPrompts'

// Storage limit constants
const STORAGE_LIMIT_GB = 1
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024

// Format bytes to human readable
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function PhotoGalleryPanel() {
  const [photos, setPhotos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [isSendingPrompt, setIsSendingPrompt] = useState(false)
  const [storageUsed, setStorageUsed] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchAllPhotos()
    fetchStorageUsage()

    // Real-time subscription
    const channel = supabase
      .channel('photos-admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
        },
        () => {
          fetchAllPhotos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAllPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          users (id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPhotos(data || [])
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStorageUsage = async () => {
    try {
      const { data, error } = await supabase.storage.from('photos').list('', {
        limit: 1000,
        offset: 0,
      })
      if (error) throw error

      // Sum all file sizes
      const totalBytes = data?.reduce((acc, file) => acc + (file.metadata?.size || 0), 0) || 0
      setStorageUsed(totalBytes)
    } catch (error) {
      console.error('Error fetching storage usage:', error)
    }
  }

  const handleSendPromptToAll = async () => {
    setIsSendingPrompt(true)

    try {
      // Get all non-admin users (V3.0 fix: use is_admin field instead of role)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('is_admin', false)

      if (usersError) throw usersError

      if (!users || users.length === 0) {
        showToast('error', 'No users to send prompt to')
        return
      }

      // Get random prompt
      const randomPrompt = photoPrompts[Math.floor(Math.random() * photoPrompts.length)]

      // Send notification to all users
      // Using 'admin_message' type (photo_prompt not in DB CHECK constraint)
      const notifications = users.map((user) => ({
        user_id: user.id,
        type: 'admin_message',
        title: '📸 Photo Challenge!',
        message: `${randomPrompt.emoji} ${randomPrompt.text}`,
        data: {
          prompt_id: randomPrompt.id,
          prompt_text: randomPrompt.text,
          prompt_emoji: randomPrompt.emoji,
          notification_type: 'photo_prompt',
        },
      }))

      const { error: notifError } = await supabase.from('notifications').insert(notifications)

      if (notifError) throw notifError

      showToast('success', `📸 Photo prompt sent to ${users.length} guests!`)
    } catch (error) {
      console.error('Error sending prompt:', error)
      showToast('error', 'Failed to send photo prompt')
    } finally {
      setIsSendingPrompt(false)
    }
  }

  const handleDownloadPhoto = (photoUrl) => {
    window.open(photoUrl, '_blank')
  }

  const handleDownloadZip = async () => {
    if (photos.length === 0) {
      showToast('error', 'No photos to download')
      return
    }

    setIsDownloading(true)

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        const response = await fetch(photo.photo_url)
        const blob = await response.blob()

        const userName = (photo.users?.name || 'unknown').replace(/[^a-z0-9]/gi, '_')
        const promptText = (photo.prompt_text || 'photo').slice(0, 20).replace(/[^a-z0-9]/gi, '_')
        const timestamp = new Date(photo.created_at).getTime()
        const filename = `${userName}_${promptText}_${timestamp}.jpg`

        zip.file(filename, blob)
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `sasha-party-photos-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)

      showToast('success', `📦 Downloaded ${photos.length} photos!`)
    } catch (error) {
      console.error('Error creating ZIP:', error)
      showToast('error', 'Failed to create ZIP')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleClearStorage = async () => {
    if (!confirm('⚠️ Delete all photo FILES from storage? Database records will remain but photos will show as broken images. Continue?')) {
      return
    }

    setIsClearing(true)

    try {
      const { data: files, error: listError } = await supabase.storage
        .from('photos')
        .list('', { limit: 1000 })

      if (listError) throw listError

      if (!files || files.length === 0) {
        showToast('info', 'Storage is already empty')
        setIsClearing(false)
        return
      }

      const filePaths = files.map(f => f.name)
      const { error: deleteError } = await supabase.storage
        .from('photos')
        .remove(filePaths)

      if (deleteError) throw deleteError

      setStorageUsed(0)
      showToast('success', `🗑️ Cleared ${files.length} files from storage!`)
    } catch (error) {
      console.error('Error clearing storage:', error)
      showToast('error', 'Failed to clear storage')
    } finally {
      setIsClearing(false)
    }
  }

  const photosByUser = photos.reduce((acc, photo) => {
    const userId = photo.user_id
    if (!acc[userId]) {
      acc[userId] = {
        userName: photo.users?.name || 'Unknown',
        photos: [],
      }
    }
    acc[userId].photos.push(photo)
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats & Actions */}
      <Card className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-500/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-400 text-sm">Total Photos</p>
            <p className="text-white text-3xl font-bold">{photos.length}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm text-right">Participants</p>
            <p className="text-white text-3xl font-bold">{Object.keys(photosByUser).length}</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSendPromptToAll}
          loading={isSendingPrompt}
        >
          📸 SEND PHOTO PROMPT TO ALL
        </Button>

        <p className="text-slate-400 text-xs mt-3 text-center">
          Sends a random photo challenge to all guests
        </p>
      </Card>

      {/* Storage Management */}
      <Card className="mb-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">Storage Used</span>
          <span className="text-white text-sm font-medium">
            {formatBytes(storageUsed)} / {STORAGE_LIMIT_GB} GB
          </span>
        </div>

        <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all ${
              storageUsed / STORAGE_LIMIT_BYTES > 0.9
                ? 'bg-red-500'
                : storageUsed / STORAGE_LIMIT_BYTES > 0.7
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min((storageUsed / STORAGE_LIMIT_BYTES) * 100, 100)}%` }}
          />
        </div>

        <p className="text-slate-500 text-xs mb-4">
          {((storageUsed / STORAGE_LIMIT_BYTES) * 100).toFixed(1)}% of free tier used
        </p>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleDownloadZip}
            loading={isDownloading}
            disabled={photos.length === 0}
            className="flex-1"
          >
            📦 Download ZIP ({photos.length})
          </Button>

          <Button
            variant="danger"
            onClick={handleClearStorage}
            loading={isClearing}
            disabled={storageUsed === 0}
            className="flex-1"
          >
            🗑️ Clear Storage
          </Button>
        </div>
      </Card>

      {/* Photos by User */}
      {Object.keys(photosByUser).length === 0 ? (
        <Card className="text-center py-8">
          <span className="text-5xl block mb-4">📷</span>
          <p className="text-white/60">No photos submitted yet</p>
        </Card>
      ) : (
        Object.entries(photosByUser).map(([userId, { userName, photos: userPhotos }]) => (
          <Card key={userId}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{userName}</h3>
              <Badge variant="purple" size="sm">
                {userPhotos.length} photo{userPhotos.length !== 1 && 's'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {userPhotos.map((photo) => {
                const prompt = photoPrompts.find((p) => p.id === photo.prompt_id)
                return (
                  <div
                    key={photo.id}
                    className="relative aspect-square cursor-pointer group"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.prompt_text}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <span className="text-white text-xs text-center px-2">
                        {prompt?.emoji} {photo.prompt_text}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ))
      )}

      {/* Photo Detail Modal */}
      <Modal
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        title="Photo Details"
      >
        {selectedPhoto && (
          <div className="space-y-4">
            <img
              src={selectedPhoto.photo_url}
              alt={selectedPhoto.prompt_text}
              className="w-full rounded-lg"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">User</span>
                <span className="text-white font-medium">{selectedPhoto.users?.name}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Prompt</span>
                <span className="text-white text-sm">{selectedPhoto.prompt_text}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Submitted</span>
                <span className="text-white text-sm">
                  {new Date(selectedPhoto.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Reward</span>
                <Badge variant="coin" size="sm">
                  +5🪙
                </Badge>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleDownloadPhoto(selectedPhoto.photo_url)}
              >
                💾 Download
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setSelectedPhoto(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
