import jwt from 'jsonwebtoken'

export interface TokenPayload {
  userId: string
  role: string
}

export function createAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: '15m' }
  )
}

export function createRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: '30d' }
  )
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as TokenPayload
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as TokenPayload
}