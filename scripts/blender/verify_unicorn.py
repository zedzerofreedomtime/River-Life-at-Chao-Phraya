"""Run installed Blender Agent Skills QA and round-trip all booking GLBs."""
import bpy
import json
import os
import sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
if not bpy.app.background or bpy.data.filepath:
    raise RuntimeError("Verification requires a fresh headless --factory-startup process.")
SOURCE=ROOT/"assets/unicorn"
OUT=ROOT/"apps/web/public/models/unicorn"
SKILLS=Path(os.environ.get("BLENDER_SKILLS",str(Path.home()/".codex/skills")))
sys.path.insert(0,str(SKILLS/"blender-asset-qa/scripts"))
sys.path.insert(0,str(SKILLS/"blender-game-optimization/scripts"))
sys.path.insert(0,str(SKILLS/"blender-scene-setup/scripts"))
import qa_check
import review_shots
import mesh_stats
import scene_audit

reports={}
for variant in ["exterior","upper","lower"]:
    for o in list(bpy.data.objects): bpy.data.objects.remove(o,do_unlink=True)
    path=OUT/("unicorn-"+variant+".glb")
    bpy.ops.import_scene.gltf(filepath=str(path))
    obs=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    # The exported flat-shaded solid PBR meshes intentionally have stacked face UVs.
    # Geometry QA still checks all materials, normals, intersections and transforms.
    result=qa_check.run(objects=[o.name for o in obs],profile="game",uv=False)
    pts=[o.matrix_world@Vector(v) for o in obs for v in o.bound_box]
    result["round_trip_dimensions_blender_m"]=[round(max(v[i] for v in pts)-min(v[i] for v in pts),3) for i in range(3)]
    result["bytes"]=path.stat().st_size
    stats=mesh_stats.run(objects=[o.name for o in obs],budget="web")
    (SOURCE/("mesh-stats-"+variant+".json")).write_text(json.dumps(stats,indent=2),encoding="utf-8")
    reports[variant]=result
    (SOURCE/("qa-"+variant+".json")).write_text(json.dumps(result,indent=2),encoding="utf-8")
    print("@@JSON@@"+json.dumps({"variant":variant,"pass":result["pass"],"errors":result["errors"],"warnings":result["warnings"][:15]}),flush=True)
    if variant=="exterior":
        review_shots.run(objects=[o.name for o in obs],out=str(SOURCE/"material-review.png"),mode="material",res=400)
        # The generic skill wire preset scales thickness by total ship length and
        # produces huge miters on tiny furniture. Use thin non-mitered wire copies
        # for this long vessel, then the same skill's multi-angle camera renderer.
        white=bpy.data.materials.new("QA_Clay");white.diffuse_color=(.65,.7,.72,1)
        black=bpy.data.materials.new("QA_Wire");black.diffuse_color=(.005,.008,.01,1)
        wire_obs=[]
        for o in obs:
            w=o.copy();w.data=o.data.copy();bpy.context.scene.collection.objects.link(w)
            w.name="QA_Wire_"+o.name;w.data.materials.clear();w.data.materials.append(black)
            for p in w.data.polygons:p.material_index=0
            md=w.modifiers.new("Thin_NonMiter_Wire","WIREFRAME")
            md.thickness=.008;md.use_even_offset=False;md.use_replace=True;md.use_boundary=True
            wire_obs.append(w)
            o.data.materials.clear();o.data.materials.append(white)
            for p in o.data.polygons:p.material_index=0
        review_shots.run(objects=[o.name for o in obs+wire_obs],out=str(SOURCE/"wire-review.png"),mode="material",res=400)
(SOURCE/"qa-summary.json").write_text(json.dumps({"pass":all(r["pass"] for r in reports.values()),"variants":reports},indent=2),encoding="utf-8")
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/"unicorn-cruise.blend"))
source_audit=scene_audit.run(objects=[o.name for o in bpy.context.scene.objects])
(SOURCE/"scene-audit.json").write_text(json.dumps(source_audit,indent=2),encoding="utf-8")
if not all(r["pass"] for r in reports.values()):
    raise RuntimeError("Unicorn asset QA failed. Read assets/unicorn/qa-summary.json; do not deliver these models.")
