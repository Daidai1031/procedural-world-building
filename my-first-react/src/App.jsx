import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import './App.css'

const BACKGROUND_COLOR = '#3e5274'

const CAMERA = {
  position: [6, 5, 8],
  fov: 50,
  near: 0.1,
  far: 200,
  target: [0, 0.75, 0],
}

const ENTITIES = [
  {
    id: 'box',
    name: '立方体 / Box',
    subtitle: '哑光红色 · matte',
    color: '#e2574c',
    position: '[-2.5, 0.75, 0]',
    geometry: 'boxGeometry · 1.5 × 1.5 × 1.5',
    material: 'Standard · roughness 0.65 · metalness 0.05',
    lesson: '较高粗糙度与接近零的金属度，让它成为观察哑光非金属表面的对照组。',
  },
  {
    id: 'sphere',
    name: '球体 / Sphere',
    subtitle: '抛光金属 · polished',
    color: '#7fb2f0',
    position: '[0, 1, 0]',
    geometry: 'sphereGeometry · radius 1 · 48 × 48',
    material: 'Standard · roughness 0.15 · metalness 0.9',
    lesson: '低粗糙度会集中高光；高金属度还需要环境贴图才能得到更完整的反射。',
  },
  {
    id: 'cone',
    name: '圆锥 / Cone',
    subtitle: '黄色无光照材质 · unlit',
    color: '#f2c14e',
    position: '[2.5, 0.9, 0]',
    geometry: 'cylinderGeometry · radii 0 / 0.9 · height 1.8',
    material: 'Basic · ignores all scene lighting',
    lesson: 'MeshBasicMaterial 不响应灯光，是很好的无光照对照；但 mesh 仍然可以投射阴影。',
  },
  {
    id: 'torus',
    name: '环面结 / Torus knot',
    subtitle: '绿色光泽 · glossy',
    color: '#63d297',
    position: '[0, 1, -3]',
    geometry: 'torusKnotGeometry · radius 0.6 · tube 0.2',
    material: 'Standard · roughness 0.25 · metalness 0.4',
    lesson: '复杂曲面比平面更容易展示观察角度变化时的高光移动。',
  },
]

function InfoGroup({ number, title, description, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className={`info-group ${isOpen ? 'is-open' : ''}`}>
      <button
        className="info-group__trigger"
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="info-group__number">{number}</span>
        <span className="info-group__heading">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className="info-group__icon" aria-hidden="true">+</span>
      </button>
      {isOpen && <div className="info-group__content">{children}</div>}
    </section>
  )
}

function InfoRow({ label, value, swatch }) {
  return (
    <div className="info-row">
      <span className="info-row__label">{label}</span>
      <span className="info-row__value">
        {swatch && <i className="color-swatch" style={{ '--swatch': swatch }} />}
        {value}
      </span>
    </div>
  )
}

function LearningPanel({ selectedEntity, onSelectEntity }) {
  const [isVisible, setIsVisible] = useState(true)
  const entity = ENTITIES.find((item) => item.id === selectedEntity) ?? ENTITIES[0]

  if (!isVisible) {
    return (
      <button className="panel-reopen" type="button" onClick={() => setIsVisible(true)}>
        <span>i</span>
        打开学习面板
      </button>
    )
  }

  return (
    <aside className="learning-panel" aria-label="场景学习面板">
      <header className="panel-header">
        <div>
          <span className="panel-kicker">Exercise 02 · 实时参数参考</span>
          <h1>场景结构 / Scene anatomy</h1>
          <p>查看生成当前画面的真实参数。你可以在面板中选择实体，也可以直接点击 3D 物体。</p>
        </div>
        <button
          className="panel-close"
          type="button"
          aria-label="关闭学习面板"
          onClick={() => setIsVisible(false)}
        >
          ×
        </button>
      </header>

      <div className="panel-groups">
        <InfoGroup
          number="01"
          title="实体 / Entities"
          description="几何体、变换与材质"
          defaultOpen
        >
          <div className="entity-picker" role="list" aria-label="场景实体">
            {ENTITIES.map((item) => (
              <button
                className={`entity-card ${item.id === entity.id ? 'is-selected' : ''}`}
                type="button"
                role="listitem"
                key={item.id}
                onClick={() => onSelectEntity(item.id)}
              >
                <i className="entity-card__dot" style={{ '--entity-color': item.color }} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.subtitle}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="entity-detail" style={{ '--entity-color': entity.color }}>
            <div className="entity-detail__title">
              <span>{entity.name}</span>
              <code>{entity.id}</code>
            </div>
            <InfoRow label="位置 Position" value={entity.position} />
            <InfoRow label="几何 Geometry" value={entity.geometry} />
            <InfoRow label="材质 Material" value={entity.material} swatch={entity.color} />
            <p className="learning-note"><strong>观察：</strong> {entity.lesson}</p>
          </div>
        </InfoGroup>

        <InfoGroup number="02" title="世界 / World" description="背景、地面与参考网格">
          <InfoRow label="背景 Background" value={BACKGROUND_COLOR} swatch={BACKGROUND_COLOR} />
          <InfoRow label="阴影地面" value="planeGeometry · 60 × 60" />
          <InfoRow label="阴影材质" value="opacity 0.35" />
          <InfoRow label="网格高度 Grid Y" value="0.01 · 避免 z-fighting" />
          <InfoRow label="小格 / 大格" value="0.5 / 2.5 units" />
          <InfoRow label="渐隐距离" value="35 units" />
          <p className="learning-note"><strong>职责分离：</strong>网格表达空间比例；透明平面负责接收阴影。</p>
        </InfoGroup>

        <InfoGroup number="03" title="灯光 / Lighting" description="补光、天空/地面光与主光">
          <div className="light-card">
            <strong>环境光 Ambient</strong>
            <span>intensity 0.4</span>
            <p>从所有方向均匀补光，不产生阴影。</p>
          </div>
          <div className="light-card">
            <strong>半球光 Hemisphere</strong>
            <span>sky #bcd4ff · ground #4a3b2a · 0.5</span>
            <p>上方冷光、下方暖光，不产生阴影。</p>
          </div>
          <div className="light-card light-card--key">
            <strong>平行光 · 主光</strong>
            <span>position [8, 12, 5] · intensity 2.5</span>
            <p>朝世界原点照射，生成 2048 × 2048 阴影贴图。</p>
          </div>
          <p className="learning-note"><strong>阴影链：</strong>Canvas shadows → 灯光 castShadow → 物体 castShadow → 表面 receiveShadow。</p>
        </InfoGroup>

        <InfoGroup number="04" title="相机 / Camera" description="透视参数与轨道控制器">
          <InfoRow label="位置 Position" value="[6, 5, 8]" />
          <InfoRow label="目标 Target" value="[0, 0.75, 0]" />
          <InfoRow label="视野角 FOV" value="50°" />
          <InfoRow label="裁剪范围" value="near 0.1 · far 200" />
          <InfoRow label="缩放范围" value="3–40 units" />
          <InfoRow label="最大极角" value="87.8° · 保持在地面上方" />
          <div className="gesture-list">
            <span><b>拖动 Drag</b>环绕</span>
            <span><b>滚轮 Wheel</b>缩放</span>
            <span><b>右键拖动</b>平移</span>
          </div>
        </InfoGroup>

        <InfoGroup number="05" title="新增 UI Group" description="复制这个可复用结构">
          <p className="group-instruction"><code>InfoGroup</code> 自己管理展开状态；在内部加入参数行或自定义内容：</p>
          <pre className="code-sample"><code>{`<InfoGroup
  number="06"
  title="Animation"
  description="Frame updates"
>
  <InfoRow
    label="Hook"
    value="useFrame"
  />
</InfoGroup>`}</code></pre>
          <ol className="steps-list">
            <li>在 <code>LearningPanel</code> 中加入新的 group。</li>
            <li>用 <code>InfoRow</code> 显示“标签 / 数值”。</li>
            <li>只有 UI 需要改变 3D 场景时，才从 <code>App</code> 向下传递 state。</li>
          </ol>
        </InfoGroup>
      </div>
    </aside>
  )
}

function SelectableMesh({ id, selectedEntity, onSelectEntity, children, ...props }) {
  const isSelected = selectedEntity === id

  return (
    <mesh
      {...props}
      scale={isSelected ? 1.08 : 1}
      onClick={(event) => {
        event.stopPropagation()
        onSelectEntity(id)
      }}
    >
      {children}
    </mesh>
  )
}

function SampleGeometry({ selectedEntity, onSelectEntity }) {
  return (
    <>
      <SelectableMesh
        id="box"
        selectedEntity={selectedEntity}
        onSelectEntity={onSelectEntity}
        position={[-2.5, 0.75, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#e2574c" roughness={0.65} metalness={0.05} />
      </SelectableMesh>

      <SelectableMesh
        id="sphere"
        selectedEntity={selectedEntity}
        onSelectEntity={onSelectEntity}
        position={[0, 1, 0]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#7fb2f0" roughness={0.15} metalness={0.9} />
      </SelectableMesh>

      <SelectableMesh
        id="cone"
        selectedEntity={selectedEntity}
        onSelectEntity={onSelectEntity}
        position={[2.5, 0.9, 0]}
        castShadow
      >
        <cylinderGeometry args={[0, 0.9, 1.8, 32]} />
        <meshBasicMaterial color="#f2c14e" />
      </SelectableMesh>

      <SelectableMesh
        id="torus"
        selectedEntity={selectedEntity}
        onSelectEntity={onSelectEntity}
        position={[0, 1, -3]}
        castShadow
      >
        <torusKnotGeometry args={[0.6, 0.2, 160, 32]} />
        <meshStandardMaterial color="#63d297" roughness={0.25} metalness={0.4} />
      </SelectableMesh>
    </>
  )
}

export default function App() {
  const [selectedEntity, setSelectedEntity] = useState('box')

  return (
    <main className="app-shell">
      <div className="scene-canvas">
        <Canvas
          shadows
          camera={{
            position: CAMERA.position,
            fov: CAMERA.fov,
            near: CAMERA.near,
            far: CAMERA.far,
          }}
        >
          <color attach="background" args={[BACKGROUND_COLOR]} />

          <ambientLight intensity={0.4} />
          <hemisphereLight args={['#bcd4ff', '#4a3b2a', 0.5]} />
          <directionalLight
            position={[8, 12, 5]}
            intensity={2.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

          <SampleGeometry
            selectedEntity={selectedEntity}
            onSelectEntity={setSelectedEntity}
          />

          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <shadowMaterial opacity={0.35} />
          </mesh>

          <Grid
            position={[0, 0.01, 0]}
            args={[10, 10]}
            infiniteGrid
            cellSize={0.5}
            cellThickness={0.6}
            cellColor="#3a4250"
            sectionSize={2.5}
            sectionThickness={1.2}
            sectionColor="#5c7cfa"
            fadeDistance={35}
            fadeStrength={1}
          />

          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={40}
            maxPolarAngle={Math.PI / 2.05}
            target={CAMERA.target}
          />
        </Canvas>
      </div>

      <div className="scene-hud" aria-hidden="true">
        <span className="scene-hud__eyebrow">R3F · 材质练习</span>
        <strong>已选择：{ENTITIES.find((item) => item.id === selectedEntity)?.name}</strong>
      </div>

      <LearningPanel
        selectedEntity={selectedEntity}
        onSelectEntity={setSelectedEntity}
      />
    </main>
  )
}
