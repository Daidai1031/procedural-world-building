import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createDrifter, drifterClipNames, drifterClipInfo } from '../../tiny-dent/src/render/models/drifter'

const viewer = document.querySelector('[data-drifter]')

if (viewer) {
  let initialized = false
  let visible = false
  let resume = () => {}
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible && !initialized) {
      initialized = true
      init()
    }
    resume()
  }, { rootMargin: '100px' }).observe(viewer)

  function init() {
    const canvas = viewer.querySelector('canvas')
    const status = viewer.querySelector('[role="status"]')
    const select = viewer.querySelector('select')
    const play = viewer.querySelector('[data-drifter-play]')
    const joints = viewer.querySelector('[data-drifter-joints]')
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    } catch {
      status.textContent = 'The 3D preview needs WebGL. Open the rig details to explore the character.'
      return
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight('#fff5e4', '#827e70', 2))
    const key = new THREE.DirectionalLight('#fff7e9', 3)
    key.position.set(-3, 6, 5)
    scene.add(key)
    const model = createDrifter()
    model.play('wave', 0)
    model.update(0.5)
    scene.add(model.object)
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(3.8, 3, 9)
    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, 2, 0)
    controls.enablePan = false
    controls.enableZoom = false
    controls.minPolarAngle = Math.PI * 0.2
    controls.maxPolarAngle = Math.PI * 0.8
    controls.update()

    for (const name of drifterClipNames) {
      const option = document.createElement('option')
      option.value = name
      option.textContent = drifterClipInfo[name].label
      select.append(option)
    }
    select.value = 'wave'
    select.disabled = play.disabled = joints.disabled = false
    status.hidden = true
    viewer.dataset.ready = 'true'
    let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches
    let pending = 0
    let previous = 0
    const updateButton = () => { play.textContent = playing ? 'Pause' : 'Play' }
    updateButton()

    function draw(now) {
      pending = 0
      if (!visible || document.hidden) { previous = 0; return }
      const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0
      previous = now
      if (playing) model.update(delta, { speed: select.value === 'walk' ? 1.5 : 0 })
      renderer.render(scene, camera)
      if (playing) resume()
    }
    resume = () => {
      if (!pending && visible && !document.hidden) pending = requestAnimationFrame(draw)
    }
    controls.addEventListener('change', resume)
    select.addEventListener('change', () => {
      model.play(select.value, 0)
      model.update(0.5, { speed: select.value === 'walk' ? 1.5 : 0 })
      resume()
    })
    play.addEventListener('click', () => {
      playing = !playing
      previous = 0
      updateButton()
      resume()
    })
    joints.addEventListener('change', () => {
      model.showPivots(joints.checked)
      resume()
    })
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      event.preventDefault()
      const offset = camera.position.clone().sub(controls.target)
      const spherical = new THREE.Spherical().setFromVector3(offset)
      spherical.theta += event.key === 'ArrowLeft' ? 0.15 : event.key === 'ArrowRight' ? -0.15 : 0
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + (event.key === 'ArrowUp' ? -0.1 : event.key === 'ArrowDown' ? 0.1 : 0), controls.minPolarAngle, controls.maxPolarAngle)
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
      controls.update()
    })
    new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      resume()
    }).observe(canvas)
    document.addEventListener('visibilitychange', () => { previous = 0; resume() })
    resume()
  }
}
