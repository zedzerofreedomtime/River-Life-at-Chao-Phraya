"""Render the delivered exterior on a night-water presentation stage, without modifying the asset."""
import bpy
from mathutils import Vector
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/"assets/unicorn/unicorn-cruise.blend"))
scene=bpy.context.scene
for name,power,color in [("LD_Key",6500,(.55,.72,1)),("LD_Fill",3500,(.36,.6,1)),("LD_Rim",5000,(1,.65,.34))]:
    bpy.data.objects[name].data.energy=power
    bpy.data.objects[name].data.color=color
world=next(n for n in scene.world.node_tree.nodes if n.type=="BACKGROUND")
world.inputs[0].default_value=(.012,.024,.045,1);world.inputs[1].default_value=.35
for name in ["M_Unicorn_Cyan_LED","M_Warm_Practical_Light"]:
    mat=bpy.data.materials[name]
    p=next(n for n in mat.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
    p.inputs["Emission Strength"].default_value=7 if "Cyan" in name else 4
water=bpy.data.materials.new("M_Presentation_Water")
p=next(n for n in water.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
p.inputs["Base Color"].default_value=(.014,.038,.065,1)
p.inputs["Roughness"].default_value=.27;p.inputs["Metallic"].default_value=.65
noise=water.node_tree.nodes.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=3.4
noise.inputs["Detail"].default_value=2.2
bump=water.node_tree.nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.3;bump.inputs["Distance"].default_value=.18
water.node_tree.links.new(noise.outputs["Fac"],bump.inputs["Height"])
water.node_tree.links.new(bump.outputs["Normal"],p.inputs["Normal"])
me=bpy.data.meshes.new("ME_Presentation_Water");me.from_pydata([(-120,-120,.28),(120,-120,.28),(120,120,.28),(-120,120,.28)],[],[(0,1,2,3)])
o=bpy.data.objects.new("Presentation_Water",me);scene.collection.objects.link(o);o.data.materials.append(water)
cam=scene.camera;cam.location=(-27,-57,20);cam.data.ortho_scale=49
cam.rotation_euler=(Vector((0,0,3.0))-cam.location).to_track_quat("-Z","Y").to_euler()
ng=bpy.data.node_groups.new("Night_Glow","CompositorNodeTree");scene.compositing_node_group=ng
ng.interface.new_socket("Image",in_out="OUTPUT",socket_type="NodeSocketColor")
rl=ng.nodes.new("CompositorNodeRLayers");glow=ng.nodes.new("CompositorNodeGlare");out=ng.nodes.new("NodeGroupOutput")
glow.inputs["Type"].default_value="Fog Glow";glow.inputs["Threshold"].default_value=1.2;glow.inputs["Strength"].default_value=.35
ng.links.new(rl.outputs["Image"],glow.inputs["Image"]);ng.links.new(glow.outputs["Image"],out.inputs[0])
scene.cycles.samples=64;scene.cycles.adaptive_threshold=.05;scene.render.film_transparent=False
scene.render.filepath=str(ROOT/"assets/unicorn/unicorn-night.png")
bpy.ops.render.render(write_still=True)
print("@@JSON@@"+str({"render":scene.render.filepath}))
