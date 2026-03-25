import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'cleanAfrica-prime-performance-2026-secret-key'

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, nom: user.nom },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  try {
    const token = header.split(' ')[1]
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié' })
    if (roles.length > 0 && !roles.includes(req.user.role) && req.user.role !== 'DAF') {
      return res.status(403).json({ error: 'Accès refusé pour ce rôle' })
    }
    next()
  }
}
