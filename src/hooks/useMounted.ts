import { useEffect, useState } from "react"

// Mounting guard to avoid hydration / blank-state issues when reading
// client-only wallet state.
export function useMounted() {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  return isMounted
}
