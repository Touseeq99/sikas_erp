'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

export default function Header() {
  const [userRole, setUserRole] = useState<string>('admin')
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()
        if (data) setUserRole(data.role)
      }
    }
    getUserRole()
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{currentTime}</p>
      </div>
      <div className="flex items-center space-x-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
        </span>
        <button className="p-2 text-gray-500 hover:text-gray-700">
          <span>🔔</span>
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700">
          <span>⚙️</span>
        </button>
      </div>
    </header>
  )
}
