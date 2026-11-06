"""Photo-informed Unicorn Cruise presentation asset; not a surveyed ship plan.

Run: blender -b --factory-startup --python-exit-code 1 -P scripts/blender/build_unicorn.py
All dimensions are design approximations. Booking inventory is deliberately absent
from cutaways; the app supplies authoritative chair IDs and availability at runtime.
"""
import bpy
import bmesh
import json
import math
import os
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
if not bpy.app.background or bpy.data.filepath:
    raise RuntimeError("Use a fresh headless --factory-startup process; never run this builder in an existing user scene.")
SOURCE = ROOT / "assets/unicorn"
OUT = ROOT / "apps/web/public/models/unicorn"
SOURCE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
SKILLS = Path(os.environ.get("BLENDER_SKILLS", str(Path.home() / ".codex/skills")))
for old in list(bpy.data.objects):
    bpy.data.objects.remove(old, do_unlink=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
scene.unit_settings.length_unit = "METERS"
scene["reference_accuracy"] = "Photo-informed interpretation, not measured or approved vessel layout"
scene["capacity_upper_user_confirmed"] = 250
scene["capacity_is_not_sellable_inventory"] = True
scene["approximate_dimensions_m"] = [40, 10, 8.1]
scene["booking_floors_blender_z"] = [2.55, 5.25]

def mat(name, rgb, rough=.4, metal=0, emission=0):
    m = bpy.data.materials.new("M_" + name)
    m.diffuse_color = (*rgb, 1)
    p = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = (*rgb, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emission:
        p.inputs["Emission Color"].default_value = (*rgb, 1)
        p.inputs["Emission Strength"].default_value = emission
    return m

M = {
    "Pearl": mat("Pearl_White_Paint", (.79, .79, .72), .3),
    "Champagne": mat("Champagne_Trim", (.56, .43, .24), .29, 1),
    "Silver": mat("Brushed_Stainless", (.65, .72, .76), .25, 1),
    "Glass": mat("Smoked_Panoramic_Glass", (.032, .092, .125), .16, .0),
    "Dark": mat("Charcoal_Rattan_And_Rubber", (.027, .037, .041), .7),
    "Floor": mat("Pale_Stone_Floor", (.63, .68, .69), .58),
    "Grout": mat("Stone_Joints", (.36, .43, .46), .75),
    "Wood": mat("Lower_Deck_Oak", (.46, .29, .13), .63),
    "Cyan": mat("Unicorn_Cyan_LED", (.015, .5, .9), .35, 0, 2.5),
    "Warm": mat("Warm_Practical_Light", (1, .67, .24), .4, 0, 2),
    "Cloth": mat("Dining_Charcoal_Linen", (.11, .14, .14), .95),
    "Screen": mat("Stage_Screen", (.025, .065, .095), .55, 0, .15),
}

COLS = {}
GEOM = {}
def col(name):
    if name not in COLS:
        c = bpy.data.collections.new(name)
        scene.collection.children.link(c)
        COLS[name] = c
    return COLS[name]

def mesh(group, material, vs, fs):
    key = group, material
    data = GEOM.setdefault(key, [[], []])
    offset = len(data[0])
    data[0].extend(vs)
    data[1].extend(tuple(i + offset for i in f) for f in fs)

def box(group, material, center, size):
    x,y,z = center; a,b,c = (v/2 for v in size)
    vs = [(x+dx*a,y+dy*b,z+dz*c) for dx,dy,dz in
          [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    mesh(group, material, vs, [(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)])

def panel(group, material, front, depth_vector):
    n=len(front)
    vs=front+[tuple(Vector(v)+Vector(depth_vector)) for v in front]
    fs=[tuple(range(n)),tuple(reversed(range(n,2*n)))]
    fs.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    mesh(group,material,vs,fs)

def tube(group, material, points, radius=.035, sides=6, close=False):
    pts = [Vector(p) for p in points]
    vs=[]; fs=[]
    for i,p in enumerate(pts):
        tangent=(pts[(i+1)%len(pts)]-pts[(i-1)%len(pts)]).normalized() if close else (pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
        helper=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((0,1,0))
        u=tangent.cross(helper).normalized(); v=tangent.cross(u).normalized()
        for j in range(sides):
            q=p+radius*(math.cos(j*2*math.pi/sides)*u+math.sin(j*2*math.pi/sides)*v)
            vs.append(tuple(q))
        if i:
            for j in range(sides):
                a=(i-1)*sides+j; b=(i-1)*sides+(j+1)%sides
                fs.append((a,b,b+sides,a+sides))
    if close:
        for j in range(sides):
            fs.append(((len(pts)-1)*sides+j,(len(pts)-1)*sides+(j+1)%sides,(j+1)%sides,j))
    else:
        fs.append(tuple(reversed(range(sides))))
        fs.append(tuple((len(pts)-1)*sides+j for j in range(sides)))
    mesh(group,material,vs,fs)

# Rounded long hull, with a fine bow and broad transom. X points aft.
stations=[(-20,.12),(-19.5,.9),(-18.6,1.9),(-17.3,2.9),(-15.7,3.8),
          (-13.5,4.5),(-11,4.9),(-8,5),(0,5),(8,5),(15.5,5),(18,4.85),(19.5,4.3),(20,3.6)]
outline=[(x,-w) for x,w in stations]+[(x,w) for x,w in reversed(stations)]

def slab(group,material,z,thick,scale=1):
    ring=[(x*scale,y*scale) for x,y in outline]
    n=len(ring)
    vs=[(x,y,z-thick) for x,y in ring]+[(x,y,z) for x,y in ring]
    fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    fs.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    mesh(group,material,vs,fs)

def ring_strip(group,material,z,width,depth=.1,scale=.99):
    n=len(outline)
    rings=[[(x*scale,y*scale,z-depth) for x,y in outline],
           [(x*scale,y*scale,z) for x,y in outline],
           [(x*(scale-width/20),y*(scale-width/5),z) for x,y in outline],
           [(x*(scale-width/20),y*(scale-width/5),z-depth) for x,y in outline]]
    vs=[v for r in rings for v in r]; fs=[]
    for a in range(4):
        for i in range(n): fs.append((a*n+i,a*n+(i+1)%n,((a+1)%4)*n+(i+1)%n,((a+1)%4)*n+i))
    mesh(group,material,vs,fs)

def hull():
    n=len(outline); vs=[]
    levels=[(.0,.78),(.38,.85),(1.45,.97),(2.48,1)]
    for z,s in levels:
        vs.extend((x*s,y*s,z+(.25 if x<-15 else 0)) for x,y in outline)
    fs=[tuple(reversed(range(n))),tuple(range((len(levels)-1)*n,len(levels)*n))]
    for k in range(len(levels)-1):
        for i in range(n): fs.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
    mesh("Hull","Pearl",vs,fs)
    for height,scale,material,radius in [(.45,.864,"Dark",.10),(2.29,.998,"Champagne",.04)]:
        tube("Hull",material,[(x*scale,y*scale,height+(.25 if x<-15 else 0)) for x,y in outline],radius,8,True)
    for side in [-1,1]:
        # Cabin opening ends are rounded and follow the sheer line.
        window=[(-11.8,2.82),(-12.9,3.13),(-13.2,3.6),(-13.05,4.4),(-12.4,4.72),
                (10.7,4.72),(11.5,4.32),(11.8,3.5),(11.4,2.85),(-11.8,2.82)]
        box("Cabin","Pearl",(1,side*4.94,2.76),(29.5,.16,.45))
        box("Cabin","Pearl",(1,side*4.94,4.93),(29.5,.16,.62))
        box("Cabin","Glass",(-.75,side*4.97,3.78),(24.3,.09,1.83))
        for x in [-12.7,-10,-7.25,-4.5,-1.75,1,3.75,6.5,9.25,11.5]:
            box("Cabin","Silver",(x,side*5.02,3.8),(.09,.09,2.0))
        tube("Cabin","Cyan",[(x,side*5.035,z) for x,z in window],.05,8)
        # Recessed aft boarding door, backed by a dark panel.
        box("Cabin","Dark",(13.3,side*4.95,3.75),(1.5,.12,2.15))
        for x in [12.5,14.1]: box("Cabin","Pearl",(x,side*4.96,3.75),(.13,.23,2.6))
        tube("Cabin","Cyan",[(12.5,side*5.095,2.55),(12.5,side*5.095,4.9),(14.1,side*5.095,4.9),(14.1,side*5.095,2.55)],.045,8)
        for x in [15.4,18.3]: box("Cabin","Pearl",(x,side*4.7,3.82),(.2,.2,2.8))
        for z in [2.75,3.15,3.55]: tube("Cabin","Silver",[(14.2,side*4.75,z),(19.2,side*4.24,z)],.026,6)
        for x in [15.5,17.5,19.0]:
            tube("Cabin","Silver",[(x,side*(4.75-(x-14.2)*.1),2.5),(x,side*(4.75-(x-14.2)*.1),3.65)],.035,6)
    slab("LowerFloor","Wood",2.55,.06,.985)
    slab("UpperFloor","Floor",5.25,.22,.995)
    ring_strip("UpperFloor","Pearl",5.28,.16,.32)
    for side in [-1,1]:
        tube("Hull","Cyan",[(-19.4,side*.94,2.35),(-17.5,side*2.75,2.34),(-15.5,side*3.9,2.38),(-12.7,side*4.72,2.42),(-8,side*5.02,2.42),(11.6,side*5.02,2.42)],.045,8)
    tube("UpperFloor","Cyan",[(x*.998,y*.998,5.13) for x,y in outline],.043,8,True)

def floor_details(group,height,wood=False):
    # Subtle joints are visible detail, not image-based geometry.
    for x in range(-12,13,2): box(group,"Grout" if not wood else "Champagne",(x,0,height+.003),(.014,9.4,.006))
    for y in [-3.6,-2.4,-1.2,0,1.2,2.4,3.6]: box(group,"Grout" if not wood else "Champagne",(.5,y,height+.003),(25,.014,.012))

def railing(group,height):
    path=[(x*.977,y*.977) for x,y in outline]
    for dz in [.4,.74,1.08]: tube(group,"Silver",[(x,y,height+dz) for x,y in path],.03 if dz<1 else .045,6,True)
    # Posts tied into floor and all three horizontal rails.
    for side in [-1,1]:
        # Sample the same perimeter as the horizontal rails: fixed beam values
        # leave posts detached at the tapered bow and rounded transom.
        for a,b in zip(path[:len(stations)-1],path[1:len(stations)]):
            length=math.dist(a,b)
            count=max(1,math.ceil(length/1.3))
            for i in range(count):
                t=i/count
                x=a[0]+(b[0]-a[0])*t
                w=abs(a[1]+(b[1]-a[1])*t)
                tube(group,"Silver",[(x,side*w,height-.03),(x,side*w,height+1.08)],.035,8)

def stairs(group,height):
    # Scale-consistent short flights: model is illustrative, not an evacuation plan.
    for side in [-1,1]:
        x0=14.0; y=side*3.65
        for i in range(12):
            x=x0+i*.29; z=height-2.7+(i+1)*.225
            box(group,"Pearl",(x,y,z-.11),(.32,1.4,.22))
            box(group,"Dark",(x,y,z+.006),(.27,1.28,.012))
        for offset in [-.72,.72]:
            tube(group,"Silver",[(x0-.2,y+offset,height-1.7),(x0+3.4,y+offset,height+1)],.035,6)
            for i in [0,4,8,11]:
                x=x0+i*.29; z=height-2.7+(i+1)*.225
                tube(group,"Silver",[(x,y+offset,z-.05),(x,y+offset,z+.95)],.03,6)
        box(group,"Pearl",(17.7,y,height-.14),(1.2,1.6,.24))

def stage(group,height):
    box(group,"Dark",(-15.1,0,height+.18),(3.6,5.45,.36))
    box(group,"Dark",(-16.75,0,height+1.68),(.22,4.4,3.0))
    box(group,"Screen",(-16.625,0,height+1.77),(.025,4.12,2.65))
    for side in [-1,1]:
        box(group,"Dark",(-14.95,side*2.52,height+.85),(.72,.55,1.4))
        for yoff in [-.18,.18]: tube(group,"Silver",[(-17.05,side*2.85+yoff,height-.025),(-17.05,side*2.85+yoff,height+3.3)],.035,6)
        for z in [.4,1.0,1.6,2.2,2.8]: tube(group,"Silver",[(-17.05,side*2.85-.18,height+z),(-17.05,side*2.85+.18,height+z+.5)],.025,6)
        tube(group,"Cyan",[(-16.59,side*2.07,height+.44),(-16.59,side*2.07,height+3.09)],.022,6)
    tube(group,"Silver",[(-17.05,-3.02,height+3.3),(-17.05,3.02,height+3.3)],.05,6)

def buffet():
    box("LowerFixtures","Dark",(1,0,3.03),(13,1.26,.96))
    box("LowerFixtures","Silver",(1,0,3.52),(13.1,1.32,.04))
    for i in range(8):
        x=-4.6+i*1.5
        box("LowerFixtures","Silver",(x,0,3.67),(.96,.78,.28))
        box("LowerFixtures","Dark",(x,0,3.82),(.82,.64,.025))
        tube("LowerFixtures","Silver",[(x-.2,0,3.84),(x-.2,0,3.93),(x+.2,0,3.93),(x+.2,0,3.84)],.024,6)

def lower_windows():
    # Near side is sectioned low for chair visibility; far side keeps cabin identity.
    for side in [-1,1]:
        box("LowerCutWindows","Pearl",(-.5,side*4.87,2.78),(25,.16,.48))
        tube("LowerCutWindows","Cyan",[(-12.7,side*4.97,3.03),(11.9,side*4.97,3.03)],.03,6)
        height=1.65 if side==1 else .37
        for x in [-12,-9,-6,-3,0,3,6,9,11.8]:
            box("LowerCutWindows","Silver",(x,side*4.87,3+height/2),(.08,.1,height+.03))
        box("LowerCutWindows","Glass",(-.1,side*4.87,3.03+height/2),(23.8,.035,height))
        box("LowerCutWindows","Pearl",(-.1,side*4.87,3.07+height),(24.0,.17,.13))

def canopy():
    # Signature stern canopy with swept supports and an open panoramic middle.
    box("Canopy","Pearl",(13.7,0,8.05),(12.3,9.7,.22))
    box("Canopy","Dark",(13.7,0,7.92),(11.9,9.4,.04))
    for side in [-1,1]:
        # Swept S supports, a distinctive feature in the stern reference photos.
        for mirrored in [False,True]:
            profile=[(7.2,5.24),(8.45,5.24),(9.1,5.45),(9.45,5.75),(9.55,6.0),(9.48,6.24),
                     (9.2,6.48),(8.68,6.78),(8.22,7.16),(7.96,7.54),(7.85,8.03),
                     (7.23,8.03),(7.38,7.48),(7.63,7.03),(8.05,6.6),(8.53,6.23),
                     (8.7,6.0),(8.62,5.78),(8.3,5.58),(7.85,5.45),(7.2,5.43)]
            if mirrored: profile=[(27.0-x,z) for x,z in profile]
            vs=[(x,side*y,z) for y in [4.62,4.86] for x,z in profile]
            n=len(profile); fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]
            fs.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
            mesh("Canopy","Pearl",vs,fs)
            tube("Canopy","Cyan",[(x,side*4.879,z) for x,z in profile],.028,6,True)
        tube("Canopy","Cyan",[(7.55,side*4.9,8.02),(19.82,side*4.9,8.02)],.04,8)
    for x in [10,13,16,18]:
        for y in [-3,0,3]: box("Canopy","Warm",(x,y,7.885),(.12,.12,.035))

def wheelhouse():
    # Forward raised, swept pilot house is visible in Unicorn's bow reference.
    vs=[(-16.1,-2.1,5.27),(-11.2,-2.1,5.27),(-11.2,2.1,5.27),(-16.1,2.1,5.27),
        (-14.5,-1.8,7.13),(-12.2,-1.8,7.13),(-12.2,1.8,7.13),(-14.5,1.8,7.13)]
    mesh("Wheelhouse","Pearl",vs,[(0,1,2,3),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0),(4,7,6,5)])
    for side in [-1,1]:
        panel("Wheelhouse","Glass",[(-15.45,side*2.015,5.85),(-11.58,side*2.015,5.85),(-12.23,side*1.845,6.94),(-14.55,side*1.845,6.94)],(0,-side*.035,0))
        tube("Wheelhouse","Cyan",[(-16.2,side*2.1,5.3),(-14.6,side*1.88,7.18),(-12.1,side*1.88,7.18),(-11.1,side*2.1,5.3)],.04,6)
    panel("Wheelhouse","Glass",[(-15.826,-1.8,5.6),(-14.638,-1.55,6.98),(-14.638,1.55,6.98),(-15.826,1.8,5.6)],(.035,0,0))
    box("Wheelhouse","Pearl",(-13.35,0,7.22),(3.05,4.05,.18))

def furniture():
    # Presentation furniture only: does not represent sale capacity or seat IDs.
    for x in [-8,-4,0,4]:
        for y in [-3,0,3]:
            box("DecorFurniture","Dark",(x,y,5.62),(.18,.18,.74))
            box("DecorFurniture","Cloth",(x,y,6.02),(2.7,1.22,.08))
            for dx in [-.72,.72]:
                for side in [-1,1]:
                    cy=y+side*1.0; cx=x+dx
                    box("DecorFurniture","Dark",(cx,cy,5.72),(.5,.5,.11))
                    box("DecorFurniture","Dark",(cx,cy+side*.23,6.0),(.5,.065,.6))
                    for lx in [-.19,.19]:
                        for ly in [-.19,.19]: box("DecorFurniture","Dark",(cx+lx,cy+ly,5.477),(.045,.045,.466))
                    # Woven effect, legible as horizontal back slats at close range.
                    for z in [5.78,5.89,6.0,6.11,6.22]: box("DecorFurniture","Champagne",(cx,cy+side*.268,z),(.46,.012,.016))
            for dx in [-.72,.72]:
                for sy in [-.32,.32]:
                    box("DecorFurniture","Pearl",(x+dx,y+sy,6.07),(.36,.30,.025))
            box("DecorFurniture","Champagne",(x,y,6.13),(.12,.12,.18))
            box("DecorFurniture","Warm",(x,y,6.25),(.14,.14,.09))

def branding():
    for side in [-1,1]:
        # Stylized line-art unicorn, traced as a new interpretation of the photo.
        profile=[(-18.2,3.85),(-17.9,4.02),(-17.7,4.12),(-18.35,4.7),(-17.48,4.15),
                 (-17.45,4.42),(-17.25,4.12),(-17.13,3.85),(-16.9,3.65),(-16.4,3.76),
                 (-15.9,3.78),(-15.4,3.58),(-15.03,3.45),(-14.68,3.68),(-14.45,3.59),
                 (-14.8,3.32),(-15.15,3.25),(-14.4,2.8),(-14.65,2.73),(-15.5,3.15),
                 (-16.3,3.07),(-16.85,2.79),(-17.55,2.95),(-17.35,3.13),(-16.9,3.15),
                 (-17.3,3.55),(-17.7,3.7),(-18.15,3.63),(-18.2,3.85)]
        # Hull side width is interpolated; logo lies on the curved hull side.
        def width(x):
            for (a,wa),(b,wb) in zip(stations,stations[1:]):
                if a<=x<=b:return wa+(wb-wa)*(x-a)/(b-a)
            return 4
        tube("Branding","Cyan",[(x,side*(width(x)+.012),z) for x,z in profile],.036,6)
        for inner in [[(-16.98,3.5),(-16.5,3.4),(-16.1,2.85),(-16.3,2.78)],
                      [(-15.6,3.35),(-15.1,2.93),(-14.95,2.52),(-14.7,2.52)],
                      [(-17.3,3.95),(-17.0,3.7),(-16.65,3.58)]]:
            tube("Branding","Cyan",[(x,side*(width(x)+.012),z) for x,z in inner],.027,6)
        tube("BowPanel","Cyan",[(x,side*width(x),5.2) for x in [-20,-19.5,-18.6,-17.3,-15.7,-13.5,-13]],.045,8)
        # Mesh text retained on editable source; exported as geometry.
        cu=bpy.data.curves.new("UnicornBrandText", "FONT")
        cu.body="UNICORN  CRUISE"; cu.size=.65; cu.extrude=.004; cu.resolution_u=3
        ob=bpy.data.objects.new("SM_BrandText_Port" if side<0 else "SM_BrandText_Starboard",cu)
        col("BrandText").objects.link(ob); ob.location=(-7,side*5.055,4.83)
        ob.rotation_euler=(math.pi/2 if side<0 else math.pi/2,0,0 if side<0 else math.pi)
        if side>0: ob.location=(4.0,side*5.055,4.83)
        ob.data.materials.append(M["Warm"])
        dep=bpy.context.evaluated_depsgraph_get(); ev=ob.evaluated_get(dep)
        me=bpy.data.meshes.new_from_object(ev)
        old=ob.data; name=ob.name; matrix=ob.matrix_world.copy()
        bpy.data.objects.remove(ob,do_unlink=True)
        ob=bpy.data.objects.new(name,me);col("BrandText").objects.link(ob)
        ob.matrix_world=matrix
        bpy.data.curves.remove(old)
    # Continuous closed bow sheer: no open gap between the hull and upper deck.
    bow=[(x,-w) for x,w in stations if x<=-13.5]+[(-12.8,-4.62),(-12.8,4.62)]+[(x,w) for x,w in reversed(stations) if x<=-13.5]
    n=len(bow); vs=[(x,y,z) for z in [2.465,5.235] for x,y in bow]
    fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    fs.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    mesh("BowPanel","Pearl",vs,fs)

hull()
floor_details("UpperFloor",5.25)
floor_details("LowerFloor",2.55,True)
railing("UpperRails",5.25)
lower_windows()
stairs("Stairs",5.25)
stage("UpperStage",5.25)
stage("LowerFixtures",2.55)
buffet()
canopy(); wheelhouse(); furniture(); branding()

# Compile material batches to keep each model to a few dozen draw calls.
for (group,material),(vs,fs) in GEOM.items():
    me=bpy.data.meshes.new("ME_"+group+"_"+material)
    me.from_pydata(vs,[],fs); me.update()
    bm=bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:])
    bmesh.ops.triangulate(bm,faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    # Separate face-local planar UVs deliberately stack; solid PBR has no texture bake.
    uv=me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        axis=max(range(3),key=lambda j:abs(poly.normal[j])); dims=[j for j in range(3) if j!=axis]
        for li in poly.loop_indices:
            v=me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv=(v[dims[0]]*.05,v[dims[1]]*.05)
    ob=bpy.data.objects.new("SM_"+group+"_"+material,me)
    col(group).objects.link(ob); ob.data.materials.append(M[material])
    ob["role"]=group
    ob["surveyed"]=False

# Real apertures at the stairs keep the cutaway from drawing stair treads through
# a solid floor. The same apertures are used for full exterior and upper cutaway.
for side in [-1,1]:
    me=bpy.data.meshes.new("ME_StairAperture")
    cx,cy,cz=15.45,side*3.65,5.15
    sx,sy,sz=3.85/2,1.61/2,.65/2
    vs=[(cx+a*sx,cy+b*sy,cz+c*sz) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    me.from_pydata(vs,[],[(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)])
    me.materials.append(M["Floor"])
    cutter=bpy.data.objects.new("CUT_Stairs",me);col("WorkingCutters").objects.link(cutter)
    for ob in list(COLS["UpperFloor"].objects):
        if ob.name.endswith("Floor"):
            mod=ob.modifiers.new("StairAperture","BOOLEAN");mod.operation="DIFFERENCE";mod.object=cutter;mod.solver="EXACT"
            with bpy.context.temp_override(object=ob,active_object=ob,selected_objects=[ob],selected_editable_objects=[ob]):
                bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

base={"Hull","Cabin","UpperFloor","UpperRails","LowerFloor","BowPanel","Branding","BrandText","Stairs"}
variants={
    "exterior":base|{"Canopy","Wheelhouse","DecorFurniture","LowerFixtures"},
    "upper":base|{"UpperStage"},
    "lower":{"Hull","LowerFloor","LowerCutWindows","LowerFixtures","Stairs"},
}
def show_variant(which):
    groups=variants[which]
    for name,c in COLS.items():
        for o in c.objects: o.hide_render=name not in groups; o.hide_set(name not in groups)
    return [o for name,c in COLS.items() if name in groups for o in c.objects]

stats={}
for variant,groups in variants.items():
    obs=show_variant(variant)
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs: o.select_set(True)
    filepath=OUT/("unicorn-"+variant+".glb")
    bpy.ops.export_scene.gltf(filepath=str(filepath),export_format="GLB",use_selection=True,
                              export_apply=True,export_yup=True,export_extras=True,
                              export_animations=False,export_cameras=False,export_lights=False)
    stats[variant]={"file":filepath.name,"bytes":filepath.stat().st_size,
                    "mesh_objects":len(obs),"triangles":sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in obs),
                    "materials":len({s.material.name for o in obs for s in o.material_slots})}

# Presentation setup is excluded from all exports.
scene.world=bpy.data.worlds.new("World_Unicorn_Studio")
scene.world.use_nodes=True
world=next(n for n in scene.world.node_tree.nodes if n.type=="BACKGROUND")
world.inputs[0].default_value=(.12,.17,.22,1); world.inputs[1].default_value=.4
for name,loc,power,size,color in [
    ("Key",(-18,-20,32),26000,25,(1,.88,.72)),
    ("Fill",(10,20,20),18000,22,(.6,.8,1)),
    ("Rim",(22,-3,16),16000,18,(1,.7,.35)),
]:
    ld=bpy.data.lights.new("LD_"+name,"AREA"); ld.energy=power;ld.shape="DISK";ld.size=size;ld.color=color
    ob=bpy.data.objects.new("LD_"+name,ld);col("Presentation").objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector((0,0,3))-ob.location).to_track_quat("-Z","Y").to_euler()
cam_data=bpy.data.cameras.new("CAM_Hero");cam=bpy.data.objects.new("CAM_Hero",cam_data)
col("Presentation").objects.link(cam);scene.camera=cam
cam_data.type="ORTHO";cam_data.ortho_scale=48
scene.render.engine="CYCLES";scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.cycles.adaptive_threshold=.08
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG";scene.render.film_transparent=True
scene.view_settings.view_transform="AgX"
cam.location=(-34,-48,29);cam.rotation_euler=(Vector((0,0,3.5))-cam.location).to_track_quat("-Z","Y").to_euler()
show_variant("exterior")
for o in COLS["Presentation"].objects:o.hide_render=False;o.hide_set(False)
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/"unicorn-cruise.blend"))
scene.render.filepath=str(OUT/"unicorn-hero.png")
bpy.ops.render.render(write_still=True)
for variant in ["upper","lower"]:
    show_variant(variant)
    for o in COLS["Presentation"].objects:o.hide_render=False;o.hide_set(False)
    cam.location=(-24,-33,40);cam_data.ortho_scale=46
    cam.rotation_euler=(Vector((0,0,3))-cam.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=str(SOURCE/(variant+"-review.png"))
    bpy.ops.render.render(write_still=True)
manifest={"generator":"Blender "+bpy.app.version_string,"dimensions_status":"approximate, not surveyed",
          "design_dimensions_m":[40,10,8.2],"confirmed_upper_capacity":250,
          "sellable_inventory_embedded":False,"floor_y_gltf":{"upper":5.25,"lower":2.55},
          "bow_axis":"-X","source":"../../../../../assets/unicorn/unicorn-cruise.blend",
          "variants":stats,"layout_notice":"Photo-informed structure. Table positions, stage direction and stairs are provisional; runtime inventory controls booking."}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
(SOURCE/"build-statistics.json").write_text(json.dumps(stats,indent=2),encoding="utf-8")
print("@@JSON@@"+json.dumps({"ok":True,"exports":stats,"blend":str(SOURCE/"unicorn-cruise.blend")}))
