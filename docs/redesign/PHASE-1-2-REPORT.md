# MindEase: Redesign และ Admin Dashboard
## รายงาน Phase 1 (วิเคราะห์ระบบเดิม) และ Phase 2 (แผน UX/UI)

> สถานะ: **รอการอนุมัติ** ยังไม่ได้แก้ไขโค้ด ฐานข้อมูล หรือ dependencies ใดๆ
> Mockup ของหน้าจอใหม่: https://claude.ai/artifact/NZ35FPrps2j7dKTAnyTjn1 (เป็นลิงก์ส่วนตัว ต้องกดแชร์ก่อนคนอื่นจึงจะเปิดได้)
> วันที่จัดทำ: 9 พ.ย. 2569

---

## 1. รายงานวิเคราะห์ระบบเดิม (Phase 1)

### 1.1 เทคโนโลยีที่ใช้อยู่จริง

| หัวข้อ | ที่พบในโปรเจกต์ |
| --- | --- |
| Frontend Framework | React 18.3 + TypeScript 5.6 + Vite 5 (`web/`) |
| Routing | react-router-dom 6.28 (`web/src/App.tsx`) |
| Backend Framework | Node 24 + Express 4.21 (`api/src/server.ts`) โค้ด TypeScript รันตรงด้วย type stripping ของ Node |
| Database | SQLite ผ่าน `node:sqlite` (built-in ของ Node 24) ไฟล์ `/data/mindease.db` บน Docker volume |
| Authentication | Session cookie `me_session` (httpOnly, sameSite=lax) เก็บ token แบบ SHA-256 hash ในตาราง `sessions` รหัสผ่านเก็บด้วย scrypt มี rate limit แบบ in-memory สำหรับ login/register |
| API Structure | REST JSON ภายใต้ `/api/*` ทุก endpoint ยกเว้น auth/health ผ่าน `requireUser` |
| UI Component Library | **ไม่มี** เขียนเองทั้งหมด (`web/src/components/ui.tsx`, `Icon.tsx`, `Avatar.tsx`) |
| Chart Library | **ไม่มี** มีกราฟ SVG เขียนเอง (`ScoreGauge`, `BandScale`, `TrendChart` ใน `ui.tsx`) |
| CSS Framework | **ไม่มี** ใช้ CSS ล้วนไฟล์เดียว `web/src/styles.css` (CSS variables, โทนพาสเทลครีม/ม่วง) |
| ฟอนต์ | Mitr (หัวข้อ) + IBM Plex Sans Thai Looped (เนื้อหา) จาก Google Fonts รองรับภาษาไทยดีแล้ว |
| Deployment | Docker Compose: `web` (nginx เสิร์ฟ static + proxy `/api`) และ `api` (อยู่ใน network ภายใน) |
| Shared code | `shared/assessments.ts` นิยามแบบประเมิน 9 ชุด, เกณฑ์, ฟังก์ชันให้คะแนน ใช้ร่วมกันทั้ง web และ api |

### 1.2 โครงสร้างโฟลเดอร์

```
shared/assessments.ts      นิยามแบบประเมิน + validateAnswers + scoreAssessment
api/src/server.ts          ทุก route ของ API (260 บรรทัด)
api/src/db.ts              สร้างตารางด้วย CREATE TABLE IF NOT EXISTS (ไม่มีระบบ migration)
api/src/auth.ts            hash รหัสผ่าน, session, rate limit
web/src/App.tsx            routing
web/src/api.ts             client ของ API + type
web/src/auth.tsx           AuthProvider / RequireAuth
web/src/components/        ui.tsx, Icon.tsx, Avatar.tsx
web/src/pages/             10 หน้า (ดูข้อ 1.3)
web/src/styles.css         สไตล์ทั้งหมด
```

### 1.3 หน้าเว็บและ Routing

| Path | หน้า | สิทธิ์ |
| --- | --- | --- |
| `/` | Welcome | เฉพาะยังไม่ล็อกอิน |
| `/login`, `/register` | Auth | เฉพาะยังไม่ล็อกอิน |
| `/home` | Dashboard ของผู้ใช้ (ทักทาย, บันทึกอารมณ์, streak, ผลล่าสุด, แบบประเมินยอดนิยม) | ล็อกอิน |
| `/assessments` | รายการแบบประเมิน กรองตามหมวด | ล็อกอิน |
| `/assessments/:id` | รายละเอียดแบบประเมิน + ปุ่มเริ่ม/ทำต่อ | ล็อกอิน |
| `/assessments/:id/take` | ทำแบบประเมินทีละข้อ มี progress bar, ย้อนกลับ/ถัดไป | ล็อกอิน |
| `/results/:id` | ผลการประเมิน (gauge, แถบระดับ, สรุป, คำแนะนำ, สายด่วน) | ล็อกอิน (เจ้าของเท่านั้น) |
| `/history` | ประวัติและกราฟแนวโน้มรายแบบประเมิน | ล็อกอิน |
| `/care` | กิจกรรมดูแลใจ (หายใจ ฯลฯ) | ล็อกอิน |
| `/profile` | โปรไฟล์, อวตาร, export ข้อมูล JSON, ลบบัญชี | ล็อกอิน |

ทุกหน้าถูกจำกัดความกว้างที่ `max-width: 480px` (`.app` ใน `styles.css`) คือออกแบบแบบ mobile-only บนจอ desktop จะเป็นคอลัมน์แคบกลางจอ

### 1.4 Database (ตารางที่มีอยู่จริง)

| ตาราง | คอลัมน์สำคัญ | หมายเหตุ |
| --- | --- | --- |
| `users` | id, email, password_hash, display_name, sex, avatar, notify_mood, consent_at, created_at | **ไม่มีคอลัมน์ role** |
| `sessions` | token_hash, user_id, expires_at | ไม่มี created_at/last_seen/user-agent; session หมดอายุถูกลบตอน API start |
| `results` | id, user_id, assessment_id, answers (JSON), sex, score, max_score, level, band_label, crisis, domains, created_at | 1 แถว = 1 ครั้งที่ทำ**สำเร็จ**; index `(user_id, created_at)` |
| `moods` | user_id, day, mood | อารมณ์รายวัน |

เทียบกับรายการที่ต้องตรวจในโจทย์:

| ที่ต้องตรวจ | มีหรือไม่ |
| --- | --- |
| ตารางผู้ใช้งาน | มี (`users`) |
| ตารางแบบประเมิน / คำถาม / ตัวเลือกคำตอบ | **ไม่มีใน DB** อยู่ในโค้ด `shared/assessments.ts` (แก้ได้ทาง deploy เท่านั้น) |
| ตารางคำตอบของผู้ใช้ | เก็บรวมใน `results.answers` เป็น JSON array |
| ตารางผลการประเมิน | มี (`results`) |
| ตารางประวัติการทำแบบประเมิน | `results` ทำหน้าที่นี้ แต่**เก็บเฉพาะที่ทำสำเร็จ** |
| การเริ่มทำแต่ไม่สำเร็จ | **ไม่มี** draft เก็บใน `localStorage` ของเบราว์เซอร์ (`Questionnaire.tsx`) server ไม่รู้เลย |
| ตารางประวัติการเข้าใช้งาน | **ไม่มี** |
| ตารางสิทธิ์ผู้ใช้งาน | **ไม่มี** ทุกบัญชีเท่ากันหมด |

### 1.5 API ที่มีอยู่ (ห้ามลบ ต้องคงไว้ทั้งหมด)

`GET /api/health` · `POST /api/auth/register|login|logout` · `GET /api/auth/me` · `PUT /api/profile` · `GET /api/me/export` · `DELETE /api/me` · `POST /api/results` · `GET /api/results` · `GET /api/results/:id` · `DELETE /api/results/:id` · `PUT /api/moods/today` · `GET /api/moods` · `GET /api/stats`

ทุก endpoint ที่คืนข้อมูลกรองด้วย `user_id` ของ session จึงไม่มี endpoint ใดเปิดข้อมูลข้ามผู้ใช้ ซึ่งถูกต้องแล้ว

### 1.6 ระบบคำนวณผลแบบประเมิน

- server คำนวณคะแนนเอง (`scoreAssessment`) ไม่เชื่อคะแนนจาก client และตรวจคำตอบด้วย `validateAnswers`
- รองรับข้อกลับคะแนน (`reverse`), เกณฑ์แยกเพศ (AUDIT-C), คะแนนรายด้าน (EQ), ข้อวิกฤต (PHQ-9 ข้อ 9 → `crisis`)
- ผลบันทึก `level` (good / mild / moderate / severe) และ `band_label` ลง DB ตอนส่งคำตอบ **analytics ใช้ค่าที่บันทึกไว้นี้ได้เลย ไม่ต้องคำนวณใหม่ และไม่ต้องแตะสูตรเดิม**

เกณฑ์จริงของทั้ง 9 แบบ (สรุปจาก `shared/assessments.ts`):

| แบบประเมิน | ข้อ | ทิศทาง | ระดับ (ช่วงคะแนน → level → ชื่อระดับ) | สถานะ |
| --- | --- | --- | --- | --- |
| THI-15 ดัชนีความสุขคนไทย | 15 | สูง=ดี | 0–27 moderate ต่ำกว่าคนทั่วไป · 28–34 mild เท่ากับคนทั่วไป · 35–45 good ดีกว่าคนทั่วไป | มาตรฐาน |
| ST-5 ความเครียด | 5 | ต่ำ=ดี | 0–4 good · 5–7 mild · 8–9 moderate · 10–15 severe | มาตรฐาน |
| PHQ-9 ซึมเศร้า | 9 | ต่ำ=ดี | 0–4 good · 5–9 mild · 10–14 moderate · 15–19 severe ค่อนข้างรุนแรง · 20–27 severe ระดับรุนแรง | มาตรฐาน |
| AUDIT-C แอลกอฮอล์ | 3 | ต่ำ=ดี | ชาย 0–3 / หญิง 0–2 good · 4–7 / 3–7 moderate · 8–12 severe | มาตรฐาน |
| EQ | 15 | สูง=ดี | 0–22 moderate · 23–33 mild · 34–45 good | **ฉบับทดลอง** |
| RQ | 5 | สูง=ดี | 0–5 moderate · 6–10 mild · 11–15 good | **ฉบับทดลอง** |
| Digital ติดเกม/หน้าจอ | 6 | ต่ำ=ดี | 0–5 good · 6–11 mild · 12–18 severe | **ฉบับทดลอง** |
| Memory ความจำ/สมาธิ | 5 | ต่ำ=ดี | 0–4 good · 5–9 mild · 10–15 moderate | **ฉบับทดลอง** |
| Burnout หมดไฟ | 5 | ต่ำ=ดี | 0–4 good · 5–9 mild · 10–15 severe | **ฉบับทดลอง** |

ข้อสังเกตที่กระทบการออกแบบ Risk Analytics:
1. **`level` ไม่ได้มีครบ 4 ระดับในทุกแบบ** (THI-15/EQ/RQ สูงสุดแค่ moderate, AUDIT-C ไม่มี mild, Digital/Burnout ไม่มี moderate) การรวมทุกแบบเป็นโดนัทเดียวทำได้ แต่ต้องอธิบายว่าเป็น "ระดับสีตามเกณฑ์ของแต่ละแบบ" และการเปรียบเทียบหลักควรเป็น**รายแบบประเมิน โดยใช้ `band_label` จริง**
2. PHQ-9 มีสอง band ที่เป็น `severe` จึงต้องแยกด้วย `band_label` ถ้าต้องการรายละเอียด
3. 5 ใน 9 แบบเป็น "ฉบับทดลองที่ทีมพัฒนาเขียนขึ้น" (README) Dashboard ต้องติดป้ายชัดเจน และไม่ควรนำไปรวมกับแบบมาตรฐานโดยไม่แยก

### 1.7 Dependencies

- api: `express`, `cookie-parser` เท่านั้น
- web: `react`, `react-dom`, `react-router-dom` + dev tools
- ไม่มี chart, PDF, Excel, test framework หรือ linter
- ข้อสังเกต: เครื่องพัฒนาต้องใช้ Node ≥ 24 (`node:sqlite`)

### 1.8 ส่วนที่นำกลับมาใช้ได้

- `shared/assessments.ts` ทั้งไฟล์: ชื่อ, จำนวนข้อ, เวลา, `status`, `bandsFor()` ใช้สร้าง legend/ชื่อระดับใน Dashboard ได้โดยไม่ต้องกำหนดเกณฑ์ใหม่
- `results.level / band_label / crisis / created_at` เพียงพอสำหรับ Risk Analytics และ "ทำสำเร็จ" ทั้งหมด
- `requireUser`, session, `toIso`, การตั้ง `Cache-Control: no-store` ต่อยอดเป็น `requireAdmin` ได้
- คอมโพเนนต์ `ScoreGauge`, `BandScale`, `TrendChart`, `LevelChip`, `CrisisNotice`, `Disclaimer`, `HelpLineCard`, `Icon` ปรับสีแล้วใช้ต่อได้
- Logic ของ Questionnaire (draft, ข้อเพศ, crisis notice) เก็บไว้ทั้งหมด เปลี่ยนเฉพาะหน้าตา

### 1.9 ปัญหาในโครงสร้างเดิมที่พบ (รายงานก่อน ยังไม่แก้)

| # | ปัญหา | ผลกระทบ |
| --- | --- | --- |
| P1 | ไม่มีระบบ role/สิทธิ์ | ต้องเพิ่มก่อนทำ Admin ใดๆ |
| P2 | Draft อยู่ใน localStorage | นับ "เริ่มทำ / ไม่สำเร็จ / completion rate" ไม่ได้เลยจากข้อมูลเดิม |
| P3 | ไม่มี log การเข้าใช้งาน | นับ visits, DAU/MAU, ช่วงเวลาใช้งาน, อุปกรณ์, ผู้ใช้กลับมาใช้ซ้ำ (ตามการเข้าระบบ) ไม่ได้ |
| P4 | `ON DELETE CASCADE` + `DELETE /api/results/:id` | เมื่อผู้ใช้ลบบัญชี/ผล สถิติย้อนหลังจะลดลง (ถูกต้องตามหลัก PDPA แต่ต้องอธิบายใน Dashboard ว่าตัวเลขย้อนหลังเปลี่ยนได้) |
| P5 | `created_at` เป็น UTC (`datetime('now')`) | การจัดกลุ่มรายวัน/รายเดือนต้องแปลงเป็นเวลาไทย (+7) ไม่เช่นนั้นผลช่วง 00:00–07:00 จะตกไปวันก่อน |
| P6 | ไม่มี migration framework | การเพิ่มคอลัมน์ (`ALTER TABLE`) ต้องเขียนแบบตรวจก่อนเพิ่มเองใน `db.ts` |
| P7 | `README.md` เข้ารหัสเป็น UTF-16 | แสดงผลเพี้ยนในบางเครื่องมือ (เช่น `cat`, diff บางตัว) |
| P8 | `tooManyAttempts` เก็บ Map ใน memory ไม่เคยล้าง key | หน่วยความจำโตช้าๆ ตามจำนวน IP (ความเสี่ยงต่ำ) |
| P9 | "แบบประเมินยอดนิยม" ใน `/home` เป็นรายการตายตัว (`POPULAR`) | ไม่ใช่ยอดนิยมจริง อาจเปลี่ยนให้ดึงจาก analytics ภายหลัง (ถ้าอนุมัติ) |
| P10 | ไม่มีชุดทดสอบอัตโนมัติ | Phase 5 ต้องเพิ่มการทดสอบสูตรคะแนนก่อน refactor UI เพื่อกัน regression |

---

## 2. รายงาน UX/UI ที่ควรปรับปรุง

| พื้นที่ | สภาพปัจจุบัน | ข้อเสนอ |
| --- | --- | --- |
| Layout | จำกัด 480px ทุกจอ | Responsive: mobile คงโครงเดิม (bottom nav), tablet/desktop ใช้ top nav + เนื้อหากว้างสูงสุด ~1200px |
| ธีมสี | ครีม/ม่วงพาสเทล (Friendly) | Clean Medical Blue: Primary `#1D4F91`, Secondary `#DCEAFB`, BG `#F4F8FD` คงความเป็นมิตรด้วยมุมโค้งและอวตารเดิม |
| สีระดับผล | good เขียว / mild เหลือง / moderate ส้ม / severe ชมพู | คงความหมายเดิม ปรับ shade ให้ contrast ≥ 4.5:1 กับข้อความ และต่างกันที่ความสว่างด้วย ไม่ใช่แค่ hue |
| Landing | ภาพอวตาร + ปุ่ม "เริ่มต้นเลย" ไม่มีรายการแบบประเมิน | Hero + CTA "เริ่มทำแบบประเมิน" + 3 จุดเด่น + การ์ด 9 แบบประเมิน + "ก่อนเริ่มประเมิน" + สายด่วน 1323 (ดู mockup A) |
| เลือกแบบประเมิน | กรองตามหมวดได้ ไม่มีค้นหา | เพิ่มช่องค้นหา (ชื่อ/รหัส), แสดงจำนวนข้อ + เวลา, ป้าย "ทำต่อ" จาก draft, ป้าย "ฉบับทดลอง" (mockup B) |
| ทำแบบประเมิน | ดีอยู่แล้ว (ทีละข้อ, progress) | ปุ่มตัวเลือกสูง ≥ 56px แสดงคะแนนของตัวเลือก, ตัวนับ "3 / 15" มุมขวา, ปุ่ม "ถัดไป" disabled จนกว่าจะเลือก (mockup C) |
| ผลการประเมิน | ครบ (gauge, แถบระดับ, คำแนะนำ) | ใส่ชื่อระดับใต้แถบสี, แยกการ์ด "สรุปผล" / "คำแนะนำ", เพิ่มปุ่ม **พิมพ์ / บันทึก PDF** (mockup D) |
| PDF | ไม่มี | ใช้ `window.print()` + `@media print` stylesheet (ไม่ต้องติดตั้ง library, บันทึก PDF ได้จากหน้าพิมพ์ของเบราว์เซอร์) |
| การเข้าถึง | มี aria-label, focus ring | คงไว้ ตรวจ contrast ชุดสีใหม่ เป้าหมายกดได้ ≥ 44px |

---

## 3. โครงสร้างหน้าจอใหม่

### ผู้ใช้ทั่วไป (คง route เดิมทั้งหมด)

```
/ (Landing, public)            ← ออกแบบใหม่
/login, /register              ← ปรับธีม
/home                          ← ปรับธีม + responsive
/assessments                   ← + ค้นหา, + ป้ายจำนวนข้อ/เวลา/ทำต่อ
/assessments/:id               ← ปรับธีม
/assessments/:id/take          ← ปรับธีม (logic เดิม)
/results/:id                   ← + ปุ่มพิมพ์/PDF, print stylesheet
/history, /care, /profile      ← ปรับธีม
```

### ผู้ดูแลระบบ (ใหม่ แยก layout และ route prefix)

```
/admin                         Dashboard ภาพรวม (mockup E)
/admin/users                   สถิติผู้ใช้งาน
/admin/assessments             สถิติแบบประเมิน
/admin/risk                    วิเคราะห์ระดับความเสี่ยง (mockup F)
/admin/reports                 รายงานผล + Export CSV / พิมพ์-PDF
/admin/assessment-config       จัดการแบบประเมิน (เปิด/ปิดการใช้งานเท่านั้น ไม่แก้ข้อคำถาม/เกณฑ์)
/admin/roles                   จัดการผู้ใช้งานและสิทธิ์
/admin/settings                ตั้งค่าระบบ (เช่น เกณฑ์ขั้นต่ำการแสดงกลุ่มย่อย)
```

Layout: Sidebar ซ้าย (พับเป็นแถวบนสุดบนมือถือ) + Top bar (ชื่อหน้า, ตัวเลือกช่วงเวลา วันนี้/7 วัน/30 วัน/รายเดือน/รายปี/กำหนดเอง, ปุ่ม Export, บัญชีผู้ดูแล)

---

## 4. Admin Dashboard Mockup

ดูใน canvas: https://claude.ai/artifact/NZ35FPrps2j7dKTAnyTjn1

| Artboard | เนื้อหา |
| --- | --- |
| A | Landing (desktop, responsive) |
| B, C, D | เลือก / ทำ (กดได้จริงในโหมด Play) / ผล (mobile) |
| E | Admin ภาพรวม: 8 KPI cards, กราฟผู้ใช้รายวัน, แท่งเริ่มทำ vs สำเร็จ, ตารางสรุป, โดนัทระดับผล, กิจกรรมล่าสุดแบบรวม |
| F | Admin Risk: การ์ดตามระดับ, Stacked 100% ต่อแบบประเมินด้วยชื่อระดับจริง, แนวโน้มรายเดือน, อันดับแบบที่พบผลระดับสูง |

ตัวเลขใน mockup เป็นภาพประกอบเท่านั้น ช่องที่ยังเก็บข้อมูลไม่ได้มีป้ายสีส้ม **"ต้องเพิ่มการเก็บข้อมูล"**

---

## 5. รายการ KPI (เบื้องต้น รายละเอียดสูตรเต็มใน Phase 3)

สถานะ: ✅ ทำได้จากข้อมูลเดิม · 🟠 ต้องเพิ่มการเก็บข้อมูล (ข้อ 6) · เวลาทั้งหมดคิดเป็นเวลาไทย

| KPI | สูตร (ร่าง) | แหล่งข้อมูล | สถานะ |
| --- | --- | --- | --- |
| ผู้ใช้ทั้งหมด (สมัคร) | `COUNT(*) FROM users` | users | ✅ |
| ผู้ใช้ใหม่ในช่วง | `COUNT(*) users WHERE created_at ∈ ช่วง` | users | ✅ |
| ผู้ใช้ที่ทำแบบประเมิน (ไม่ซ้ำ) | `COUNT(DISTINCT user_id) results ∈ ช่วง` | results | ✅ |
| ผู้ใช้กลับมาทำซ้ำ | ผู้ใช้ที่มีผล ≥ 2 วันต่างกัน ในช่วง | results | ✅ (นิยามตามการทำแบบประเมิน) |
| ทำแบบประเมินสำเร็จ | `COUNT(*) results ∈ ช่วง` แยกตาม assessment_id | results | ✅ |
| แบบประเมินที่เปิดใช้ | จำนวนใน `ASSESSMENTS` (ลบที่ถูกปิดใน config) | shared + config | ✅ |
| ระดับผลแต่ละระดับ / ร้อยละ | `COUNT GROUP BY assessment_id, level, band_label` ÷ ผลรวมของแบบนั้น | results | ✅ |
| แนวโน้มรายเดือน/รายปี | GROUP BY `strftime('%Y-%m', created_at,'+7 hours')` | results | ✅ |
| Crisis (PHQ-9 ข้อ 9) | `COUNT(*) WHERE crisis=1` (แสดงเมื่อ ≥ 5) | results | ✅ |
| การเข้าใช้ทั้งหมด / วันนี้ / เดือนนี้ | นับ event `login` + `session_resume` | ตารางใหม่ | 🟠 |
| DAU / MAU (เข้าระบบ) | `COUNT(DISTINCT user_id)` ของ event ต่อวัน/เดือน | ตารางใหม่ | 🟠 |
| เริ่มทำแบบประเมิน | `COUNT(*) attempts ∈ ช่วง` | ตารางใหม่ | 🟠 |
| ไม่สำเร็จ / Completion rate | ไม่สำเร็จ = attempts ที่ไม่มี completed_at และเริ่มเกิน 24 ชม.; rate = สำเร็จ ÷ เริ่ม | ตารางใหม่ | 🟠 |
| ช่วงเวลาที่ใช้มากที่สุด | GROUP BY ชั่วโมงไทยของ event | ตารางใหม่ | 🟠 |
| อุปกรณ์ Mobile/Tablet/Desktop | จัดประเภทจาก User-Agent **ตอนบันทึก** เก็บแค่ประเภท | ตารางใหม่ | 🟠 |

หลักการที่ยึด: แยกนับคน (DISTINCT user_id) กับนับครั้ง, แยกเริ่ม/สำเร็จ, วิเคราะห์ความเสี่ยงจาก `results` เท่านั้น (คือทำครบแล้วเท่านั้น), ใช้ `level`/`band_label` ที่บันทึกไว้แล้ว ไม่คำนวณเกณฑ์ใหม่

---

## 6. Database ที่เสนอให้เพิ่ม (รออนุมัติ ไม่แก้ตารางเดิมนอกจากเพิ่มคอลัมน์)

```sql
-- 1) สิทธิ์ (เพิ่มคอลัมน์ ค่าเริ่มต้นไม่กระทบผู้ใช้เดิม)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';   -- 'user' | 'analyst' | 'admin'
-- admin คนแรกตั้งผ่าน env ADMIN_EMAILS หรือสคริปต์ CLI ไม่มีหน้าให้ตั้งตัวเองเป็น admin

-- 2) การเริ่ม/จบแบบประเมิน (ไม่เก็บคำตอบระหว่างทำ)
CREATE TABLE assessment_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  result_id INTEGER REFERENCES results(id) ON DELETE SET NULL
);
CREATE INDEX attempts_started ON assessment_attempts(started_at, assessment_id);

-- 3) การใช้งาน (minimal, ไม่มี IP, ไม่มี UA เต็ม)
CREATE TABLE usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,              -- 'login' | 'session_resume'
  device TEXT,                     -- 'mobile' | 'tablet' | 'desktop'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX usage_created ON usage_events(created_at, type);

-- 4) index สำหรับ analytics บนตารางเดิม (ไม่เปลี่ยนข้อมูล)
CREATE INDEX results_created ON results(created_at, assessment_id);

-- 5) เปิด/ปิดแบบประเมิน (ไม่แตะข้อคำถามหรือเกณฑ์)
CREATE TABLE assessment_settings (assessment_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1);

-- 6) audit log การกระทำของ admin (เช่น export, เปลี่ยนสิทธิ์)
CREATE TABLE admin_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id INTEGER, action TEXT, detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
```

ข้อจำกัด: ข้อมูลที่เกิดก่อนเพิ่มตาราง 2–3 **ไม่มีย้อนหลัง** Dashboard จะแสดง "เริ่มเก็บข้อมูลเมื่อ [วันที่]" แทนการเดาค่า

---

## 7. API ที่เสนอให้เพิ่ม (ทุกตัวผ่าน `requireAdmin` ไม่แตะ API เดิม)

| Method | Path | คืนค่า |
| --- | --- | --- |
| POST | `/api/attempts` | (ผู้ใช้) บันทึกการเริ่มทำ คืน `attemptId`; `POST /api/results` รับ `attemptId` เพิ่มแบบ optional เพื่อปิด attempt |
| GET | `/api/admin/overview?from&to` | KPI cards |
| GET | `/api/admin/usage?from&to&granularity=day\|month` | time series ผู้ใช้/การเข้าใช้ |
| GET | `/api/admin/assessments?from&to` | ต่อแบบ: started, completed, incomplete, completionRate |
| GET | `/api/admin/risk?from&to&assessmentId&granularity` | ต่อแบบ × ระดับ: count, percent, ชื่อระดับ (จาก `bandsFor`) |
| GET | `/api/admin/activity` | สรุปกิจกรรม 24 ชม./7 วัน แบบรวม |
| GET | `/api/admin/reports/:type.csv?from&to` | CSV (UTF-8 BOM ให้ Excel อ่านภาษาไทยได้) |
| GET/PUT | `/api/admin/assessment-settings` | เปิด/ปิดแบบประเมิน |
| GET/PUT | `/api/admin/roles` | รายการบัญชีที่มีสิทธิ์ admin/analyst, เปลี่ยน role (admin เท่านั้น) |

กติกาความเป็นส่วนตัวที่บังคับใน API: คืนเฉพาะข้อมูลรวม ไม่มี email/ชื่อ/answers; กลุ่มที่ n < 5 คืนเป็น `"<5"`; จำกัดช่วงวันที่สูงสุด (เช่น 5 ปี); ทุก export ลง `admin_audit`

Export Excel: เสนอใช้ **CSV ที่ Excel เปิดได้** แทนการติดตั้ง library `.xlsx` (ไม่มี dependency ใหม่) · PDF: หน้า report แบบ print stylesheet + `window.print()` · กราฟ: เสนอ**ขยาย SVG เดิม**ใน `ui.tsx` (Line/Bar/Stacked/Donut) แทนการติดตั้ง Chart library เพื่อไม่เพิ่ม dependency; ถ้าต้องการ tooltip/zoom ขั้นสูงค่อยพิจารณา Recharts (~100 KB gzip) โดยขออนุมัติก่อน

---

## 8. แผนพัฒนาแยกตาม Phase

| Phase | งาน | ต้องอนุมัติ |
| --- | --- | --- |
| 1–2 | (ฉบับนี้) วิเคราะห์ + แผน UX/UI + mockup | ✅ ส่งแล้ว |
| 3 | KPI dictionary ฉบับเต็ม (นิยาม, สูตร SQL, filter, ข้อจำกัด) + ยืนยัน schema ข้อ 6 | schema, นิยาม "ไม่สำเร็จ", เกณฑ์ n<5 |
| 4a | Design tokens ใหม่ใน `styles.css` + ทำ layout responsive + ปรับทุกหน้า user (ไม่แตะ logic) | — |
| 4b | Landing ใหม่, ค้นหาแบบประเมิน, หน้าผล + print/PDF | — |
| 4c | Role + `requireAdmin` + `/admin` layout + guard ฝั่ง web | role model |
| 4d | attempts + usage_events + analytics API + กราฟ SVG + reports/CSV | — |
| 5 | ทดสอบ: สูตรคะแนนเดิมทุกแบบ (snapshot), ตัวเลข Dashboard เทียบ SQL ตรง, timezone, สิทธิ์ user ≠ admin, n<5, responsive 3 ขนาด | — |

---

## 9. รายการไฟล์ที่จะต้องแก้ไข/เพิ่ม

แก้ไข (เพิ่มเติม ไม่ลบของเดิม):
- `web/src/styles.css` (tokens + responsive + print)
- `web/index.html` (theme-color)
- `web/src/App.tsx` (เพิ่ม route `/admin/*`)
- `web/src/api.ts` (เพิ่ม `role` ใน `User`, method ของ admin/attempts)
- `web/src/auth.tsx` (เพิ่ม `RequireAdmin`)
- `web/src/components/ui.tsx` (สีระดับใหม่, top nav สำหรับจอใหญ่)
- `web/src/pages/Welcome.tsx`, `AssessmentList.tsx`, `AssessmentDetail.tsx`, `Questionnaire.tsx` (เรียก `POST /api/attempts`), `ResultPage.tsx`, `Dashboard.tsx`, `History.tsx`, `SelfCare.tsx`, `Profile.tsx`, `Auth.tsx` (หน้าตา)
- `api/src/db.ts` (ตารางใหม่ + ALTER แบบตรวจก่อน)
- `api/src/server.ts` (register route ใหม่, log event ตอน login, รับ `attemptId`)
- `README.md` (แปลงเป็น UTF-8 + เอกสาร admin) — ถ้าอนุมัติ

เพิ่มใหม่:
- `api/src/admin.ts` (analytics routes + requireAdmin)
- `api/src/analytics.ts` (query functions, small-cell suppression)
- `web/src/admin/AdminLayout.tsx`, `Overview.tsx`, `UserStats.tsx`, `AssessmentStats.tsx`, `RiskAnalytics.tsx`, `Reports.tsx`, `AssessmentConfig.tsx`, `Roles.tsx`, `Settings.tsx`
- `web/src/components/charts.tsx` (LineChart, BarChart, StackedBar, Donut แบบ SVG)
- `web/src/components/DateRangePicker.tsx`, `KpiCard.tsx`

ไม่แตะ: `shared/assessments.ts` (สูตร/เกณฑ์), `api/src/auth.ts` (นอกจากอ่าน role), Docker/nginx

---

## 10. ความเสี่ยงและผลกระทบต่อระบบเดิม

| ความเสี่ยง | ระดับ | การป้องกัน |
| --- | --- | --- |
| เปลี่ยน CSS ทั้งไฟล์แล้วหน้าเดิมเพี้ยน | กลาง | ทำทีละหน้า, เทียบ screenshot ก่อน/หลัง 3 ขนาดจอ |
| Admin เห็นข้อมูลอ่อนไหวเกินจำเป็น | สูง | API คืนเฉพาะข้อมูลรวม, n<5 ซ่อน, ไม่มี endpoint รายบุคคลใน scope นี้, audit log |
| ตั้ง admin ผิดคน / ยกระดับสิทธิ์ตัวเอง | สูง | admin คนแรกผ่าน env/CLI เท่านั้น, `PUT /api/profile` ห้ามรับ `role` |
| ALTER TABLE บน DB production | กลาง | backup volume ก่อน deploy, เพิ่มคอลัมน์แบบมีค่า default, ไม่มีการแก้/ลบแถวเดิม |
| ตีความ "severe" ข้ามแบบประเมินผิด | กลาง | แสดงรายแบบด้วย `band_label` จริงเป็นหลัก, ติดป้ายฉบับทดลอง, ข้อความ "คัดกรอง ไม่ใช่วินิจฉัย" ทุกหน้า |
| ตัวเลขย้อนหลังลดลงเมื่อผู้ใช้ลบข้อมูล | ต่ำ | ระบุใน Dashboard (เป็นพฤติกรรมที่ถูกต้องตาม PDPA) |
| Timezone ทำให้นับวันผิด | กลาง | ใช้ `'+7 hours'` ใน SQL ทุก query + test เคสข้ามเที่ยงคืน |
| Performance เมื่อข้อมูลมาก | ต่ำ–กลาง | index ใหม่, aggregate ใน SQL ไม่ดึงแถวมาคำนวณใน JS, จำกัดช่วงวันที่ |
| ไม่มี test ป้องกัน regression ของสูตร | กลาง | เพิ่ม test สูตรคะแนนด้วย `node:test` (built-in ไม่ต้องติดตั้ง) ก่อนเริ่ม Phase 4 |

---

## สิ่งที่ต้องการให้ตัดสินใจก่อนเริ่ม Phase 3

1. อนุมัติทิศทาง UI ตาม mockup (สีน้ำเงินทางการแพทย์ + คงอวตาร/ฟอนต์เดิม) หรือต้องการปรับ
2. อนุมัติการเพิ่ม schema ข้อ 6 (โดยเฉพาะ `users.role`, `assessment_attempts`, `usage_events`)
3. ยืนยันว่าใช้ CSV + print-to-PDF + กราฟ SVG เขียนเอง (ไม่เพิ่ม dependency) ได้หรือไม่
4. ระดับ role ที่ต้องการ: แค่ `admin` หรือแยก `analyst` (ดูอย่างเดียว) ด้วย
5. เกณฑ์ซ่อนกลุ่มย่อย: n < 5 (เสนอ) หรือค่าอื่น
