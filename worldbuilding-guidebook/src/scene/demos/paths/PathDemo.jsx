import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { Vector3 } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { readToken } from '../../../styles/readToken.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { TerrainMesh } from '../distributions/ScenePieces.jsx'
import { buildPathModel } from './pathModel.js'
import { STEP_SECONDS, terrainCopy, travelSample } from './pathMath.js'
import { residentSample, travelLimit, usePathPlayback } from './playback.js'

function RouteLine({ points, color = '--water-deep', dashed = false, width = 3, diagnostic = false }) {
  if (points.length < 2) return null
  return <Line points={points} color={readToken(color)} lineWidth={width} dashed={dashed} dashSize={0.12} gapSize={0.09} depthTest={!diagnostic} depthWrite={!diagnostic} renderOrder={diagnostic ? 10 : 0} />
}

function Dot({ point, radius = 0.055, color = '--water-deep' }) {
  return <mesh position={point}><sphereGeometry args={[radius, 12, 8]} /><meshStandardMaterial color={readToken(color)} /></mesh>
}

function Cross({ point }) {
  const [x, y, z] = point.toArray()
  return <group>
    <RouteLine points={[[x - 0.08, y + 0.03, z - 0.08], [x + 0.08, y + 0.03, z + 0.08]]} color="--clay-deep" diagnostic />
    <RouteLine points={[[x - 0.08, y + 0.03, z + 0.08], [x + 0.08, y + 0.03, z - 0.08]]} color="--clay-deep" diagnostic />
  </group>
}

function Arrow({ point, tangent, size = 0.18 }) {
  const tip = point.clone().addScaledVector(tangent, size)
  const side = new Vector3(-tangent.z, 0, tangent.x).multiplyScalar(size * 0.45)
  return <RouteLine points={[point.clone().add(side), tip, point.clone().sub(side)]} color="--ink" width={2} />
}

function Landmark({ node }) {
  if (node.label.includes('Waypoint')) return <Dot point={node.point} radius={0.1} color="--moss-deep" />
  const entrance = node.label.includes('Entrance')
  return <group position={node.point}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <ringGeometry args={[0.25, 0.3, 32]} /><meshBasicMaterial color={readToken(entrance ? '--ink-dim' : '--moss-deep')} />
    </mesh>
    <mesh position={[entrance ? -0.3 : 0.3, 0.25, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
      <torusGeometry args={[0.26, 0.08, 8, 16, Math.PI]} />
      <meshStandardMaterial color={readToken(entrance ? '--scatter-rock' : '--moss-deep')} roughness={0.9} />
    </mesh>
  </group>
}

function Resident({ model, demo, params }) {
  const time = usePathPlayback((s) => s.time)
  const sample = residentSample(model, demo, params, time)
  return <group>
    <mesh position={sample.point.clone().add(new Vector3(0, model.radius, 0))}>
      <sphereGeometry args={[model.radius, 20, 12]} /><meshStandardMaterial color={readToken('--summit')} />
    </mesh>
    <Arrow point={sample.point.clone().add(new Vector3(0, model.radius * 2 + 0.08, 0))} tangent={sample.tangent} size={0.4} />
    <mesh position={sample.point.clone().add(new Vector3(0, 0.01, 0))} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[model.radius, model.radius + 0.025, 40]} /><meshBasicMaterial color={readToken('--ink')} />
    </mesh>
  </group>
}

function Clock({ model, demo }) {
  const accumulator = useRef(0)
  useFrame((_, delta) => {
    const state = usePathPlayback.getState()
    if (!state.running || document.hidden) { accumulator.current = 0; return }
    accumulator.current += Math.min(delta, 0.25)
    while (accumulator.current >= STEP_SECONDS) {
      state.advance(travelLimit(model, demo))
      accumulator.current -= STEP_SECONDS
    }
  })
  useEffect(() => {
    const pauseHidden = () => { if (document.hidden) usePathPlayback.getState().pause() }
    document.addEventListener('visibilitychange', pauseHidden)
    return () => document.removeEventListener('visibilitychange', pauseHidden)
  }, [])
  return null
}

export default function PathDemo() {
  const demo = useSceneStore((s) => s.demoKey)
  const params = useSceneStore((s) => s.params)
  const model = useMemo(() => buildPathModel(demo, params), [demo, params])
  const buildGround = useMemo(() => () => terrainCopy(model.ground), [model])
  const contacts = model.candidates
    ? model.candidates.flatMap((candidate) => candidate.validation.contacts)
    : model.validation?.contacts ?? model.penetration?.contacts ?? []
  const moving = ['path-motion', 'path-clearance', 'path-choice'].includes(demo)
  const points = demo === 'path-ground' && params.pathProjection === 'Map'
    ? model.points.map((point) => new Vector3(point.x, model.mapY, point.z)) : model.points

  return <TerrainWorld worldSize={6}>
    <TerrainMesh build={buildGround} />
    {model.rocks.map((rock, index) => <mesh key={index} position={[rock.x, model.ground(rock.x, rock.z) + 0.5, rock.z]} castShadow>
      <cylinderGeometry args={[rock.radius, rock.radius, 1, 24]} />
      <meshStandardMaterial color={readToken('--scatter-rock')} roughness={0.9} flatShading />
    </mesh>)}
    {model.controls && <>
      <RouteLine points={model.controls} color="--ink-dim" dashed width={1} />
      <Dot point={model.controls[1]} color="--ink" radius={0.09} />
    </>}
    {model.candidates?.map((candidate) => <RouteLine key={candidate.id} points={candidate.points} dashed color={candidate.validation.valid ? '--ink-dim' : '--clay-deep'} width={1.5} />)}
    <RouteLine points={points} />
    {contacts.map((segment, index) => <RouteLine key={index} points={segment} color="--clay-deep" width={5} diagnostic />)}
    {contacts.filter((_, index) => index % Math.max(1, Math.floor(contacts.length / 8)) === 0).map((segment, index) => <Cross key={index} point={segment[0].clone().lerp(segment[1], 0.5)} />)}
    {demo === 'path-order' && model.points.slice(1).map((point, index) => <Arrow key={index} point={point.clone().lerp(model.points[index], 0.5)} tangent={point.clone().sub(model.points[index]).normalize()} />)}
    {demo === 'path-motion' && Array.from({ length: 17 }, (_, index) => <Dot key={index} point={travelSample(model.curve, index / 2, params.pathSampling).point} />)}
    {demo === 'path-ground' && <>
      {params.pathProjection === 'Map' && <RouteLine points={model.points} color="--ink-dim" width={2} />}
      <mesh position={[0, model.mapY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} /><meshBasicMaterial color={readToken('--water')} transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {model.points.map((point, index) => <group key={index}>
        <Dot point={point} />
        <RouteLine points={[point, new Vector3(point.x, model.mapY, point.z)]} dashed width={1} color="--ink-dim" />
      </group>)}
      <RouteLine points={model.points.map((point) => new Vector3(point.x, model.mapY, point.z))} dashed width={1} />
    </>}
    {demo === 'path-clearance' && [-1, 1].map((sign) => <RouteLine key={sign} points={model.points.map((p) => new Vector3(p.x, p.y + 0.015, p.z + sign * model.radius))} dashed color="--ink-dim" width={1} />)}
    {demo === 'path-clearance' && params.pathExperiment && [-1, 1].map((sign) => <RouteLine key={`band-${sign}`} points={model.points.map((p) => new Vector3(p.x, model.ground(p.x, sign * params.pathWidth) + 0.07, sign * params.pathWidth))} color="--moss-deep" width={2} />)}
    {demo === 'path-choice' && <mesh position={[0.3, model.ground(0.3, -0.85) + 0.01, -0.85]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1, 48]} /><meshBasicMaterial color={readToken('--clay')} transparent opacity={params.pathDisturbance * 0.45} depthWrite={false} />
    </mesh>}
    {model.nodes.map((node) => <group key={node.label}>
      <Landmark node={node} />
      <Html position={node.point.clone().add(new Vector3(0, 0.5, 0))} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
        <span className="path-marker">{node.label}</span>
      </Html>
    </group>)}
    {moving && <><Resident model={model} demo={demo} params={params} /><Clock model={model} demo={demo} /></>}
  </TerrainWorld>
}
