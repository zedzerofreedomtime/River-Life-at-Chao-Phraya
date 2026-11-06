# UNICORN CRUISE — Blender asset

สร้างด้วย **Blender 5.2.2 LTS** และ Blender Agent Skills: core, scene setup, hard-surface modeling, PBR materials, lighting/lookdev, rendering, export pipelines, game optimization และ asset QA

## ขอบเขตความถูกต้อง

โมเดลนี้ถอดลักษณะจากภาพเรือในโครงการ: ตัวเรือขาว/เงิน กระจกพาโนรามายาว ไฟเส้น cyan ห้องขับด้านหน้า และหลังคาท้ายที่มีกรอบโค้งรูป S มีการตีความรายละเอียดเพื่อใช้กับเว็บ จึง **ไม่ใช่แบบเรือที่วัดขนาดจริงหรือแบบรับรองความปลอดภัย**

- สเกลทำงานประมาณ 40 × 10 เมตร เป็นค่าที่กำหนดสำหรับโมเดลและพิกัดเว็บ ไม่ใช่ขนาดเรือที่เจ้าของยืนยัน
- ความจุชั้นบน 250 คนเป็นข้อมูลที่ผู้ใช้ยืนยัน แต่ไม่ใช่จำนวนเก้าอี้เปิดขายที่ฝังในโมเดล
- โหมดตัดชั้นบนเอาห้องขับ/หลังคาออกเพื่อเห็นเก้าอี้ และแสดงเวทีตามผังตัวอย่างเดิมของระบบ ตำแหน่งเวทีและบันไดยังเป็นตำแหน่งประกอบ ไม่ได้ยืนยันจากแบบวัด
- โหมดตัดชั้นล่างลดความสูงหน้าต่างด้านใกล้กล้องและเอาเพดานออกเพื่อเลือกเก้าอี้ได้
- เฟอร์นิเจอร์ในภาพทั้งลำเป็นของประกอบภาพ ไม่มี ID ขาย ส่วน GLB ชั้นบน/ล่างไม่มีโต๊ะหรือเก้าอี้ ระบบเว็บสร้างจาก inventory ของรอบจริงเท่านั้น
- โมเดลไม่เก็บราคา วันออกเรือ สถานะจอง หรือกุญแจ API

อ้างอิงภาพหลัก: `apps/web/public/images/boat/unicorn-official-bow.webp`, `unicorn-official-stern.webp`, `unicorn-night-exterior.jpg`, `unicorn-supplied-upper-layout.webp`, `unicorn-supplied-lower-layout.webp` และบันทึกวิจัย `docs/unicorn-cruise-reference-th.md`

## ไฟล์และพิกัด

`unicorn-cruise.blend` เป็นไฟล์ต้นฉบับแก้ไขได้ แยก collection ตามตัวเรือ ชั้น พื้น เวที หน้าต่าง บันได หลังคา และวัสดุ

| ไฟล์เว็บ | triangles | mesh objects | วัสดุ | ขนาดไฟล์ |
| --- | ---: | ---: | ---: | ---: |
| unicorn-exterior.glb | 21,388 | 40 | 12 | 1,556,568 bytes |
| unicorn-upper.glb | 11,632 | 28 | 11 | 837,000 bytes |
| unicorn-lower.glb | 3,944 | 17 | 8 | 318,908 bytes |

ไฟล์อยู่ที่ `apps/web/public/models/unicorn/` พร้อมภาพ `unicorn-hero.png` และ `manifest.json`

- Blender: X ตามความยาว หัวเรือเป็น -X, Z ขึ้น
- glTF: X ตามความยาว, Y ขึ้น; exporter แปลงแกนให้แล้ว
- พื้นชั้นบน glTF Y = 5.25 และพื้นชั้นล่าง Y = 2.55
- พิกัดโต๊ะเว็บ: X = (table.x − 500) × 0.04, Z = (table.y − 290) × 0.018
- ขนาดวัตถุหลัง reimport: exterior 40.041 × 10.280 × 8.160 เมตร; upper 40.041 × 10.280 × 8.593 เมตร (รวมเวทีประกอบ); lower 40.000 × 10.130 × 6.274 เมตร (รวมบันไดขึ้นชั้นบน)

## สร้างซ้ำ

ใช้ process ใหม่เท่านั้น ไม่รัน builder ใน scene ที่ผู้ใช้กำลังทำงานอยู่ สคริปต์มี guard ปฏิเสธ scene ที่เปิดไฟล์อยู่

```powershell
& 'D:\blender\blender.exe' -b --factory-startup --python-exit-code 1 -P scripts/blender/build_unicorn.py
& 'D:\blender\blender.exe' -b --factory-startup --python-exit-code 1 -P scripts/blender/verify_unicorn.py
& 'D:\blender\blender.exe' -b --factory-startup --python-exit-code 1 -P scripts/blender/render_unicorn_night.py
```

เปลี่ยน path executable ตามเครื่องได้ `verify_unicorn.py` ใช้ skill scripts จาก `%USERPROFILE%/.codex/skills` หรือกำหนด `BLENDER_SKILLS` เอง

## ผลตรวจจริง

`qa-summary.json` และ `qa-{exterior,upper,lower}.json` เป็นผลจากการ reimport GLB แล้วเรียก `blender-asset-qa/scripts/qa_check.py` profile `game`:

- ผ่านทั้ง 3 โมเดล: errors = 0, ไม่มี z-fighting และชิ้นส่วนลอยที่ตรวจพบ
- ตรวจจำนวน triangle, transforms, normals, topology, materials และไฟล์ส่งออกจริง
- ตรวจภาพ material และ wireframe สี่มุม (`material-review.png`, `wire-review.png`) พร้อมภาพ cutaway และ hero
- แก้ช่องว่างหัวเรือ, แผ่นกระจกลอย, พื้นบังบันได, ผิวซ้อนที่เส้นยาแนวและขอบ LED ระหว่างการตรวจ

คำเตือนที่ยอมรับโดยมีเหตุผล (exterior 51, upper 33, lower 21 รายการ มีรายละเอียดทุกชิ้นใน JSON):

1. **Duplicate vertices จาก reimport GLB:** vertices แยกตาม hard normal/UV seam เป็นพฤติกรรมการส่งออกผิวแข็ง ไม่ใช่ผิวหน้าซ้ำ ไม่มี loose vertices และตรวจภาพ wire แล้ว
2. **Hidden back-to-back faces:** จุดสัมผัสเช่นแผ่นกันลื่นบนขั้นบันได ขอบวัสดุเก้าอี้บนตัวเก้าอี้ พื้นกับเวที และขอบทับซ้อนด้านใน ยอมรับเพื่อให้ชิ้นส่วน/วัสดุแก้ไขแยกได้ ทั้งลำยังต่ำกว่า 22k triangles ไม่มีผิวที่หันทางเดียวกันซ้อนจนกระพริบ
3. **UV validation ไม่ใช้ในรอบ GLB QA (`uv=False`):** ใช้วัสดุ PBR สีล้วน ไม่มี image texture หรือ bake แผ่น UV ของหน้าต่าง ๆ ซ้อนกันโดยตั้งใจ การตรวจ geometry/materials ยังเปิดทั้งหมด หากเพิ่ม baked textures ต้อง unwrap ใหม่และเปิดตรวจ UV

ภาพ wire ใช้เส้นหนา 0.008 เมตรและปิด even-offset miter เพื่อไม่ให้ preset เส้นที่คำนวณตามความยาวเรือขยายเกินขนาดเก้าอี้ ไม่ได้ปรับค่าตรวจ mesh เพื่อให้ผ่าน

`mesh-stats-*.json` เป็นผลจาก skill optimization ด้วย preset `web`: ขึ้นคำเตือนเกินงบ **prop ขนาดเล็ก** 10,000 triangles/2 วัสดุในบางค่า จงใจยอมรับสำหรับเรือทั้งลำที่มีหลายส่วน (exterior 21,388 triangles, 40 draw calls; upper 11,632/28; lower 3,944/17) ยังต้องทดสอบความเร็วบนอุปกรณ์เป้าหมายจริง จึงไม่กล่าวว่า performance ผ่านทุกเครื่อง

`scene-audit.json` ตรวจต้นฉบับทั้ง 52 objects พบ origin ของบางส่วนอยู่ไกลจากศูนย์ geometry เพราะใช้ origin ร่วมของลำเรือให้พิกัดตรงกับเว็บ และตัวอักษรสองฝั่งมี rotation โดยตั้งใจให้หันออกคนละด้าน ยืนยันว่า scale เป็น 1 ไม่มี image path หายหรือ library ภายนอก

สคริปต์ verify จะเขียนรายงานก่อน แล้วจบด้วย error หากมี asset QA error เพื่อให้ `--python-exit-code 1` ทำหน้าที่เป็น gate ได้จริง

GLB ใช้วัสดุสีล้วนแบบมาตรฐานและ emissive โดยไม่ต้องใช้ Draco/Meshopt decoder เพิ่ม สามารถโหลดด้วย Three.js GLTFLoader ที่มีอยู่ในโครงการได้
