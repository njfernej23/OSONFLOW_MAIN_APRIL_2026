"use client"

import type { CSSProperties } from "react"

import { useLiveblocksPresence } from "../hooks/use-liveblocks-presence"

/** Renders live avatars directly from Liveblocks (must be inside RoomProvider). */
export function LiveCollaboratorAvatars() {
  const { members, isConnected } = useLiveblocksPresence()

  if (!isConnected && members.length === 0) {
    return null
  }

  const visible = members.slice(0, 3)
  const hiddenCount = Math.max(0, members.length - 3)

  return (
    <>
      {visible.map((member) => (
        <span
          key={member.userId}
          className={`collaborator-avatar ${member.isSelf ? "self" : ""}`}
          title={`${member.name}${member.isSelf ? " (you)" : ""}`}
          style={{ "--avatar-color": member.color } as CSSProperties}
        >
          <span>{member.initials}</span>
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span
          className="collaborator-avatar overflow"
          title={`${hiddenCount} more`}
        >
          +{hiddenCount}
        </span>
      ) : null}
    </>
  )
}
