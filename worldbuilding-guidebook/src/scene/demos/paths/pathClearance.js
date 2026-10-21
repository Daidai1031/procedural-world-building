import { Vector3 } from 'three'

export function segmentClearance(a, b, rock) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const denominator = dx * dx + dz * dz
  const t = denominator ? Math.max(0, Math.min(1, ((rock.x - a.x) * dx + (rock.z - a.z) * dz) / denominator)) : 0
  return Math.hypot(a.x + dx * t - rock.x, a.z + dz * t - rock.z) - rock.radius
}

// The actor is a ground disc; rocks are vertical cylinders, not cave geometry.
export function validateRoute(points, radius, rocks, ground = () => 0.12, maxSlope = 0.8) {
  let distance = 0
  let safeDistance = 0
  let reason = ''
  const contacts = []
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    const length = a.distanceTo(b)
    // #region body-clearance
    const blocked = rocks.some((rock) => segmentClearance(a, b, rock) < radius)
    // #endregion
    const samples = Math.max(2, Math.ceil(length / 0.02))
    let unsupported = false
    for (let sample = 0; sample <= samples; sample += 1) {
      const p = new Vector3().lerpVectors(a, b, sample / samples)
      const h = ground(p.x, p.z)
      unsupported ||= !Number.isFinite(h) || Math.abs(p.y - h - 0.06) > 0.1
    }
    const slope = Math.abs(b.y - a.y) / Math.max(0.00001, Math.hypot(b.x - a.x, b.z - a.z))
    const failure = blocked ? 'Blocked' : unsupported ? 'No support' : slope > maxSlope ? 'Too steep' : ''
    if (failure) {
      contacts.push([a, b])
      if (!reason) reason = failure
    }
    distance += length
    if (!reason) safeDistance = distance
  }
  return { valid: !reason, reason, safeDistance: Math.max(0, safeDistance - (reason ? 0.04 : 0)), contacts, length: distance }
}

export function disturbanceCost(points, intensity) {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const p = points[index].clone().lerp(points[index - 1], 0.5)
    const exposure = Math.exp(-((p.x - 0.3) ** 2 + (p.z + 0.85) ** 2) / 1.5)
    total += exposure * intensity * points[index].distanceTo(points[index - 1])
  }
  return total
}

export function rankRoutes(candidates) {
  // #region valid-before-ranking
  const valid = candidates.filter((candidate) => candidate.validation.valid)
  return valid.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id))
  // #endregion
}
