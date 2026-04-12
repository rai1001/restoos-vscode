import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

let redis: Redis | null = null
let authLimiter: Ratelimit | null = null
let aiLimiter: Ratelimit | null = null
let generalLimiter: Ratelimit | null = null

function getRedis() {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) return null
    redis = new Redis({ url, token })
  }
  return redis
}

function getAuthLimiter() {
  if (!authLimiter) {
    const r = getRedis()
    if (!r) return null
    authLimiter = new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(10, "1 m") })
  }
  return authLimiter
}

function getAiLimiter() {
  if (!aiLimiter) {
    const r = getRedis()
    if (!r) return null
    aiLimiter = new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(20, "1 m") })
  }
  return aiLimiter
}

function getGeneralLimiter() {
  if (!generalLimiter) {
    const r = getRedis()
    if (!r) return null
    generalLimiter = new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(60, "1 m") })
  }
  return generalLimiter
}

type RateLimitTier = "auth" | "ai" | "general"

const RATE_LIMIT_RESPONSE = NextResponse.json(
  { error: "Demasiadas solicitudes. Espera un momento." },
  { status: 429 }
)

/**
 * Check rate limit for a request.
 * Returns null if allowed, or a 429 NextResponse if rate limited.
 * Gracefully degrades (allows request) if Upstash is not configured.
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "general"
): Promise<NextResponse | null> {
  const limiter =
    tier === "auth" ? getAuthLimiter() :
    tier === "ai" ? getAiLimiter() :
    getGeneralLimiter()

  // If Upstash not configured, allow request (graceful degradation)
  if (!limiter) return null

  const { success } = await limiter.limit(identifier)
  return success ? null : RATE_LIMIT_RESPONSE
}
