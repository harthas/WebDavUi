include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-webdavui
PKG_VERSION:=1.3.1
PKG_RELEASE:=1
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-webdavui
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=WebDavUi - multi-disk Lighttpd WebDAV management
  DEPENDS:=+luci-base +rpcd +rpcd-mod-file +jshn +jsonfilter +lighttpd +lighttpd-mod-webdav +lighttpd-mod-auth +lighttpd-mod-authn_file +lighttpd-mod-access +openssl-util +block-mount
endef

define Build/Compile
endef

define Package/luci-app-webdavui/install
	$(CP) ./root/* $(1)/
	$(INSTALL_BIN) ./scripts/postinst $(1)/usr/libexec/webdavui-postinst
	chmod 755 $(1)/etc/init.d/webdavui $(1)/usr/libexec/webdavui-* $(1)/usr/libexec/rpcd/webdavui
endef

define Package/luci-app-webdavui/conffiles
/etc/config/webdavui
endef

define Package/luci-app-webdavui/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
exec /bin/sh /usr/libexec/webdavui-postinst
endef

define Package/luci-app-webdavui/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/etc/init.d/webdavui stop
/etc/init.d/webdavui disable
exit 0
endef

$(eval $(call BuildPackage,luci-app-webdavui))
