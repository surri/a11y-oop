'use client'

import { useSession, signOut } from 'next-auth/react'

export default function UserMenu() {
  const { data: session } = useSession()

  if (!session?.user) return null

  return (
    <div className="flex items-center gap-3 ml-auto">
      <div className="flex items-center gap-2">
        {session.user.avatarUrl ? (
          <img
            src={session.user.avatarUrl}
            alt={session.user.username}
            className="w-7 h-7 rounded-full border border-gray-700"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
            {session.user.username?.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm text-gray-300 hidden sm:inline">
          {session.user.username}
        </span>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors border border-gray-700 hover:border-gray-600 rounded-lg px-2.5 py-1"
      >
        Sign out
      </button>
    </div>
  )
}
