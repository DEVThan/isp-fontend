# Deploy หน้าเว็บ ISP (Docker)

วิธี: **build image ในเครื่อง → อัปโหลดไฟล์ image → load แล้วรันบน server**

แต่ละขั้นตอนบอกไว้ว่ารันที่ไหน — 💻 **Mac** (เครื่อง dev, prompt `w@…` ในโฟลเดอร์ project) หรือ 🖥️ **Server**
(prompt `SOFTTECH@SOFTTECH-NETWORK-01`) · คำสั่ง `scp` ต้องรันที่ **Mac** เสมอ (ส่งไฟล์จาก Mac ขึ้น server)

| | |
|---|---|
| Server | `203.151.56.169` (เครื่องเดียวกับ API production) — user `SOFTTECH` (ใช้ `sudo` + รหัสผ่าน) |
| เปิดจากข้างนอกได้ | แค่พอร์ต 80 / 443 → ทุกอย่างต้องผ่าน nginx |
| API ที่หน้าเว็บเรียก | `https://api-isp.softtechnw.com/api/web` (จาก `.env.production` — ฝังตอน build) |
| Container | ชื่อ `isp-web` · image `isp-web` · ฟัง `127.0.0.1:3001` (nginx proxy มาที่นี่) — **3000 บนเครื่องนี้มี node ของ root ใช้อยู่แล้ว** (ข้างใน container ยังเป็น 3000) |
| โดเมน | `https://isp.softtechnw.com` (nginx site `isp.softtechnw.com` + certbot — ขั้นตอนที่ 6–7) |

> 🔒 **ห้ามเขียนรหัสผ่าน server ลงไฟล์นี้** — ไฟล์อยู่ใน git ใครที่ pull ได้ก็เห็น ใส่ตอน ssh/scp ถามเท่านั้น

---

## ขั้นตอนที่ 0: เตรียมครั้งแรก (ทำครั้งเดียว) — 🖥️ Server

เช็คสถาปัตยกรรมของ server และว่ามี docker แล้วหรือยัง:

```bash
ssh SOFTTECH@203.151.56.169
uname -m              # x86_64 = ใช้ --platform linux/amd64 ตามขั้นตอนที่ 1 · aarch64 = เปลี่ยนเป็น linux/arm64
docker --version      # ไม่มี → ติดตั้ง: curl -fsSL https://get.docker.com | sudo sh
systemctl is-enabled docker containerd    # ต้อง enabled ทั้งคู่ (ไม่งั้น reboot แล้ว container ไม่กลับมา)
                                          # disabled → sudo systemctl enable docker containerd
sudo ss -ltnp | grep ':3001 '   # ต้องว่าง — ไม่ว่าง ให้ใช้เลขอื่น แล้วแก้ทั้งขั้นตอนที่ 4 และ proxy_pass ในขั้นตอนที่ 6
                                # (3000 ไม่ว่าง: node /root/… ของ root ใช้อยู่ — อย่าหยุดมัน)
```

---

## ขั้นตอนที่ 1: Build Docker Image — 💻 Mac

ที่โฟลเดอร์ `project/frontend/isp` (เปิด Docker Desktop ก่อน):

```bash
git pull
docker build --platform linux/amd64 -t isp-web .
```

- Mac ชิป M (arm64) build เป็น amd64 ต้องผ่านตัวจำลอง — รอ ~5–10 นาที
- `.env.local` ของเครื่องไม่ติดเข้า image (`.dockerignore` กันไว้) — image ชี้ API production เสมอ
- จะชี้ API ที่อื่น: `docker build --platform linux/amd64 --build-arg API_BASE_URL=https://…/api/web -t isp-web .`

---

## ขั้นตอนที่ 2: Save Image เป็นไฟล์ — 💻 Mac

```bash
docker save isp-web | gzip > isp-web.tar.gz
```

---

## ขั้นตอนที่ 3: Upload ไฟล์ไป Server — 💻 Mac (ไม่ใช่ใน ssh)

ที่โฟลเดอร์ `project/frontend/isp` ของ Mac (ที่เดียวกับที่ไฟล์ `isp-web.tar.gz` อยู่):

```bash
scp isp-web.tar.gz SOFTTECH@203.151.56.169:~/
```

ใส่รหัสผ่านเมื่อถาม (ไฟล์ ~70 MB) — ขึ้น `100%` แล้วค่อยไปขั้นตอนที่ 4
> รันบน server จะได้ `scp: stat local "isp-web.tar.gz": No such file or directory` เพราะไฟล์อยู่ที่ Mac

---

## ขั้นตอนที่ 4: SSH เข้า Server แล้ว Load + รัน — 🖥️ Server

```bash
ssh SOFTTECH@203.151.56.169
```

แล้วรัน:

```bash
# Load image (ต้องเห็นไฟล์ก่อน — ไม่มี = ขั้นตอนที่ 3 ยังไม่สำเร็จ)
ls -lh ~/isp-web.tar.gz
sudo docker load < ~/isp-web.tar.gz

# ลบ container เก่า (ถ้ามี) — rm -f หยุด+ลบในคำสั่งเดียว · ไม่มีก็ขึ้น "No such container" ไม่เป็นไร
# (ข้ามขั้นนี้แล้ว docker run จะขึ้น 'The container name "/isp-web" is already in use')
sudo docker rm -f isp-web

# Start container ใหม่ — ฟังแค่ 127.0.0.1 ให้ nginx เป็นคนรับจากข้างนอก
sudo docker run -d --name isp-web --restart unless-stopped \
  -p 127.0.0.1:3001:3000 -e TZ=Asia/Bangkok \
  --add-host api-isp.softtechnw.com:host-gateway \
  isp-web
# --add-host: เครื่องนี้เรียกโดเมนของตัวเองผ่าน IP สาธารณะไม่ได้ (ไม่มี hairpin NAT — request ค้าง)
# ให้ container วิ่งเข้า nginx ของเครื่องตรง ๆ แทน — ไม่ใส่ = หน้าเว็บเปิดได้แต่ login/โหลดข้อมูลค้าง

# เช็คว่าทำงาน
sudo docker ps | grep isp-web
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/login    # ต้องได้ 200
sudo docker exec isp-web wget -qO- -T 10 https://api-isp.softtechnw.com/api/web/ping; echo   # ต้องได้ "db":true
sudo docker ps -a --filter name=isp-web --format '{{.Status}}  {{.Ports}}'   # ต้องเป็น Up — ค้างที่ Created = start ไม่ได้ (มักเป็นพอร์ตชน)
sudo docker logs --tail 50 isp-web

# server reboot แล้วกลับมาเองไหม — ต้องได้ unless-stopped (กลับมาเอง ยกเว้นเคยสั่ง docker stop ไว้ก่อน reboot)
sudo docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' isp-web

# ลบ image เก่าที่ไม่ใช้แล้ว (ไม่บังคับ)
# sudo docker image prune -f
```

---

## ขั้นตอนที่ 5: ไฟล์อัปโหลด (รูป/โลโก้/เทมเพลต Excel) — ทำครั้งแรก

ไฟล์พวกนี้**ไม่ได้อยู่ใน image หน้าเว็บ** — หน้าเว็บส่ง `/uploads/*` ต่อไปที่ API
แต่ตอนนี้ไฟล์ทั้งหมดอยู่แค่ใน `api-isp-crm/uploads/` บนเครื่อง dev (ถูก gitignore) — production ตอบ 404 ทุกไฟล์
**ถ้าไม่ก๊อปขึ้นไป รูปสินค้า/โลโก้ไม่ขึ้น และ export ด้วยเทมเพลตใช้ไม่ได้**

ที่เครื่อง dev (โฟลเดอร์ `project/api/api-isp-crm`):

```bash
# COPYFILE_DISABLE + --no-xattrs: ไม่แถมไฟล์ ._* และข้อมูลเฉพาะ macOS (ไม่งั้น tar บน Linux เตือน
# "Ignoring unknown extended header keyword 'SCHILY.fflags'" — ไม่อันตราย แต่ได้ไฟล์ขยะติดไปด้วย)
COPYFILE_DISABLE=1 tar --no-xattrs --exclude='.DS_Store' -czf uploads.tar.gz uploads
scp uploads.tar.gz SOFTTECH@203.151.56.169:~/
```

ที่ server:

```bash
# เช็คก่อนว่า API รันเป็น user อะไร และโฟลเดอร์ uploads อยู่ที่ไหน
systemctl cat api-isp-crm | grep -E 'User|WorkingDirectory'

cd /opt/api-isp-crm
sudo tar xzf ~/uploads.tar.gz            # ได้ /opt/api-isp-crm/uploads/...
sudo find uploads \( -name '._*' -o -name '.DS_Store' \) -print -delete    # เก็บกวาดไฟล์ขยะของ macOS (ถ้ามี)
# sudo tar คง uid ของ Mac ไว้ (ได้ 501:staff) — เปลี่ยนให้ตรงกับ user ที่ API รัน
# เครื่องนี้ไม่มีบรรทัด User= ใน unit = API รันเป็น root → root:root (ถ้ามี User=xxx ให้ใช้ xxx แทน)
sudo chown -R root:root uploads

# ทดสอบ — ต้องได้ 200
curl -s -o /dev/null -w '%{http_code}\n' https://api-isp.softtechnw.com/uploads/shipping/3/logo/kerry.jpg
```

---

## ขั้นตอนที่ 6: nginx — https://isp.softtechnw.com — 🖥️ Server (ทำครั้งเดียว)

DNS `isp.softtechnw.com` (A record) ชี้มาที่ `203.151.56.169` แล้ว

สร้างไฟล์ config:

```bash
sudo tee /etc/nginx/sites-available/isp.softtechnw.com > /dev/null <<'EOF'
# หน้าเว็บ ISP — proxy ไป container isp-web (127.0.0.1:3001)
# SSL: รัน `sudo certbot --nginx -d isp.softtechnw.com` แล้ว certbot เพิ่ม listen 443 + redirect ให้เอง
server {
    listen 80;
    server_name isp.softtechnw.com;

    client_max_body_size 20m;   # อัปโหลดรูป/ไฟล์ Excel ผ่านหน้าเว็บ

    location / {
        proxy_pass http://127.0.0.1:3001;   # พอร์ตฝั่งเครื่องของ container (ขั้นตอนที่ 4)
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # ปุ่ม export / sync รอ API นาน
        proxy_read_timeout 300s;
    }
}
EOF
```

> ไม่ต้องทำ `location /api/` แยก — หน้าเว็บ (Next) ส่ง `/api/web/*`, `/api/sync/*`, `/uploads/*` ต่อไป API ให้เองแล้ว

เปิดใช้ + เช็ค:

```bash
sudo ln -s /etc/nginx/sites-available/isp.softtechnw.com /etc/nginx/sites-enabled/
sudo nginx -t                 # ต้องได้ "syntax is ok" / "test is successful"
sudo systemctl reload nginx
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: isp.softtechnw.com' http://127.0.0.1/login    # ต้องได้ 200
```

---

## ขั้นตอนที่ 7: SSL ด้วย certbot — 🖥️ Server (ทำครั้งเดียว)

เครื่องนี้ใช้ certbot อยู่แล้ว (API ก็ใช้) — ไม่ต้องทำ ZeroSSL · certbot เพิ่ม `listen 443 ssl` + redirect http → https ให้เอง และต่ออายุอัตโนมัติ

```bash
sudo certbot --nginx -d isp.softtechnw.com      # ถามเรื่อง redirect → เลือก redirect
sudo certbot renew --dry-run                    # จำลองการต่ออายุ (บนเครื่องนี้ดู ⚠️ ข้างล่าง)
# เปิดในเบราว์เซอร์: https://isp.softtechnw.com
```

### ต่ออายุ SSL อัตโนมัติ — 🖥️ Server

ใบรับรอง Let's Encrypt อายุ **90 วัน** · certbot ต่อให้เองเมื่อเหลือ **ไม่ถึง 30 วัน** — ไม่ต้องทำอะไรประจำ
แค่เช็คครั้งแรกว่ากลไก 3 ส่วนนี้พร้อม (เครื่องนี้พร้อมแล้ว ณ 06/10/2026):

**1) ตัวตั้งเวลา (timer) ต้องทำงานอยู่** — รันวันละ 2 ครั้ง

```bash
systemctl list-timers | grep -i certbot
# ต้องเห็น certbot.timer (ติดตั้งผ่าน apt) หรือ snap.certbot.renew.timer (ติดตั้งผ่าน snap)
# ไม่เห็นเลย → sudo systemctl enable --now certbot.timer
```

**2) ไฟล์ต่ออายุของโดเมนต้องเป็นแบบ nginx** — certbot จะ reload nginx ให้เองหลังได้ใบใหม่

```bash
sudo grep -E '^(authenticator|installer|account)' /etc/letsencrypt/renewal/isp.softtechnw.com.conf
# ต้องได้ authenticator = nginx · installer = nginx · account = <รหัส>
```

**3) (แนะนำ) hook reload nginx กันพลาด** — ทำครั้งเดียว ใช้กับทุกโดเมนบนเครื่อง

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null <<'EOF'
#!/bin/sh
# ได้ใบรับรองใหม่แล้ว reload nginx ให้ใช้ใบใหม่ทันที (รันเฉพาะตอนต่ออายุสำเร็จ)
nginx -t && systemctl reload nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

**ดูวันหมดอายุ / ตรวจภายหลัง**

```bash
sudo certbot certificates 2>/dev/null | grep -A1 'isp.softtechnw.com' | grep Expiry   # VALID: xx days
journalctl -u certbot.service --since '-7 days' --no-pager | tail -20                # ผลการต่ออายุรอบล่าสุด
echo | openssl s_client -connect isp.softtechnw.com:443 -servername isp.softtechnw.com 2>/dev/null \
  | openssl x509 -noout -enddate                                                      # วันหมดอายุของใบที่ nginx ใช้จริง
```

**ต่ออายุเองทันที (กรณีฉุกเฉิน)** — ใช้ server จริง ไม่ใช่ dry-run

```bash
sudo certbot renew --cert-name isp.softtechnw.com --force-renewal
```

> ⚠️ ห้ามรัน `--force-renewal` ถี่ ๆ — Let's Encrypt จำกัด 5 ใบ/โดเมนเดียวกัน/สัปดาห์
> ⚠️ `certbot renew --dry-run` บนเครื่องนี้ขึ้น `Please choose an account` — **ไม่ใช่ปัญหาจริง** (ดูตารางแก้ปัญหา)
> ℹ️ Let's Encrypt เลิกส่งอีเมลเตือนใกล้หมดอายุแล้ว (ตั้งแต่ปี 2025) — ถ้าอยากได้การแจ้งเตือน ให้ใช้บริการตรวจ SSL ภายนอก

---

## อัปเดตเวอร์ชันครั้งถัดไป

ทำขั้นตอนที่ **1 → 2 → 3 → 4** ซ้ำ (ขั้นตอน 0, 5, 6, 7 ทำครั้งเดียว)

## แก้ปัญหา

| อาการ | ดูที่ |
|---|---|
| หน้าเว็บเปิดได้ แต่ login ค้าง / ข้อมูลไม่ขึ้น | container เรียก API ไม่ถึง (เรียกโดเมนตัวเองแล้ววนกลับไม่ได้) → รันใหม่พร้อม `--add-host api-isp.softtechnw.com:host-gateway` (ขั้นตอนที่ 4) · เช็คด้วย `sudo docker exec isp-web wget -qO- -T 10 https://api-isp.softtechnw.com/api/web/ping` |
| เปิดหน้าเว็บได้ 502 Bad Gateway | container ไม่รัน → `sudo docker ps -a` / `sudo docker logs isp-web` |
| login ไม่ได้ / ข้อมูลไม่ขึ้น | API → `curl https://api-isp.softtechnw.com/api/web/ping` ต้องได้ `"db":true` |
| รูป/โลโก้ไม่ขึ้น, export ด้วยเทมเพลตพัง | ยังไม่ได้ทำขั้นตอนที่ 5 |
| ปุ่ม "อัปเดตข้อมูล" (so) ขึ้น `SO_SYNC_SSH_PASS is not set` | ค่า `SO_SYNC_*` ใน `/opt/api-isp-crm/.env` ของ API |
| `certbot renew --dry-run` ขึ้น `Please choose an account` | **ไม่ใช่ปัญหาจริง** — dry-run ใช้บัญชีของ server ทดสอบ (`/etc/letsencrypt/accounts/acme-staging-v02…` มี 2 บัญชี) · การต่ออายุจริงใช้ `account =` ในแต่ละไฟล์ `/etc/letsencrypt/renewal/*.conf` · เช็คว่า `systemctl list-timers \| grep certbot` ยังมีอยู่ก็พอ |
| หน้าเว็บยังเรียก localhost:8081 | image build ผิดที่ — ต้อง build ด้วย `docker build` (ขั้นตอนที่ 1) ไม่ใช่ `npm run build` บนเครื่อง dev |
