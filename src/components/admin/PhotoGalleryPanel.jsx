import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { Modal } from '../ui/Modal'
import { supabase } from '../../lib/supabase'
import { useUIStore } from '../../stores/uiStore'
import { photoPrompts } from '../../data/photoPrompts'

export function PhotoGalleryPanel() {
  const [photos, setPhotos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [isSendingPrompt, setIsSendingPrompt] = useState(false)

  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchAllPhotos()

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

  const handleSendPromptToAll = async () => {
    setIsSendingPrompt(true)

    try {
      // Get all non-admin users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .neq('role', 'admin')

      if (usersError) throw usersError

      if (!users || users.length === 0) {
        showToast('error', 'No users to send prompt to')
        return
      }

      // Get random prompt
      const randomPrompt = photoPrompts[Math.floor(Math.random() * photoPrompts.length)]

      // Send notification to all users
      const notifications = users.map((user) => ({
        user_id: user.id,
        type: 'photo_prompt',
        title: '📸 Photo Challenge!',
        message: `${randomPrompt.emoji} ${randomPrompt.text}`,
        data: {
          prompt_id: randomPrompt.id,
          prompt_text: randomPrompt.text,
          prompt_emoji: randomPrompt.emoji,
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
