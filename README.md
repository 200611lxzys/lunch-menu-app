# 好好吃饭

家庭菜单 H5/PWA 与 Capacitor 手机 APP。当前网页版本：

https://200611lxzys.github.io/lunch-menu-app/

## 网页功能

- 每天生成四道家常菜，可单道替换或刷新整套菜单
- 记录从首次使用日开始的菜单历史，只能查看今天和过去
- 每周回顾菜单、热量估算、宏量营养素和维生素来源
- 偏好和菜单历史当前保存在本机浏览器

## 手机 APP 工程

同一个仓库也包含 Capacitor 配置，可复用网页构建 iOS 和 Android 应用。具体安装、数据迁移说明见 [手机 APP 方案](docs/mobile-app.md)。

首次构建步骤需要准备 Node.js 22。iOS 工程需要 macOS 和 Xcode；Android 工程需要 Android Studio。首次生成平台工程后，请将 `ios/`、`android/` 和 `package-lock.json` 提交回本仓库。

## GitHub Actions 构建

1. 打开本仓库的 **Actions**。
2. 选择 **Build mobile apps**，点击 **Run workflow**。
3. 等构建完成后打开该次运行页面，在 **Artifacts** 下载文件。

Android 会生成 Debug APK，可用于测试安装。iOS 当前工作流产物是模拟器构建，不能安装到 iPhone 真机。真机安装与 TestFlight 需要 Apple 签名设置。

## 数据注意

手机安装版和 Safari 网页版的本地历史默认分开保存。开始长期使用安装版前，需要开发网页导出/安装版导入，或建立账号云同步。详见 [手机 APP 方案](docs/mobile-app.md)。
