#!/bin/sh
# 在已下载并解压的源码目录运行；只使用本机固件配置的软件源。
set -eu
[ "$(id -u)" = 0 ] || { echo '请以 root 运行'; exit 1; }
cd "$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
[ -f root/etc/config/webdavui ] || { echo '源码目录不完整'; exit 1; }
deps=$(cat dependencies.txt)
if command -v opkg >/dev/null 2>&1; then
 opkg update
 opkg install $deps
elif command -v apk >/dev/null 2>&1; then
 apk update
 apk add $deps
else
 echo '未发现 opkg 或 apk，无法自动安装依赖'; exit 1
fi
# 在依赖全部成功安装后才部署页面；不创建、格式化或迁移任何硬盘。
find root -type f | while IFS= read -r file; do
 dest="/${file#root/}"
 if [ "$dest" = /etc/config/webdavui ] && [ -f "$dest" ]; then continue; fi
 mkdir -p "$(dirname "$dest")"
 cp "$file" "$dest"
 chmod 644 "$dest"
done
chmod 755 /etc/init.d/webdavui /usr/libexec/webdavui-* /usr/libexec/rpcd/webdavui
sh scripts/postinst
echo 'WebDavUi 已安装。入口：服务 → WebDavUi。新安装请先设置账号、检查共享目录，再启用服务。'
echo '源码安装不在软件包列表注册；卸载请运行源码目录内的 uninstall.sh。'
