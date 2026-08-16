# 中继数据协作站

独立于 UV-K5 固件仓库、面向全国业余无线电爱好者的中继数据目录。这里展示的是当前公开数据快照，不声称覆盖全国全部台站，也不代表官方或管理部门发布。公开站点负责搜索和溯源，注册用户可以提交更新，待核验数据公开展示但不会进入固件导出；管理员在 Access 保护的后台处理高风险变更。

## 地址

- 公开站点：`https://repeater.mizuki.top`
- 管理后台：`https://admin.repeater.mizuki.top`
- 固件项目：[`HX-Wrdzgzs/uv-k5-losehu132-wrdzgzs`](https://github.com/HX-Wrdzgzs/uv-k5-losehu132-wrdzgzs)

## 本地开发

```bash
npm ci
npm run dev
```

只做静态页面构建：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

需要本地 Pages Functions 时，先构建，再用 Wrangler 连接本地 D1：

```bash
npm run build
npx wrangler pages dev dist --compatibility-date=2026-08-01
```

## 数据来源和快照

`src/data/repeaters_manifest.json` 是从固件项目 2026-08-11 截图整理构建产物同步的 K5DB v3 公开快照。当前快照的来源日期为 `20260809`，包含 960 条模拟记录和 227 个城市；纯数字记录被排除，混合台站只保留可写入 K5DB 的模拟 FM 参数。它是可追溯的公开数据快照，不声称覆盖全国全部台站，也不代表官方台站清单。

本次快照还修正了江苏省中继 `JSL005` 的收发方向：收听 `430.610 MHz`、发射 `439.610 MHz`、偏移 `+9 MHz`。构建前后会检查收发频率差与偏移字段是否一致。

更新快照后生成 D1 种子迁移：

```bash
npm run seed:sql
npm run snapshot:migration
```

`migrations/0002_seed.sql` 只包含 `published` 记录，适合初始化空数据库。`migrations/0003_sync_snapshot_20260809.sql` 用 upsert 同步当前公开快照，不删除快照以外的记录，也不触碰用户、提交、举报、审计或会话数据。`pending` 提交只能写入 `submissions`，API 的固件导出只查询 `repeaters.status = 'published'`。

## Cloudflare Pages 配置

在 Cloudflare Pages 中连接 GitHub 仓库 `HX-Wrdzgzs/uv-k5-repeater-web`：

```text
Production branch: main
Build command: npm ci && npm run build
Build output directory: dist
```

创建 D1 数据库 `mizuki-repeater`，初始化时执行 `migrations/0001_initial.sql` 和 `migrations/0002_seed.sql`；已有生产库更新公开快照时执行 `migrations/0003_sync_snapshot_20260809.sql`：

```bash
npx wrangler d1 migrations apply mizuki-repeater --remote
```

然后在 Pages 项目绑定：

```text
Binding name: DB
Database: mizuki-repeater
```

在 Pages 的 Variables and Secrets 中配置：

```text
PUBLIC_SITE_URL
ADMIN_EMAIL
RESEND_API_KEY
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_OAUTH_REDIRECT_URL
SESSION_SECRET
CF_ACCESS_TEAM_DOMAIN
CF_ACCESS_AUD
```

GitHub OAuth 回调地址必须是：

```text
https://repeater.mizuki.top/api/v1/auth/github/callback
```

Pages 自定义域名绑定 `repeater.mizuki.top` 和 `admin.repeater.mizuki.top`。在 Cloudflare Zero Trust 中只保护整个 `admin.repeater.mizuki.top`，允许管理员邮箱，默认拒绝其他访问。公开站点不要套 Access，否则普通用户的邮箱/GitHub 登录会被组织登录拦截。

## API

```text
GET  /api/v1/repeaters
GET  /api/v1/repeaters/:id
POST /api/v1/auth/email/request
POST /api/v1/auth/email/verify
GET  /api/v1/auth/email/verify?token=...（兼容旧登录链接）
GET  /api/v1/auth/me
GET  /api/v1/auth/github/start
GET  /api/v1/auth/github/callback
POST /api/v1/auth/logout
POST /api/v1/submissions
GET  /api/v1/submissions/me
POST /api/v1/reports
GET  /api/v1/admin/review
GET  /api/v1/admin/reports
POST /api/v1/admin/submissions/:id/:action
GET  /api/v1/exports/:version.json
GET  /api/v1/exports/:version.csv
```

写接口使用 HttpOnly/Secure/SameSite Cookie 会话、Origin 检查、频率限制、服务端格式校验和审计日志。邮箱登录使用 6 位一次性验证码，10 分钟过期且通过条件更新保证只能使用一次；旧的登录链接接口仍兼容，密码不会落库。`GET /api/v1/auth/me` 只返回当前会话对应的最小用户信息，前端据此显示已登录状态；退出会话使用 `POST /api/v1/auth/logout`。公开目录从 D1 读取已发布记录和待核验提交，待核验记录会明确标注且不会进入导出。管理员接口会校验 Cloudflare Access JWT 的签名、发行者、Audience、过期时间和管理员邮箱。

## 设计

最终设计令牌记录在 [`DESIGN.md`](./DESIGN.md)。公开端采用白底、近黑色文字和绿色数据产品语言；管理端使用独立的深色审核界面。参考了 `awesome-design-md` 中的 Supabase / Linear 设计分析，但没有复制 Logo 或专有素材。

## 固件公开发布

网站的公开固件包只提供公共固件和中继数据文件，不包含维护者个人使用的 `tails.bin` 或 `tails.stable.bin`。固件中的自定义尾音入口保留；被排除的是尾音资源文件，不是菜单入口或功能代码。本地源目录中的个人尾音文件不会被打包脚本修改。

当前公开包：`LOSEHU132-bin-20260816-public`

- 推荐固件：`firmware.packed.bin`
- 当前固件：`firmware.bin` / `firmware.packed.bin`
- 数据库：`repeaters.bin`，K5DB v3，960 条模拟记录，227 个城市
- 数据库 SHA-256：`FF755DCECA0602A581FDEF15CD19219EE8628C250ACC1AEF676CBE686FDDB409`
- 私人尾音资源：不包含；尾音功能入口：保留
- 网站下载目录：[`public/releases/LOSEHU132-bin-20260816-public`](./public/releases/LOSEHU132-bin-20260816-public)

发布前使用白名单打包：

```bash
npm run firmware:package -- --source H:/uv-k5-public-release/source-20260816 --output H:/uv-k5-public-release/LOSEHU132-bin-20260816-public
```

完整规则见 [`docs/firmware-release-policy.md`](./docs/firmware-release-policy.md)。

首页的版本提示读取 `public/releases/latest.json`，展示当前公开固件、K5DB 格式、数据日期和“无私人尾音资源”状态，并提供推荐固件下载入口。发布包使用白名单生成，不会上传 `tails.bin` 或 `tails.stable.bin`。

固件侧还提供以下安全工具：

```text
python tools/check_firmware_compatibility.py --firmware firmware.bin --database repeaters.bin
python tools/check_device_compatibility.py --port COM4
python tools/backup_eeprom.py --port COM4 --output backup-YYYYMMDD.bin
python tools/update_repeater_db.py COM4 repeaters.bin --verify-device
python tools/update_repeater_db.py COM4 repeaters.bin --write --confirm
```

其中写库和恢复命令默认不会写设备；`restore_eeprom.py` 默认跳过 0x1EC0–0x1ECF 的 RSSI 校准区域。刷机、写 EEPROM 和校准恢复仍需在实际设备上由维护者确认，网站不会代替硬件安全判断。

## 合规提醒

中继状态、收发差、亚音和覆盖范围会变化。网站数据仅供参考，使用前请向当地无线电管理部门、台站维护者或最新公告核对；请勿把非业余业务频率当作可发射频率。
