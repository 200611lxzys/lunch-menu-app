# 每日推送部署说明

## 当前代码状态

- 网页设置增加了每日提醒开关和小时选择，默认 08:00，取设备时区。
- Service Worker 可以显示通知；点通知会打开菜单网页。
- Worker 源码已有订阅/取消订阅 API、D1 持久化和每小时 Cron 发送逻辑。
- GitHub Actions 已加入手动部署 Worker 的工作流。
- 这些后端改动尚未部署到 Cloudflare。Cloudflare 生产 Worker 仍是此前的模型推荐版本。

## 必须配置后才能启用

1. 在 Cloudflare 建立 D1 数据库 `haohchifan-push`，将数据库返回的 ID 写到 `worker/wrangler.toml` 的 `database_id`，替换 `SET_AFTER_CREATING_D1`。
2. 在 Cloudflare Worker 的构建环境运行 `npm install`，再运行 `npx wrangler d1 migrations apply haohchifan-push --remote`。
3. 生成 VAPID 公私钥。公钥配置为 Worker 变量 `VAPID_PUBLIC_KEY`；私钥作为 Worker Secret `VAPID_PRIVATE_KEY` 保存。另设 `VAPID_SUBJECT` 为运营者可联系的 `mailto:you@example.com`。
4. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`。Token 需要 Workers Scripts Edit、D1 Edit 权限。
5. 在 Actions 手动运行 **Deploy menu Worker**。不要在 Cloudflare 新建 Hello World 服务；更新现有 `haohchifan-menu-api`。
6. 部署完成后重新载入 Pages，在手机“饮食设置”中开启提醒并授权通知。iPhone 需要 Safari 添加到主屏幕，再从主屏幕图标打开并亲自点授权。

在上述配置完成以前，页面会显示“推送服务配置中”，不会显示已开启。iPhone 的 Web Push 需要 iOS/iPadOS 16.4 或更新版本，且必须从主屏幕安装的 Web App 授权。

## 第一版通知范围

当前每日通知是菜单提醒，通知正文提示“今日四道菜已准备好”，点击后进入网页查看当天的食材与步骤。通知不会列出四道菜名称，因为现有菜单和 AI 个性化偏好都只保存在用户设备本机；要准确推送四道菜名称，需要先设计菜单的云端同步/按设备安全保存。菜单同步尚未纳入本次推送代码，不能把提醒等同于已实现完整菜单内容推送。

订阅记录含 Web Push endpoint 与加密密钥，属于敏感数据；仅用于投递通知，取消提醒时删除。Cron 按订阅时区每小时检查一次，在用户选定的本地小时发送；无效订阅会清理。
