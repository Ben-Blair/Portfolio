"""Fusion body meshes -> one GLB, a mesh per material class, for the `cutaway` media type.

    python3 scripts/cutaway/build-glb.py ~/cutaway-meshes public/media/<slug>/vehicle.glb

Fusion Z (aft) becomes three -X, so the nose points +X, which is what CutawayBlock expects.
Colours live in CLASSES below; the viewer derives the hatched section colour from them."""
import json, struct, re, sys
import numpy as np

MESH = sys.argv[1]
m = json.load(open(MESH + '/manifest.json'))

# (class, regex on "occ|body", rgb hex, metallic, roughness). First match wins.
CLASSES = [
    ('skip',       r'servo boss',                         None, 0, 0),
    ('canard',     r'^Panel',                             '5550e8', 0.0, 0.42),
    ('fin',        r'^AftFin',                            '596170', 0.0, 0.6),
    ('airframe',   r'nose shell|nav bay tube|^Tube|RecoveryBayTube|BoosterTube', '9da2aa', 0.0, 0.45),
    ('servo',      r'servo body',                         '2b2d33', 0.0, 0.5),
    ('metal',      r'Shaft|spline|u-bolt|rod|washer|ballast|standoffs', 'b8bec7', 0.85, 0.32),
    ('bearing',    r'Bearing',                            'e0a526', 0.0, 0.45),
    ('bay',        r'CanardBay',                          '5b6270', 0.0, 0.7),
    ('pcb',        r'guidance board',                     '1f7a52', 0.0, 0.5),
    ('electronics',r'BEC|battery|StratoLogger|loom',      '6d7380', 0.0, 0.6),
    ('motor',      r'MotorEnvelope',                      'a14a36', 0.0, 0.6),
    ('mmt',        r'MotorMountTube',                     'b48a5a', 0.0, 0.75),
    ('g10',        r'.',                                  'a7ae9c', 0.0, 0.65),  # bulkheads, rings, plates, sled, couplers
]

# The canard panels and their shafts each go in a node of their own, origin on the hinge line, so the
# viewer can deflect them. Everything else is merged into one node per material class.
HINGED = re.compile(r'^(?:Panel|Shaft)(\d):')

nodes_src = {}  # node name -> {class name -> [P, N, I, off]}
classes = {}
for e in m:
    key = f"{e['occ']}|{e['body']}"
    cls = next(c for c in CLASSES if re.search(c[1], key))
    if cls[0] == 'skip': continue
    classes[cls[0]] = cls
    raw = open(MESH + '/' + e['file'], 'rb').read()
    nv, ni = e['nv'], e['ni']
    p = np.frombuffer(raw, '<f4', nv * 3, 0).reshape(-1, 3)
    n = np.frombuffer(raw, '<f4', nv * 3, nv * 12).reshape(-1, 3)
    i = np.frombuffer(raw, '<u4', ni, nv * 24)
    # Fusion mm (x, y, z) -> three metres (-z, x, -y): a proper rotation, nose toward +X.
    P = np.stack([-p[:, 2], p[:, 0], -p[:, 1]], 1) / 1000.0
    N = np.stack([-n[:, 2], n[:, 0], -n[:, 1]], 1)
    hinge = HINGED.match(e['occ'])
    node = f'canard-{hinge.group(1)}' if hinge else cls[0]
    g = nodes_src.setdefault(node, {}).setdefault(cls[0], dict(P=[], N=[], I=[], off=0, shaft=None))
    g['P'].append(P); g['N'].append(N); g['I'].append(i + g['off']); g['off'] += nv
    if e['occ'].startswith('Shaft'): g['shaft'] = P

bin_ = bytearray(); views = []; accessors = []; meshes = []; materials = []; nodes = []
def add(arr, target, comp, typ, minmax=False):
    while len(bin_) % 4: bin_.append(0)
    views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=arr.nbytes, target=target))
    bin_.extend(arr.tobytes())
    a = dict(bufferView=len(views) - 1, componentType=comp, count=len(arr), type=typ)
    if minmax: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    accessors.append(a); return len(accessors) - 1

material_index = {}
for name, (_, _, hexc, met, rough) in classes.items():
    rgb = [((int(hexc[k:k+2], 16) / 255) ** 2.2) for k in (0, 2, 4)]  # glTF baseColor is linear
    material_index[name] = len(materials)
    materials.append(dict(name=name, pbrMetallicRoughness=dict(baseColorFactor=rgb + [1], metallicFactor=met, roughnessFactor=rough)))

for node, parts in nodes_src.items():
    origin = np.zeros(3, '<f4'); extras = None
    shaft = next((g['shaft'] for g in parts.values() if g['shaft'] is not None), None)
    if shaft is not None:
        # The hinge line runs radially through the shaft, crossing the rocket axis at its station.
        lo, hi = shaft.min(0), shaft.max(0)
        origin = np.array([(lo[0] + hi[0]) / 2, 0, 0], '<f4')
        span = hi - lo; axis = [0.0, 0.0, 0.0]; axis[int(np.argmax(span[1:])) + 1] = 1.0
        extras = dict(hingeAxis=axis)
    prims = []
    for cname, g in parts.items():
        P = (np.concatenate(g['P']) - origin).astype('<f4'); N = np.concatenate(g['N']).astype('<f4')
        I = np.concatenate(g['I']); I = I.astype('<u2' if g['off'] < 65536 else '<u4')
        pa = add(P, 34962, 5126, 'VEC3', True); na = add(N, 34962, 5126, 'VEC3')
        ia = add(I, 34963, 5123 if I.dtype == np.dtype('<u2') else 5125, 'SCALAR')
        prims.append(dict(attributes=dict(POSITION=pa, NORMAL=na), indices=ia, material=material_index[cname]))
    meshes.append(dict(name=node, primitives=prims))
    entry = dict(name=node, mesh=len(meshes) - 1)
    if origin.any(): entry['translation'] = origin.tolist()
    if extras: entry['extras'] = extras
    nodes.append(entry)
    print(f'{node:12s} tris={sum(accessors[pr["indices"]]["count"] for pr in prims)//3} {extras or ""}')

while len(bin_) % 4: bin_.append(0)
gltf = dict(asset=dict(version='2.0'), scene=0, scenes=[dict(nodes=list(range(len(nodes))))], nodes=nodes,
            meshes=meshes, materials=materials, accessors=accessors, bufferViews=views, buffers=[dict(byteLength=len(bin_))])
js = json.dumps(gltf, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
out = sys.argv[2]
with open(out, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bin_)
print('wrote', out)
