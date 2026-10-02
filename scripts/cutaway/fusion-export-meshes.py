"""Run inside Fusion (Utilities > Scripts, or the Fusion MCP server's script tool) with the full
vehicle assembly open. Tessellates every visible body, in assembly coordinates, into OUT: one
.bin per body (float32 positions in mm, float32 normals, uint32 indices) plus manifest.json.
Then run scripts/cutaway/build-glb.py on that folder."""
import adsk.core, adsk.fusion, json, struct, os
OUT = os.path.expanduser('~/cutaway-meshes')  # must exist; build-glb.py reads it
def run(context):
    app = adsk.core.Application.get()
    des = adsk.fusion.Design.cast(app.activeProduct)
    manifest = []
    def walk(occs):
        for o in occs:
            if not o.isLightBulbOn: continue
            for b in o.bRepBodies:
                if not b.isLightBulbOn: continue
                mc = b.meshManager.createMeshCalculator()
                mc.setQuality(adsk.fusion.TriangleMeshQualityOptions.HighQualityTriangleMesh)
                mc.surfaceTolerance = 0.005  # cm
                m = mc.calculate()
                pts = m.nodeCoordinatesAsFloat  # cm, assembly context
                nrm = m.normalVectorsAsFloat
                idx = m.nodeIndices
                fn = f"{len(manifest):03d}.bin"
                with open(os.path.join(OUT, fn), 'wb') as f:
                    f.write(struct.pack(f'<{len(pts)}f', *[p*10 for p in pts]))
                    f.write(struct.pack(f'<{len(nrm)}f', *nrm))
                    f.write(struct.pack(f'<{len(idx)}I', *idx))
                manifest.append(dict(file=fn, occ=o.name, body=b.name, mat=b.material.name if b.material else '', nv=len(pts)//3, ni=len(idx)))
            walk(o.childOccurrences)
    walk(des.rootComponent.occurrences)
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    print('bodies', len(manifest), 'tris', sum(m['ni'] for m in manifest)//3)
