# 好好吃饭：手机 APP 封装计划

## 产品决定

- 第一阶段并行维护手机适配的 H5/PWA 与 Capacitor 封装版。
- 第一版原生安装包采用 Capacitor 封装现有网页，复用菜单、营养估算、每周复盘和本地菜谱代码。
- 网页仍作为 GitHub Pages 版本运行；手机包由同一个 GitHub 仓库构建。
- App 名称：好好吃饭；Bundle ID：`com.lunchmenu.haohaochifan`。
- 第一阶段目标为 iPhone 内测；Android 工程也保留，方便后续生成安装包。
- DeepSeek API 密钥只留在 Cloudflare Worker，不写入网页或安装包。

## 代码与构建

根目录的 `index.html` 是唯一网页源码。运行 `npm run cap:sync` 会将网页、图标、清单、离线缓存文件及 `images/` 菜品配图复制到 `www/`，再同步到原生工程。`www/` 是构建生成文件，不提交；首次生成后，`ios/` 和 `android/` 原生工程源码应提交到同一个 GitHub 仓库，以保留应用配置和原生改动。

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

历史保存在每个运行端自己的 localStorage：Safari/PWA 网页、iPhone 安装版、不同手机各自独立，不会因同一个 GitHub 账号或重新打包自动共享。现有设置提供 JSON 导出/导入，用户可手动把记录从一个端迁移到另一个端；多人实时共享需要后续增加账号和云端数据库。



## iPhone 家庭内测：TestFlight

真机内测采用 TestFlight。当前仓库已有手动工作流 `.github/workflows/ios-testflight.yml`：使用 GitHub macOS runner 生成签名 IPA 并上传 App Store Connect。只有签名凭据配置完后才能运行。

### Apple 账户准备

1. 账户持有人加入 Apple Developer Program（Apple 当前列出的年费为 US$99，可能按地区显示本地金额），并完成协议/账户状态要求。
2. 在 App Store Connect 创建应用记录，Bundle ID 必须是 `com.lunchmenu.haohaochifan`；应用版本应与项目默认版本相符。
3. 在 App Store Connect → Users and Access → Integrations → App Store Connect API 创建 App Manager API Key，下载一次性显示的 `.p8` 文件，记下 Key ID 和 Issuer ID。
4. 在 Apple Developer 账户创建 Apple Distribution 证书并导出为带密码的 `.p12`；为上述 Bundle ID 创建 App Store Connect provisioning profile，profile 名称使用 `AppStore com.lunchmenu.haohaochifan`。

### GitHub 仓库配置

进入仓库 Settings → Secrets and variables → Actions，添加：

| 类型 | 名称 | 内容 |
| --- | --- | --- |
| Variable | `APPLE_TEAM_ID` | Apple Developer Team ID |
| Variable | `APPSTORE_ISSUER_ID` | App Store Connect Issuer ID |
| Variable | `APPSTORE_API_KEY_ID` | API Key ID |
| Secret | `APPSTORE_API_PRIVATE_KEY` | `.p8` 文件文本内容 |
| Secret | `APPSTORE_CERTIFICATES_FILE_BASE64` | Base64 编码的签名 `.p12` |
| Secret | `APPSTORE_CERTIFICATES_PASSWORD` | 导出 `.p12` 时设置的密码 |

不要把 `.p8`、`.p12` 或任何密码提交到仓库、网页或聊天中。

### 生成并安装

1. 在 GitHub 仓库打开 Actions → **Build and upload iOS TestFlight** → Run workflow。
2. 等待工作流成功：它会保存一个 14 天有效的 `haohchifan-iphone-ipa` 构建产物，并将 IPA 上传到 App Store Connect。
3. Apple 处理完构建后，在 TestFlight 填写测试联系信息并创建外部测试组，添加妻子的 Apple Account 邮箱。首次外部测试构建需经过 Apple Beta App Review。
4. 妻子在 iPhone 安装 TestFlight，接受邀请并安装“好好吃饭”。之后同 Bundle ID 的新版从 TestFlight 更新，通常保留该安装版本机数据。

TestFlight 构建有效期为 90 天。网页版/PWA 与 TestFlight 安装版的历史仍分别保存在各自端；第一次迁移请在旧端导出 JSON，再在安装版导入。


## 尚未完成

- 生成原生平台工程并取得真实构建产物。
- 在 iPhone 真机测试布局、存储和离线行为。
- 已加入 JSON 备份导出/导入，便于在网页版与封装版之间手动迁移；AI 试用计数不随备份迁移。
- Apple 开发者签名与 TestFlight 账户配置尚待完成；配置后可运行 `.github/workflows/ios-testflight.yml`。


## 当前第一期 MVP 决策（2026-11-01）

网页 PWA 与 Capacitor 封装版并行推进，不互相替代。两者从同一仓库发布，共用菜单和周报业务代码；网页继续由 GitHub Pages 提供，封装版由 GitHub Actions 构建。第一期重点是两端核心功能一致、iPhone 真机测试及通过 JSON 文件手动迁移本机历史。

第一期不包含每日推送。封装版推送需要后续单独设计原生 iOS/APNs 能力；PWA Web Push 也暂不实现。不要在当前 MVP 中请求通知权限或声称已提供每日推送。


## 手动迁移步骤

1. 在旧版本打开“饮食设置”，点“导出备份”。
2. 将下载的 `haohchifan-backup-日期.json` 文件传到目标设备。
3. 在目标版本打开“饮食设置”，先导出目标端备份，再点“导入备份”选择文件并确认。
4. 导入后页面重载；菜单历史和偏好从备份恢复。AI 试用次数不导入，目标设备原有计数保持不变。
