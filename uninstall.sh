#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || { echo '请以 root 运行'; exit 1; }
if command -v opkg >/dev/null 2>&1 && opkg status luci-app-webdavui 2>/dev/null | grep -q 'Status:.*installed'; then
 opkg remove luci-app-webdavui
else
 /etc/init.d/webdavui stop 2>/dev/null || true
 /etc/init.d/webdavui disable 2>/dev/null || true
 rm -f /etc/init.d/webdavui /usr/libexec/webdavui-config /usr/libexec/webdavui-move /usr/libexec/webdavui-watch /usr/libexec/webdavui-storage /usr/libexec/webdavui-portcheck /usr/libexec/rpcd/webdavui /usr/share/luci/menu.d/luci-app-webdavui.json /usr/share/rpcd/acl.d/luci-app-webdavui.json /etc/hotplug.d/block/95-webdavui /lib/upgrade/keep.d/webdavui /www/luci-static/resources/view/webdavui/config.js
fi
/etc/init.d/rpcd restart
echo '程序已移除；保留配置、账号、系统挂载配置及盘内文件。未卸载通用 Lighttpd 依赖。'
