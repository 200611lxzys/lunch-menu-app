# 好好吃饭：手机 APP 封装计划

## 产品决定

- 当前产品是手机适配的 H5/PWA。
- 第一版原生安装包采用 Capacitor 封装现有网页，复用菜单、营养估算、每周复盘和本地菜谱代码。
- 网页仍作为 GitHub Pages 版本运行；手机包由同一个 GitHub 仓库构建。
- App 名称：好好吃饭；Bundle ID：`com.lunchmenu.haohaochifan`。
- 第一阶段目标为 iPhone 内测；Android 工程也保留，方便后续生成安装包。
- DeepSeek API 密钥只留在 Cloudflare Worker，不写入网页或安装包。

## 代码与构建

根目录的 `index.html` 是唯一网页源码。运行 `npm run cap:sync` 会将网页、图标、清单和离线缓存文件复制到 `www/`，再同步到原生工程。`www/` 是构建生成文件，不提交；首次生成后，`ios/` 和 `android/` 原生工程源码应提交到同一个 GitHub 仓库，以保留应用配置和原生改动。

### 本机首次生成工程

需要 Node.js 22 或更新版本。

```sh
npm install
npm run cap:add:ios
npm run cap:add:android
git add ios android package-lock.json
git commit -m "Add native mobile projects"
git push
```

网页有修改时运行：

```sh
npm run cap:sync
```

iOS 构建需要 macOS 和 Xcode；Android 构建需要 Android Studio 与 Android SDK。工作流 `Build mobile apps` 可在 GitHub Actions 中手动运行，生成 iOS 模拟器构建和 Android Debug APK 供内测。iPhone 真机安装、TestFlight 或 App Store 发布仍需 Apple 签名配置；模拟器包不能直接安装到 iPhone。

## 历史数据与迁移

现有 H5 用浏览器 `localStorage` 保存首次使用日期、菜单历史和设置。Capacitor 安装版运行在独立的应用沙盒中，因此 Safari 网页与安装版的本地记录默认互相不可见。

在家庭成员开始长期使用安装版前，需要实现并确认数据迁移路径：至少提供网页记录导出、安装版导入；若要跨设备和多人共享，则进一步接入有身份验证的云端数据库。不要假设重打包后历史记录会自动跟随。

## 尚未完成

- 生成原生平台工程并取得真实构建产物。
- 在 iPhone 真机测试布局、存储和离线行为。
- 已加入 JSON 备份导出/导入，便于在网页版与封装版之间手动迁移。
- 配置 Apple 开发者签名与 TestFlight 分发。


## 当前第一期 MVP 决策（2026-11-01）

网页 PWA 与 Capacitor 封装版并行推进，不互相替代。两者从同一仓库发布，共用菜单和周报业务代码；网页继续由 GitHub Pages 提供，封装版由 GitHub Actions 构建。第一期重点是两端核心功能一致、iPhone 真机测试及本机历史迁移说明。

第一期不包含每日推送。封装版推送需要后续单独设计原生 iOS/APNs 能力；PWA Web Push 也暂不实现。不要在当前 MVP 中请求通知权限或声称已提供每日推送。


## 手动迁移步骤

1. 在旧版本打开“饮食设置”，点“导出备份”。
2. 将下载的 `haohchifan-backup-日期.json` 文件传到目标设备。
3. 在目标版本打开“饮食设置”，先导出目标端备份，再点“导入备份”选择文件并确认。
4. 导入后页面重载；菜单历史和偏好从备份恢复。AI 试用次数不导入，目标设备原有计数保持不变。
