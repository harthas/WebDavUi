const z=require('zlib');
const fs=require('fs'),path=require('path'),cp=require('child_process');
const project=path.resolve(__dirname,'..');
const version=fs.readFileSync(path.join(project,'VERSION'),'utf8').trim();
const dependencies=fs.readFileSync(path.join(project,'dependencies.txt'),'utf8').trim().split(/\s+/).join(', ');
const root=path.join(project,'root'),build=path.join(project,'.build'),out=path.resolve(process.argv[2]||path.join(project,'dist'));
fs.mkdirSync(build,{recursive:true}); fs.mkdirSync(out,{recursive:true});
const ctl=path.join(build,'control');fs.mkdirSync(ctl,{recursive:true});
fs.writeFileSync(path.join(ctl,'control'),`Package: luci-app-webdavui\nVersion: ${version}\nArchitecture: all\nMaintainer: Local webdavUI\nSection: luci\nPriority: optional\nDepends: ${dependencies}\nDescription: LuCI support for WebDav\n`);
fs.writeFileSync(path.join(ctl,'conffiles'),'/etc/config/webdavui\n');
for(const name of ['postinst','prerm'])fs.copyFileSync(path.join(project,'scripts',name),path.join(ctl,name));
for(const [dir,name] of [[root,'data.tar.gz'],[ctl,'control.tar.gz']])cp.execFileSync('tar',['-czf',path.join(build,name),'-C',dir,'.']);
for(const part of ['data.tar.gz','control.tar.gz']) {
 const file=path.join(build,part), b=z.gunzipSync(fs.readFileSync(file));
 for(let pos=0;pos+512<=b.length;){
  const h=b.subarray(pos,pos+512); if(h.every(v=>v===0))break;
  const name=h.subarray(0,100).toString().replace(/\0.*$/,'');
  const size=parseInt(h.subarray(124,136).toString().replace(/\0/g,'').trim(),8)||0;
  const exec=/^\.\/(etc\/init.d\/|usr\/libexec\/)/.test(name)||/^\.\/(postinst|prerm)$/.test(name);
  const mode=(h[156]===53||exec)?'0000755\0':'0000644\0';
  h.write(mode,100,8,'ascii'); h.fill(32,148,156);
  const sum=h.reduce((a,v)=>a+v,0); h.write(sum.toString(8).padStart(6,'0')+'\0 ',148,8,'ascii');
  pos+=512+Math.ceil(size/512)*512;
 }
 fs.writeFileSync(file,z.gzipSync(b));
}
fs.writeFileSync(path.join(build,'debian-binary'),'2.0\n'); cp.execFileSync('tar',['-czf',path.join(out,`luci-app-webdavui_${version}_all.ipk`),'-C',build,'./debian-binary','./control.tar.gz','./data.tar.gz']);
console.log(path.join(out,`luci-app-webdavui_${version}_all.ipk`));
