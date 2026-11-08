'use strict';
'require view';
'require form';
'require rpc';
'require uci';
'require ui';
'require poll';
'require dom';
var getStatus = rpc.declare({object:'webdavui',method:'status',expect:{}});
var doAction = rpc.declare({object:'webdavui',method:'action',params:['action'],expect:{}});
var setPassword = rpc.declare({object:'webdavui',method:'password',params:['username','password'],expect:{}});
var getLogs = rpc.declare({object:'webdavui',method:'logs',expect:{}});
var moveMount = rpc.declare({object:'webdavui',method:'move_mount',params:['old','target'],expect:{}});
return view.extend({
 load: function() { return Promise.all([uci.load('webdavui'),getStatus()]); },
 render: function(data) {
  var status = E('div', {'class':'cbi-section webdavui-module'}, []);
  var diskTable = E('div', {'class':'cbi-section webdavui-module'}, []);
  var openMove = function(disk) {
   var target=E('input',{'class':'cbi-input-text',value:disk.path,'aria-label':'新挂载点',style:'width:100%'});
   var submit=E('button',{'class':'cbi-button cbi-button-positive'},'确认修改');
   submit.addEventListener('click',function(){
    if(target.value===disk.path){ui.addNotification(null,E('p',{},'请填写不同的新挂载点'),'error');return;}
    submit.disabled=true;
    moveMount(disk.path,target.value).then(function(r){
     if(r.ok)ui.hideModal();
     ui.addNotification(null,E('p',{},r.message||'操作无响应'),r.ok?'info':'error');
     return getStatus().then(update);
    }).catch(function(e){ui.addNotification(null,E('p',{},e.message),'error');}).finally(function(){submit.disabled=false;});
   });
   ui.showModal('修改硬盘挂载点',[
    E('p',{},'设备：'+disk.device+'，当前：'+disk.path),
    E('p',{},'将短暂停止 WebDAV，并正常卸载、重新挂载此硬盘；不格式化、不移动盘内文件。若被其他程序占用则拒绝操作。新位置将按 UUID 保存到系统挂载配置，重启后继续使用。'),
    E('p',{},'其他下载器、媒体服务和快捷方式使用的旧路径需要自行更新。请先结束文件传输。'),
    E('label',{},['新挂载点（父目录下一级）',target]),
    E('div',{'class':'right'},[E('button',{'class':'cbi-button',click:ui.hideModal},'取消'),' ',submit])
   ]);
  };
  var update = function(s) {
   var host=uci.get('webdavui','main','bind')||'127.0.0.1';
   var port=uci.get('webdavui','main','port')||'5006';
   var url='http://'+host+':'+port+'/';
   dom.content(status,[E('h3',{},'服务状态'),E('strong',{},s.running?'● 服务运行中':'○ 服务已停止'),
    E('p',{},s.mounted?'已挂载硬盘：'+(s.disks||''):'尚未发现硬盘，根目录为空且不可写'),
    E('p',{},[E('a',{href:url,target:'_blank',rel:'noopener noreferrer'},url)])]);
   dom.content(diskTable,[
    E('table',{'class':'table'},[
     E('tr',{'class':'tr table-titles'},[E('th',{'class':'th'},'设备'),E('th',{'class':'th'},'硬盘容量'),E('th',{'class':'th'},'当前挂载点'),E('th',{'class':'th'},'文件系统'),E('th',{'class':'th'},'操作')])
    ].concat((s.mounts||[]).map(function(d){return E('tr',{'class':'tr'},[
     E('td',{'class':'td'},d.device),
     E('td',{'class':'td'},[E('div',{},'总容量：'+(d.capacity||'—')),E('div',{},'已用容量：'+(d.used||'—')),E('div',{},'剩余容量：'+(d.available||'—'))]),
     E('td',{'class':'td'},d.path),E('td',{'class':'td'},d.type),
     E('td',{'class':'td'},[E('button',{'class':'cbi-button',click:function(){openMove(d);}},'修改挂载点')])
    ]);}))) ]);
  };
  update(data[1]);
  poll.add(function(){ return getStatus().then(update); },5);
  var m=new form.Map('webdavui','WebDavUi','共享多硬盘：Z: 根目录显示共享父目录下已挂载的 sda1、sdb1 等文件夹。根目录不可写，请进入硬盘文件夹上传。各盘属性数据库独立保存；上传缓冲自动选择一块已挂载硬盘。');
  var s=m.section(form.NamedSection,'main','webdavui'); s.anonymous=true;
  var o=s.option(form.Flag,'enabled','启用服务'); o.rmempty=false;
  o=s.option(form.Value,'bind','监听 IPv4 地址','仅在所选地址监听。使用路由器 LAN 地址。'); o.datatype='ip4addr'; o.rmempty=false;
  o=s.option(form.Value,'port','端口'); o.datatype='range(1024,65535)'; o.rmempty=false;
  o=s.option(form.Value,'root','共享父目录','各块硬盘应分别挂载在该目录下，例如 /mnt/usb/sda1、/mnt/usb/sdb1。');
  o.rmempty=false;
  o.validate=function(id,v){ return /^\/[A-Za-z0-9_./-]+$/.test(v) && !/(^|\/)\.\.(\/|$)|\/\//.test(v) ? true : '请输入无空格的绝对路径，不能包含 .. 路径跳转'; };
  o=s.option(form.Flag,'readonly','只读模式'); o.rmempty=false;
  var act=function(a){return doAction(a).then(function(r){ui.addNotification(null,E('p',{},r.message||'操作无响应'),r.ok?'info':'error');return getStatus().then(update);}).catch(function(e){ui.addNotification(null,E('p',{},e.message),'error');});};
  var controls=E('div',{'class':'cbi-section webdavui-module'},[
   E('h3',{},'服务操作'),
   E('p',{},'配置修改后请先点击底部“保存并应用”。'),
   E('button',{'class':'cbi-button cbi-button-action',click:ui.createHandlerFn(this,function(){return act('restart');})},'启动 / 重启'), ' ',
   E('button',{'class':'cbi-button',click:ui.createHandlerFn(this,function(){return act('stop');})},'停止'), ' ',
   E('button',{'class':'cbi-button',click:ui.createHandlerFn(this,function(){return act('check');})},'检查已保存配置'), ' ',
   E('button',{'class':'cbi-button',click:ui.createHandlerFn(this,function(){return act('reload');})},'刷新硬盘'), ' ',
   E('button',{'class':'cbi-button',click:function(){getLogs().then(function(r){ui.showModal('最近错误日志',[E('pre',{style:'white-space:pre-wrap;max-height:50vh;overflow:auto'},r.log||'暂无错误日志'),E('button',{'class':'cbi-button',click:ui.hideModal},'关闭')]);});}},'查看日志')]);
  var user=E('input',{'class':'cbi-input-text',value:uci.get('webdavui','main','username')||'webdav',autocomplete:'off'});
  var pass=E('input',{'class':'cbi-input-text',type:'password',autocomplete:'new-password',placeholder:'输入新密码（至少 8 位）'});
  var accounts=E('div',{'class':'cbi-section webdavui-module'},[
   E('h3',{},'WebDAV 账号'),E('p',{},'已复用原 WebDAV 认证文件。仅在需要更换账号时填写；更新将替换本服务的账号，不改变 nginx 或路由器管理密码。'),
   E('label',{},['用户名 ',user]),' ',E('label',{},['新密码 ',pass]),' ',
   E('button',{'class':'cbi-button cbi-button-action',click:ui.createHandlerFn(this,function(){return setPassword(user.value,pass.value).then(function(r){if(r.ok)pass.value='';ui.addNotification(null,E('p',{},r.message),r.ok?'info':'error');});})},'更新账号'),
   E('p',{},'HTTP Basic 认证不加密传输，请仅在可信局域网使用。')]);
  var style=E('style',{},'.webdavui-page{font-family:inherit;font-size:14px;line-height:1.65}.webdavui-page h2,.webdavui-page h3,.webdavui-page p,.webdavui-page small,.webdavui-page label,.webdavui-page input,.webdavui-page button,.webdavui-page select,.webdavui-page .cbi-value-description,.webdavui-page .cbi-section-descr,.webdavui-page .cbi-button,.webdavui-page th,.webdavui-page td{font-family:inherit;font-size:14px;line-height:1.65}.webdavui-page h2,.webdavui-page h3{font-weight:600}.webdavui-page .webdavui-module{margin-top:28px;margin-bottom:0;padding:20px;border:1px solid var(--border-color,#dedede);border-radius:8px}.webdavui-page .webdavui-module h3{margin:0 0 14px}.webdavui-page .webdavui-module p{margin:10px 0}.webdavui-page .webdavui-module .cbi-button{margin:4px 5px 4px 0}.webdavui-page .webdavui-module label{display:inline-block;margin:6px 14px 6px 0}.webdavui-page .webdavui-module input{margin-left:6px;max-width:100%}.webdavui-page .webdavui-module:last-child{margin-bottom:24px}@media(max-width:600px){.webdavui-page .webdavui-module{padding:16px;margin-top:22px}.webdavui-page .webdavui-module label{display:block}.webdavui-page .webdavui-module input{display:block;margin:6px 0 0;width:100%}}');
  return m.render().then(function(map){return E('div',{'class':'webdavui-page'},[style,diskTable,E('div',{'class':'cbi-section webdavui-module'},[map]),controls,accounts,status]);});
 }
});
