# WebDavUi

轻量 OpenWrt / KWRT LuCI 插件，用 Lighttpd WebDAV 共享多块硬盘。当前版本 **1.3.3**。

入口：**服务 → WebDavUi**。

## 功能

- 将共享父目录下实际挂载的硬盘显示为 sda1、sdb1 等文件夹。
- 支持 Windows 原生 WebDAV 映射、文件锁和属性写入，中文目录索引使用 UTF-8。
- 显示每盘总容量、已用容量和剩余容量。
- 通过界面修改挂载点，按 UUID 保存；被占用时拒绝正常卸载，迁移失败时尝试回滚。
- 统一 14px 字号；服务操作、账号和服务状态使用独立间隔区块，状态位于页面底部。
- 各盘独立属性数据库；上传缓冲保存在已挂载硬盘，根目录不可直接上传。

## 直接安装：自动安装依赖

使用目标设备自身的软件源，要求网络正常、软件源与固件版本匹配。**不要跨固件强装依赖或使用 --force-depends。**

### opkg 固件：安装 IPK

从本仓库 Actions 的成功构建中下载 IPK artifact，或在源码目录执行 `node scripts/build.cjs` 构建。将 `luci-app-webdavui_1.3.3_all.ipk` 复制至路由器后：

```sh
opkg update
opkg install ./luci-app-webdavui_1.3.3_all.ipk
```

安装包的 Depends 包含全部直接依赖；opkg 会从该设备的软件源自动安装尚未满足的依赖。无需手动逐个安装 Lighttpd 模块。all 表示插件自身为脚本、与 CPU 架构无关；二进制依赖由目标固件的软件源提供。

### opkg / apk 固件：源码安装脚本

```sh
wget -O WebDavUi.tar.gz https://github.com/harthas/WebDavUi/archive/refs/heads/main.tar.gz
tar -xzf WebDavUi.tar.gz
cd WebDavUi-main
sh install.sh
```

脚本自动检测 opkg 或 apk，更新本机软件包索引并安装依赖。依赖全部安装成功后才部署插件。此方式不在软件包列表注册插件，卸载用 `sh uninstall.sh`。已存在的共享配置和账号文件保留。

**IPK 不能直接安装到使用 apk 的固件。** apk 固件可使用上述源码安装脚本；若需原生 APK 包，可将本仓库放入对应 OpenWrt SDK 的 `package/luci-app-webdavui`，用随附 Makefile 编译。Makefile 同样声明全部依赖，包格式由所用 SDK 决定。

[OpenWrt 包管理说明](https://openwrt.org/docs/guide-user/additional-software/managing_packages)

## 首次配置

首次安装默认关闭服务，避免未设密码就公开磁盘。监听地址自动取本机 LAN IPv4，无法识别时保留 127.0.0.1；端口默认为 5006。升级保留现有启用状态、地址、端口和账号。

1. 在“系统 → 挂载点”将各盘挂在 `/mnt/usb/sda1`、`/mnt/usb/sdb1` 等目录。
2. 在 WebDavUi 确认共享父目录为 `/mnt/usb`，设置 WebDAV 账号，保存并应用。
3. 启用服务。若存在旧 nginx WebDAV 账号文件，首次安装可复用其密码摘要。
4. Windows 映射 `http://路由器LAN地址:5006/`，根目录显示已挂载硬盘的文件夹。

新增硬盘后点击“刷新硬盘”。热插拔事件也会延迟刷新。挂载点名称仅支持英文、数字、下划线和短横线；盘内中文文件名正常支持。

## 修改挂载点

磁盘表格点击“修改挂载点”，填写共享父目录下一级目录。操作会暂停 WebDAV、正常卸载和重新挂载，不格式化、不搬移盘内文件。磁盘被其他程序占用时拒绝；成功后按 UUID 写入 `/etc/config/fstab`。操作前备份为 `/etc/webdavui/fstab-before-last-move`。

先结束文件传输；下载器、媒体服务和快捷方式中的旧路径需自行更新。拔盘前先停止服务，释放 SQLite 句柄。

## 构建

本地准备 Node.js 22+ 和 tar（无需 npm 依赖）：

```sh
node scripts/build.cjs
```

输出在 dist。GitHub Actions 会进行语法检查、构建并保存 IPK artifact。OpenWrt SDK 中可执行 `make package/luci-app-webdavui/compile V=s`。原生 SDK 包的依赖见 Makefile，独立 IPK 依赖见 dependencies.txt。

## 依赖

`luci-base`、`rpcd`、`rpcd-mod-file`、`jshn`、`jsonfilter`、`lighttpd`、`lighttpd-mod-webdav`、`lighttpd-mod-auth`、`lighttpd-mod-authn_file`、`lighttpd-mod-access`、`openssl-util`、`block-mount`。

若固件软件源缺少其中任意组件，安装应停止；不保证所有第三方裁剪固件或非常旧版本。文件系统驱动仍由目标系统提供，本插件不会格式化硬盘或自动替换磁盘驱动。

## 文件及卸载

| 路径 | 用途 |
|---|---|
| /etc/config/webdavui | 启用、地址、端口、共享父目录、只读配置 |
| /etc/webdavui/users | htpasswd 摘要，权限 600 |
| /var/etc/webdavui.conf | 自动生成的 Lighttpd 配置 |
| 各盘 .webdavui/properties.sqlite | 属性和文件锁数据库，禁止 HTTP 访问 |
| 已挂载硬盘的 .webdavui/upload | 上传缓冲 |
| /tmp/webdavui-error.log | 错误日志 |

IPK 安装可用 `opkg remove luci-app-webdavui` 卸载。源码安装用 `sh uninstall.sh`。保留配置、账号、系统挂载项及硬盘数据；不自动卸载其他程序可能共用的 Lighttpd 依赖。

HTTP Basic 仅用于可信 LAN，不提供 HTTPS 界面配置。服务以 root 运行以兼容现有磁盘权限。仓库不包含任何真实密码、用户摘要、令牌或部署凭据。

## 已验证与限制

已在 KWRT、Lighttpd 1.4.85、Windows 原生 WebClient 上验证：中文文件复制、覆盖、重命名、内容校验、删除、多盘发现和根目录写入拒绝。挂载点迁移用独立临时 ext4 镜像验证了往返迁移、文件保留、UUID 保存和忙碌拒绝。

未覆盖所有 OpenWrt 发行版、第二块实体盘、断电恢复、跨盘 MOVE/COPY 或 4GB 以上单文件。其他设备应先以少量测试文件验证。
