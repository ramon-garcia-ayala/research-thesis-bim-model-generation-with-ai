/*
 * A 3D view of a pipeline model on a slide: `<div class="model3d" data-side="source|rebuilt" data-mode="plain|diff">`.
 * Every view of the page shares one camera, so the two sides of a slide, and the slides before and after, move
 * together. Renders only when something changes (orbit, resize, theme). Needs an import map for "three".
 *
 * In diff mode each side shows its own values, so the two sides differ where the model did: a moved wall is labelled
 * with its length, a room is a disc whose area is half its real area's scale, a door or window carries a mark on its
 * hinge side. Each kind of difference has its own colour, the deck's --diff-1…5 tokens:
 *   1 out of place · 2 another area (walls, floors) · 3 room with another area · 4 room no longer enclosed ·
 *   5 door or window flipped
 */
import * as THREE from 'three'
import { OrbitControls } from './vendor/three/OrbitControls.js'

const WALL_T = 0.25
const CURTAIN_T = 0.08
const SLAB_T = 0.3
/** Vertical field of view (degrees) of a view at least WIDE_ASPECT wide; narrower views keep its horizontal one. */
const FOV = 32
const WIDE_ASPECT = 1.4
const HALF_WIDTH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * WIDE_ASPECT
/** A room's disc covers this share of its area, so neighbours do not overlap. */
const ROOM_SHARE = 0.25

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'

/** Plan (x, y) with z up → three's y up. */
const at = (x, y, z) => new THREE.Vector3(x, z, -y)

/** The colour slot (1–5) of an element's differences, the most serious first; 0 when it came back the same. */
function slotOf(kind, found) {
  if (found.includes('not_in_place') || found.includes('extra') || found.includes('host')) return 1
  if (kind === 'room') return found.includes('not_enclosed') ? 4 : found.length ? 3 : 0
  if (found.includes('area') || found.includes('type')) return 2
  if (found.includes('flipped')) return 5
  return 0
}

function wallMesh(w) {
  const dx = w.b[0] - w.a[0]
  const dy = w.b[1] - w.a[1]
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(dx, dy), w.h, w.curtain ? CURTAIN_T : WALL_T))
  mesh.position.copy(at((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, w.z + w.h / 2))
  mesh.rotation.y = Math.atan2(dy, dx)
  return mesh
}

function floorMesh(f) {
  const shape = new THREE.Shape(f.pts.map(([x, y]) => new THREE.Vector2(x, y)))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB_T, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geo)
  mesh.position.y = f.z - SLAB_T
  return mesh
}

function openingMesh(o) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, WALL_T + 0.06))
  mesh.position.copy(at(o.p[0], o.p[1], o.p[2] + o.h / 2))
  mesh.rotation.y = Math.atan2(o.dir[1], o.dir[0])
  return mesh
}

/** The hinge-side mark of a door or window: a post at one jamb, on the other jamb when the hand is flipped. */
function handMark(o) {
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.3, o.h + 0.6, 0.9))
  mark.position.set(((o.hand ? -1 : 1) * o.w) / 2, 0, 0)
  return mark
}

/** A disc of the room's area (scaled by ROOM_SHARE); a ring when the room is no longer enclosed (no area). */
function roomMesh(room) {
  const z = room.p[2] + 0.15
  if (!(room.a > 0)) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.18, 8, 32))
    ring.rotation.x = Math.PI / 2
    ring.position.copy(at(room.p[0], room.p[1], z))
    return ring
  }
  const radius = Math.sqrt((room.a * ROOM_SHARE) / Math.PI)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.12, 40))
  mesh.position.copy(at(room.p[0], room.p[1], z))
  return mesh
}

/** Builds one side's scene; every mesh remembers its kind and its colour slot. Moved walls get a callout anchor. */
function buildScene(side, issues, mode) {
  const scene = new THREE.Scene()
  const parts = []
  const callouts = []
  const diff = mode === 'diff'
  const add = (kind, mesh, id, extra) => {
    const slot = slotOf(kind, issues[id] ?? [])
    mesh.userData = { kind, slot }
    scene.add(mesh)
    parts.push(mesh)
    if (kind !== 'room') {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30))
      edges.position.copy(mesh.position)
      edges.rotation.copy(mesh.rotation)
      edges.userData = { kind, slot, edge: true }
      scene.add(edges)
      parts.push(edges)
    }
    if (diff && slot && extra) extra(mesh, slot)
  }
  side.floors.forEach((f) => add('floor', floorMesh(f), f.id))
  side.walls.forEach((w) =>
    add('wall', wallMesh(w), w.id, (mesh, slot) => {
      if (slot === 1) callouts.push({ at: at((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, w.z + w.h), text: `${w.len.toFixed(2)} m` })
    }),
  )
  for (const o of [...side.doors, ...side.windows])
    add('opening', openingMesh(o), o.id, (mesh, slot) => {
      const mark = handMark(o)
      mark.userData = { kind: 'mark', slot }
      mesh.add(mark)
      parts.push(mark)
    })
  if (diff) side.rooms.forEach((r) => add('room', roomMesh(r), r.id))
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2))
  const sun = new THREE.DirectionalLight(0xffffff, 1.6)
  sun.position.set(-40, 80, 60)
  scene.add(sun)
  return { scene, parts, callouts }
}

/** (Re)colours a scene from the current theme. */
function paint(view) {
  const ink = new THREE.Color(token('--ink'))
  const quiet = new THREE.Color(token('--ink-tertiary'))
  const slots = [null, 1, 2, 3, 4, 5].map((n) => n && new THREE.Color(token(`--diff-${n}`)))
  view.renderer.setClearColor(new THREE.Color(token('--panel')), 1)
  const diff = view.mode === 'diff'
  for (const part of view.parts) {
    const { kind, slot, edge } = part.userData
    const flagged = diff && slot > 0
    const hue = flagged ? slots[slot] : kind === 'opening' ? ink : quiet
    if (edge) {
      part.material = new THREE.LineBasicMaterial({ color: flagged ? hue : ink, transparent: true, opacity: flagged ? 1 : diff ? 0.12 : 0.55 })
    } else {
      // a flagged floor stays see-through, so the walls it covers still show
      const see = !flagged || kind === 'floor'
      part.material = new THREE.MeshLambertMaterial({
        color: hue,
        transparent: see,
        opacity: flagged ? (kind === 'floor' ? 0.4 : 1) : diff ? 0.06 : kind === 'floor' ? 0.35 : 0.22,
        depthWrite: !see || !diff,
      })
      part.renderOrder = flagged ? 2 : 1
    }
    if (kind === 'room') part.visible = flagged
    if (kind === 'mark') part.visible = flagged
  }
}

export async function mountModels(doc = document, url = 'model.json') {
  const hosts = [...doc.querySelectorAll('.model3d')]
  if (!hosts.length) return
  const model = await (await fetch(url)).json()

  // one camera for every view, framed on the source model
  const bounds = new THREE.Box3()
  model.source.walls.forEach((w) => {
    bounds.expandByPoint(at(w.a[0], w.a[1], w.z))
    bounds.expandByPoint(at(w.b[0], w.b[1], w.z + w.h))
  })
  const centre = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3()).length()
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, size * 10)
  // the distance at which the bounding sphere fills the field of view, brought in a little: the sphere is loose
  // around a long, low building
  const fit = (size / 2 / Math.sin(THREE.MathUtils.degToRad(FOV / 2))) * 0.78
  camera.position.copy(centre).add(new THREE.Vector3(-0.55, 0.55, 0.7).normalize().multiplyScalar(fit))
  const target = centre.clone()
  camera.lookAt(target)
  // centre the model on screen, not just its box: seen at an angle, the box centre lands off the middle. Project the
  // box corners and pan by the offset of their extent.
  camera.aspect = WIDE_ASPECT
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  const ndc = []
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) ndc.push(new THREE.Vector3(x, y, z).project(camera))
  const mid = (k) => (Math.min(...ndc.map((p) => p[k])) + Math.max(...ndc.map((p) => p[k]))) / 2
  const reach = camera.position.distanceTo(target) * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(mid('x') * reach * WIDE_ASPECT)
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(mid('y') * reach)
  const pan = right.add(up)
  camera.position.add(pan)
  target.add(pan)

  const views = hosts.map((host) => {
    const side = host.dataset.side === 'rebuilt' ? 'rebuilt' : 'source'
    const mode = host.dataset.mode === 'diff' ? 'diff' : 'plain'
    const canvas = doc.createElement('canvas')
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', host.dataset.label ?? `${side} model`)
    host.prepend(canvas)
    // preserveDrawingBuffer: the slide can be printed or captured as an image
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const controls = new OrbitControls(camera, canvas)
    controls.target = target
    controls.update() // the constructor aimed the camera at the origin, before the shared target was set
    controls.addEventListener('change', () => renderAll())
    const view = { host, canvas, renderer, mode, ...buildScene(model[side], model.issues[side], mode) }
    view.tags = view.callouts.map((c) => {
      const tag = doc.createElement('span')
      tag.className = 'model3d__callout'
      tag.textContent = c.text
      host.append(tag)
      return { ...c, tag }
    })
    paint(view)
    return view
  })

  const point = new THREE.Vector3()
  function render(view) {
    const { clientWidth: w, clientHeight: h } = view.host
    if (!w || !h) return
    const size = view.renderer.getSize(new THREE.Vector2())
    if (size.x !== w || size.y !== h) view.renderer.setSize(w, h, false)
    // keep the horizontal field of view: a narrow view widens its vertical one instead of cropping the model's sides
    camera.fov = Math.max(FOV, THREE.MathUtils.radToDeg(2 * Math.atan(HALF_WIDTH / (w / h))))
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    view.renderer.render(view.scene, camera)
    for (const t of view.tags) {
      point.copy(t.at).project(camera)
      t.tag.hidden = point.z > 1
      t.tag.style.left = `${((point.x + 1) / 2) * 100}%`
      t.tag.style.top = `${((1 - point.y) / 2) * 100}%`
    }
  }
  function renderAll() {
    views.forEach(render)
  }

  const resize = new ResizeObserver(() => renderAll())
  views.forEach((v) => resize.observe(v.host))
  const repaint = () => {
    views.forEach(paint)
    renderAll()
  }
  new MutationObserver(repaint).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint)
  renderAll()
}
