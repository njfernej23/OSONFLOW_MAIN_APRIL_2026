"use client"

import { useEffect, useRef } from "react"
import { useSetAtom } from "jotai"

import {
  membersIdentityKey,
  useLiveblocksPresence,
} from "../hooks/use-liveblocks-presence"
import {
  livePresenceConnectedAtom,
  livePresenceMembersAtom,
  livePresenceUpdatersRef,
} from "../lib/live-presence-store"

/** Mount only inside a Liveblocks RoomProvider. */
export function LivePresenceBridge() {
  const { members, updateCursor, updateSelectedNode, isConnected } =
    useLiveblocksPresence()
  const setLiveMembers = useSetAtom(livePresenceMembersAtom)
  const setConnected = useSetAtom(livePresenceConnectedAtom)
  const lastMembersKeyRef = useRef<string | null>(null)

  useEffect(() => {
    livePresenceUpdatersRef.current = {
      updateCursor,
      updateSelectedNode,
    }
  }, [updateCursor, updateSelectedNode])

  useEffect(() => {
    setConnected(isConnected)
  }, [isConnected, setConnected])

  useEffect(() => {
    const key = membersIdentityKey(members)
    if (lastMembersKeyRef.current === key) {
      return
    }
    lastMembersKeyRef.current = key
    setLiveMembers(members)
  }, [members, setLiveMembers])

  useEffect(() => {
    return () => {
      livePresenceUpdatersRef.current = null
      lastMembersKeyRef.current = null
      setLiveMembers(null)
      setConnected(false)
    }
  }, [setConnected, setLiveMembers])

  return null
}
