# 好好吃饭产品方案补充：原生手机 APP

更新时间：2026-11-01

## 新增需求

用户希望将现有 H5 继续发展为手机 APP，优先 iPhone，并让同一代码库维护网页和手机应用。随后要求发布手机 APP。

## 方案

使用 Capacitor 封装现有 H5。菜谱、四道菜刷新与单道替换、营养及维生素估算、按周回顾继续复用 `index.html`。GitHub 保存源代码；GitHub Actions 在手机代码更新后自动构建 Android Debug APK 和 iOS 模拟器包，也支持手动运行。iPhone 真机测试/分发需要 Apple 签名及 TestFlight 配置；模拟器构建不等于真机发布。

```mermaid
flowchart LR
  A[GitHub: H5 源码] --> B[Capacitor 同步]
  B --> C[iOS 工程]
  B --> D[Android 工程]
  C --> E[Xcode 签名与 TestFlight]
  D --> F[APK / AAB]
  A --> G[GitHub Pages 网页版]
  C --> H[Cloudflare Worker]
  D --> H
  G --> H
  H --> I[DeepSeek API]
```

## 数据要求

H5 目前将历史和偏好保存在浏览器 localStorage。安装版处于独立沙盒，网页与安装版不会自动共享这份数据。长期使用前要提供本地导入/导出，或设计有账号保护的云同步方案；多设备、家庭成员共享以云同步为目标。

## 当前实现状态

- 已在 GitHub 根目录加入 Capacitor 配置、网页资源复制脚本、iOS/Android 依赖、Actions 构建工作流、仓库说明和数据迁移说明。
- GitHub Actions 构建运行 [41230809428](https://github.com/200611lxzys/lunch-menu-app/actions/runs/41230809428) 已成功：生成 Android Debug APK 与 iOS 模拟器包。APK 可供 Android 测试；iOS 模拟器包不能安装到 iPhone。
- 手机代码更新会触发构建；可在 Actions 下载构建产物。
- 正式 iPhone 发布尚未完成：需要账户持有人完成 Apple Developer Program 注册/协议/付款，然后用其签名凭据生成可提交 App Store Connect 的真机构建并走 TestFlight 分发。
- 现有网页历史尚未迁移到安装版，长期使用前需增加导入或云同步。
