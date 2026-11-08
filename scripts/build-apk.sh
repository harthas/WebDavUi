#!/bin/bash
# 使用 OpenWrt SDK 原生 APK v3 工具，仅打包纯脚本插件；运行依赖由目标机安装。
set -euo pipefail
project=${1:-/feed}
apk_tool=${APK_TOOL:-/builder/staging_dir/host/bin/apk}
test -x "$apk_tool"
version=$(tr -d '\r\n' < "$project/VERSION")
deps=$(tr '\r\n' '  ' < "$project/dependencies.txt" | xargs)
stage=$(mktemp -d /tmp/webdavui-apk.XXXXXX)
hooks=$(mktemp -d /tmp/webdavui-hooks.XXXXXX)
trap 'rm -rf "$stage" "$hooks"' EXIT
cp -a "$project/root/." "$stage/"
install -m755 "$project/scripts/postinst" "$stage/usr/libexec/webdavui-postinst"
find "$stage" -type d -exec chmod 755 {} +
find "$stage" -type f -exec chmod 644 {} +
chmod 755 "$stage/etc/init.d/webdavui" "$stage/usr/libexec/"webdavui-* "$stage/usr/libexec/rpcd/webdavui"
chown -R 0:0 "$stage"
mkdir -p "$stage/lib/apk/packages"
printf '/etc/config/webdavui\n' > "$stage/lib/apk/packages/luci-app-webdavui.conffiles"
hash=$(sha256sum "$stage/etc/config/webdavui" | cut -d' ' -f1)
printf '/etc/config/webdavui %s\n' "$hash" > "$stage/lib/apk/packages/luci-app-webdavui.conffiles_static"
(cd "$stage" && find . -type f | sed 's#^\.##' | sort) > "$stage/lib/apk/packages/luci-app-webdavui.list"
cat > "$hooks/post-install" <<'EOF'
#!/bin/sh
[ -s "${IPKG_INSTROOT}/lib/functions.sh" ] || exit 0
. "${IPKG_INSTROOT}/lib/functions.sh"
export root="${IPKG_INSTROOT}"
export pkgname=luci-app-webdavui
default_postinst
[ -n "$IPKG_INSTROOT" ] || /bin/sh /usr/libexec/webdavui-postinst
EOF
{ printf '#!/bin/sh\nexport PKG_UPGRADE=1\n'; tail -n +2 "$hooks/post-install"; } > "$hooks/post-upgrade"
cat > "$hooks/pre-deinstall" <<'EOF'
#!/bin/sh
[ -s "${IPKG_INSTROOT}/lib/functions.sh" ] || exit 0
. "${IPKG_INSTROOT}/lib/functions.sh"
export root="${IPKG_INSTROOT}"
export pkgname=luci-app-webdavui
default_prerm
[ -n "$IPKG_INSTROOT" ] || { /etc/init.d/webdavui stop; /etc/init.d/webdavui disable; }
EOF
mkdir -p "$project/dist"
out="$project/dist/luci-app-webdavui-${version}-r1.apk"
"$apk_tool" mkpkg --info 'name:luci-app-webdavui' --info "version:${version}-r1" \
 --info 'arch:noarch' --info 'description:LuCI support for WebDav' --info 'license:unknown' \
 --info 'origin:luci-app-webdavui' --info 'url:https://github.com/harthas/WebDavUi' \
 --info 'maintainer:harthas' --info "depends:$deps" \
 --script "post-install:$hooks/post-install" --script "post-upgrade:$hooks/post-upgrade" \
 --script "pre-deinstall:$hooks/pre-deinstall" --files "$stage" --output "$out"
"$apk_tool" --allow-untrusted verify "$out"
ls -l "$out"
