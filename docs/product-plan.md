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

已在 GitHub 根目录添加 Capacitor 配置、网页资源复制脚本、iOS/Android 依赖、Actions 构建工作流、仓库首页说明和数据迁移说明。手机代码更新时触发自动构建。正式 iPhone 发布尚未完成：需要 Apple Developer 账号、签名证书/配置与 TestFlight 或 App Store Connect 提交。现有记录尚未迁移到安装版。
