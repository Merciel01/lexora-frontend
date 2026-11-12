'use strict';

const $=s=>document.getElementById(s), actors={}, scene=new THREE.Scene();scene.background=new THREE.Color(0xcdd6d6);

const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;

const camera=new THREE.PerspectiveCamera(35,1,.05,60);camera.position.set(2.6,2.3,4);const orbit=new ORBIT.OrbitControls(camera,renderer.domElement);orbit.target.set(0,.85,0);

scene.add(new THREE.HemisphereLight(0xf1f4f4,0x82715a,1.65));const light=new THREE.DirectionalLight(0xffeed7,2.3);light.position.set(-3.8,3.45,1.1);light.target.position.set(0,.3,-1);scene.add(light,light.target);const fill=new THREE.DirectionalLight(0xe3edf2,.9);fill.position.set(4,3,2);scene.add(fill);const windowFill=new THREE.DirectionalLight(0xf0f3f3,1.35);windowFill.position.set(0,3,-3);scene.add(windowFill);scene.add(new THREE.AmbientLight(0xffffff,.25));



const loader=new GLTF.GLTFLoader(), ids=Object.keys(MAP), V=THREE.Vector3,Q=THREE.Quaternion;

let previousSpeakerId='president';let speakerId='ministere_public';let paused=false,variant=0,group=false,clock=0,last=performance.now(),schedule=null,benchmark=null,selftest=null;

const results={engine:'Three.js r182',audio_available:false,loaded:[],errors:[],transition_tests:[],runtime:{weight_error_max:0,foot_drift_m:0,root_drift_m:0,contact_error_m:0},performance:null};

const norm=n=>n.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();

const positions=Object.fromEntries(Object.entries(ROOM.layout).map(([id,p])=>[id,p.position]));
// Static room is an independent local GLB. Character mixers / API stay separate.
const roomGroup=new THREE.Group();roomGroup.name='Salle__Decor_statique';scene.add(roomGroup);
let qualityMode='low',cameraMove=null,viewMode='general';
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||$('reduceMotion')?.checked;
async function loadRoom(){
 const gltf=await loader.loadAsync('./assets/salle_decor_v27.glb');
 const batches=new Map();gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(o=>{if(!o.isMesh)return;if(o.material.name.includes('Embleme_image')){o.material.alphaTest=.025;o.material.depthWrite=true;}const key=o.material.uuid;if(!batches.has(key))batches.set(key,{material:o.material,geometries:[]});let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();batches.get(key).geometries.push(g);});
 for(const [key,b]of batches){const geometry=BGUTILS.mergeGeometries(b.geometries,false);if(!geometry)throw Error('Fusion du décor impossible');const mesh=new THREE.Mesh(geometry,b.material);mesh.name='Salle__Lot_'+b.material.name;mesh.castShadow=!b.material.name.includes('Embleme_image');mesh.receiveShadow=!b.material.name.includes('Embleme_image');roomGroup.add(mesh);for(const g of b.geometries)g.dispose();}
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-6;light.shadow.camera.right=6;light.shadow.camera.top=8;light.shadow.camera.bottom=-7;light.shadow.camera.near=.1;light.shadow.camera.far=22;light.shadow.normalBias=.015;light.shadow.bias=-.00025;
 orbit.enableDamping=true;orbit.dampingFactor=.10;orbit.minDistance=.32;orbit.maxDistance=14;orbit.maxPolarAngle=Math.PI*.485;orbit.minPolarAngle=.20;
 results.room={version:27,dimensions_m:ROOM.room,static_objects:[...batches.values()].reduce((n,b)=>n+b.geometries.length,0),draw_batches:batches.size,layout:ROOM.layout};
}
function configureRole(a){
 if(['president','assesseur_01','assesseur_02'].includes(a.id)){
  const d=a.map.stage.desk,old=d.center_blender[2]+d.size_blender[2]/2,delta=.76-old;d.center_blender[2]+=.76-old;a.map.stage.paper.center_blender[2]+=delta;a.map.reading_target_blender[2]+=delta;
  for(const side of ['L','R'])a.map.anchors_blender[side][2]+=delta;
 }
}
function roomStage(a){
 if(a.map.posture!=='seated')return;
 const b=a.map.stage.paper,d=b.size_blender,c=b.center_blender,mesh=new THREE.Mesh(new THREE.BoxGeometry(d[0],d[2],d[1]),new THREE.MeshStandardMaterial({color:0xe6dfcc,roughness:1}));mesh.name=a.id+'__stage_paper';mesh.position.set(c[0],c[2],-c[1]);a.root.add(mesh);microphone(a);
}
function contactShade(a){
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,3,32,32,31);g.addColorStop(0,'rgba(28,24,18,.24)');g.addColorStop(.5,'rgba(28,24,18,.13)');g.addColorStop(1,'rgba(28,24,18,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});const m=new THREE.Mesh(new THREE.PlaneGeometry(.95,.85),mat);m.name=a.id+'__Ombre_contact';m.rotation.x=-Math.PI/2;m.position.set(0,.003,0);a.root.add(m);
}
function setQuality(mode){
 qualityMode=mode;if($('quality'))$('quality').value=mode;const high=mode==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.5:1));light.shadow.mapSize.set(high?2048:1024,high?2048:1024);if(light.shadow.map){light.shadow.map.dispose();light.shadow.map=null;}
 for(const a of Object.values(actors))a.root.traverse(o=>{if(o.isMesh){o.castShadow=high&&!o.name.includes('Ombre_contact');o.receiveShadow=true;}});
 renderer.shadowMap.autoUpdate=high;renderer.shadowMap.needsUpdate=true;results.quality=mode;viewportRatio=0;
}
function moveCamera(position,target,fov=46){
 const p=new V(...position),t=new V(...target);p.x=THREE.MathUtils.clamp(p.x,-4.85,4.85);p.z=THREE.MathUtils.clamp(p.z,-4.4,9.0);p.y=THREE.MathUtils.clamp(p.y,.5,3.4);
 if(reducedMotion()){camera.position.copy(p);orbit.target.copy(t);camera.fov=fov;camera.updateProjectionMatrix();orbit.update();cameraMove=null;}
 else cameraMove={start:performance.now(),position:camera.position.clone(),target:orbit.target.clone(),fov:camera.fov,to:p,look:t,toFov:fov};
}
function chooseView(mode){
 viewMode=mode;group=true;for(const a of Object.values(actors)){a.root.visible=true;a.model.visible=true;}
 if(mode==='general'){const p=ROOM.cameras.general,portrait=$('view').clientWidth/Math.max(1,$('view').clientHeight)<1.4;moveCamera(portrait?[2.4,2.45,8.7]:p.position,portrait?[0,1,0]:p.target,portrait?60:p.fov);}
 else if(mode==='student'){
  const a=actors.etudiant_avocat,head=world(bone(a,'head')),forward=new V(0,0,1).applyQuaternion(a.root.quaternion);a.model.visible=false;
  moveCamera(head.addScaledVector(forward,.22).toArray(),world(bone(actors.president,'head')).toArray(),50);
 }else if(mode==='barre'){moveCamera([.9,1.65,-1.85],[0,.98,1.04],42);}else if(mode==='free'){cameraMove=null;}else if(mode==='president'){moveCamera([0,1.8,1.7],[0,1.7,-3.4],44);}
 else if(actors[mode]){
  const a=actors[mode],h=world(bone(a,'head')),standing=a.map.posture==='standing',front=new V(.22,.10,1).applyQuaternion(a.root.quaternion),p=h.clone().addScaledVector(front,standing?3.2:2.65);p.y=Math.min(2.15,h.y+.17);moveCamera(p.toArray(),h.clone().add(new V(0,standing?-.65:-.28,0)).toArray(),40);
 }
 if($('cameraView'))$('cameraView').value=mode;
 $('focus').textContent='Cadrer le président';$('audience').setAttribute('aria-pressed',String(mode==='general'));results.view=mode;
}
function updateRoomCamera(){
 orbit.enableDamping=!reducedMotion();
 if(cameraMove){const u=THREE.MathUtils.clamp((performance.now()-cameraMove.start)/900,0,1),w=u*u*(3-2*u);camera.position.lerpVectors(cameraMove.position,cameraMove.to,w);orbit.target.lerpVectors(cameraMove.target,cameraMove.look,w);camera.fov=THREE.MathUtils.lerp(cameraMove.fov,cameraMove.toFov,w);camera.updateProjectionMatrix();if(u===1)cameraMove=null;}
 // Confine navigation to the actual room, without resetting orbit or zoom.
 camera.position.x=THREE.MathUtils.clamp(camera.position.x,-4.96,4.96);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-4.48,9.03);camera.position.y=THREE.MathUtils.clamp(camera.position.y,.35,3.45);
}
orbit.addEventListener('start',()=>{cameraMove=null;viewMode='free';if($('followSpeaker'))$('followSpeaker').checked=false;if(actors.etudiant_avocat)actors.etudiant_avocat.model.visible=true;$('cameraView').value='free';});
window.SkillforceRoom={chooseView,setQuality,layout:ROOM.layout};


const DOCUMENT_ROLES=['ministere_public','avocat_adverse','etudiant_avocat'];
const docEase=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
function initDocuments(a){
 if(!DOCUMENT_ROLES.includes(a.id)||!a.documentMesh)return;
 const source=a.documentMesh;scene.updateMatrixWorld(true);source.skeleton?.update();
 const points=[];for(let i=0;i<source.geometry.attributes.position.count;i++){const p=a.root.worldToLocal(source.getVertexPosition(i,new V()).applyMatrix4(source.matrixWorld));if(!points.some(q=>p.distanceTo(q)<1e-5))points.push(p);}
 const center=points.reduce((v,p)=>v.add(p),new V()).divideScalar(points.length),first=points[0],edges=points.slice(1).map(p=>p.clone().sub(first)).sort((a,b)=>a.lengthSq()-b.lengthSq());let normal=edges[0].clone().normalize(),x=edges.find(e=>Math.abs(e.clone().normalize().dot(normal))<.1).clone().normalize();if(x.x<0)x.negate();let y=normal.clone().cross(x).normalize();if(y.y<0){normal.negate();y.negate();}
 const q=new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,normal)),geometry=source.geometry.clone(),inverse=q.clone().invert();
 for(let i=0;i<geometry.attributes.position.count;i++){const p=a.root.worldToLocal(source.getVertexPosition(i,new V()).applyMatrix4(source.matrixWorld)).sub(center).applyQuaternion(inverse);geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);}
 geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const paper=new THREE.Mesh(geometry,source.material.clone());paper.name=a.id+'__Document_mobile';paper.material.roughness=.98;paper.material.side=THREE.DoubleSide;paper.position.copy(center);paper.quaternion.copy(q);a.root.add(paper);source.visible=false;a.documentMesh=paper;scene.updateMatrixWorld(true);
 const d=a.documents={paper,source,index:DOCUMENT_ROLES.indexOf(a.id),top:1.0425,phase:'placing',time:0,grip:1,rest:{},wrist:{},offset:{},relative:{},fingerGrip:{},fingerRest:{},hold:center.clone(),holdQ:new Q().setFromAxisAngle(new V(1,0,0),-.18),flat:new V(0,0,.27),flatQ:new Q().setFromAxisAngle(new V(1,0,0),Math.PI/2),half:geometry.boundingBox.getSize(new V()).multiplyScalar(.5),reading:false,turnTime:0,wasActive:false,gesture:0};
 d.flat.y=d.top+d.half.z+.0015;d.hold.y=Math.max(center.y,d.top+d.half.y+.065);d.hold.z=Math.min(center.z,.33);d.from=d.hold.clone();d.fromQ=d.holdQ.clone();d.time=-.2-d.index*.42;
 a.handSurface={L:[],R:[]};a.model.traverse(mesh=>{if(!mesh.isSkinnedMesh||!mesh.name.includes('Corps_visage_mains'))return;const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight;for(const side of ['L','R']){const valid=new Set(mesh.skeleton.bones.map((b,i)=>norm(b.name).endsWith(side.toLowerCase())&&/(finger|metacarpal|wrist)/i.test(b.name)?i:-1)),indices=[];for(let i=0;i<si.count;i++){let weight=0;for(let k=0;k<4;k++)if(valid.has(si.getComponent(i,k)))weight+=sw.getComponent(i,k);if(weight>.65)indices.push(i);}a.handSurface[side].push({mesh,indices});}});
 for(const side of ['L','R']){
  const wrist=bone(a,'wrist.'+side),wq=wrist.getWorldQuaternion(new Q()),pq=paper.getWorldQuaternion(new Q());d.offset[side]=paper.worldToLocal(world(wrist));d.relative[side]=pq.invert().multiply(wq);d.fingerGrip[side]=a.supportPose[side].fingers.map(([n,q])=>[n,q.clone()]);d.fingerRest[side]=d.fingerGrip[side].map(([n])=>[n,a.bindPose[norm(a.id+'__'+n)].clone()]);
  const sign=side==='L'?1:-1,f=world(bone(a,'finger3-1.'+side)).sub(world(wrist)).normalize(),width=world(bone(a,'finger2-1.'+side)).sub(world(bone(a,'finger5-1.'+side)));width.addScaledVector(f,-width.dot(f)).normalize();const n=width.clone().cross(f),tf=new V(-.05*sign,-.025,1).normalize().applyQuaternion(a.root.quaternion),tw=new V(-sign,0,0).applyQuaternion(a.root.quaternion);tw.addScaledVector(tf,-tw.dot(tf)).normalize();const tn=tw.clone().cross(tf),rotation=new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tw,tf,tn).multiply(new THREE.Matrix4().makeBasis(width,f,n).invert()));d.wrist[side]=a.root.getWorldQuaternion(new Q()).invert().multiply(rotation.multiply(wrist.getWorldQuaternion(new Q())));d.rest[side]=new V(sign*.205,d.top+.025,.355);
 }
 // Calibrate the resting palms against the actual skinned surface.
 for(const side of ['L','R']){docArm(a,side,0,0);scene.updateMatrixWorld(true);const min=handMinimum(a,side);d.rest[side].y+=d.top+.002-min;}
 paper.position.copy(d.hold);paper.quaternion.copy(d.holdQ);results.documents??={};results.documents[a.id]={deposits:0,pickups:0,reads:0};
}
function docArm(a,side,grip,gesture){
 const d=a.documents;for(const [name,q]of a.supportPose[side].arms)bone(a,name).quaternion.copy(q);a.root.updateWorldMatrix(true,true);
 const rest=d.rest[side].clone();if(side==='R'){rest.y+=gesture*.065;rest.x-=gesture*.025;}const goal=a.root.localToWorld(rest).lerp(d.paper.localToWorld(d.offset[side].clone()),grip),restQ=a.root.getWorldQuaternion(new Q()).multiply(d.wrist[side].clone()),heldQ=d.paper.getWorldQuaternion(new Q()).multiply(d.relative[side]);goal.y+=.045*Math.sin(Math.PI*grip);supportArm(a,side,goal,restQ.slerp(heldQ,grip));
 for(let i=0;i<d.fingerRest[side].length;i++){const [name,q]=d.fingerRest[side][i];bone(a,name).quaternion.copy(q).slerp(d.fingerGrip[side][i][1],grip);}
 a.root.updateWorldMatrix(true,true);
}
function updateDocuments(a,dt){
 const d=a.documents;if(!d)return;d.time+=dt;
 const active=a.id===speakerId&&ORAL_STATES.includes(a.state);if(active){if(!d.wasActive)d.turnTime=0;d.turnTime+=dt;}else d.turnTime=0;d.wasActive=active;
 const wants=['presenting','reading'].includes(a.state),begin=(phase)=>{d.phase=phase;d.time=0;d.from=d.paper.position.clone();d.fromQ=d.paper.quaternion.clone();};
 if(d.phase==='rest'&&wants)begin('grasp');if(d.phase==='hold'&&!wants)begin('placing');if(d.phase==='lifting'&&!wants)begin('placing');
 let grip=d.grip;
 if(d.phase==='placing'){
  const u=docEase(d.time/1.45);d.paper.position.lerpVectors(d.from,d.flat,u);d.paper.quaternion.copy(d.fromQ).slerp(d.flatQ,u);d.paper.position.y+=.14*Math.sin(Math.PI*u);const q=d.paper.quaternion,extent=Math.abs(new V(1,0,0).applyQuaternion(q).y)*d.half.x+Math.abs(new V(0,1,0).applyQuaternion(q).y)*d.half.y+Math.abs(new V(0,0,1).applyQuaternion(q).y)*d.half.z;d.paper.position.y=Math.max(d.paper.position.y,d.top+extent+.0015);grip=1-docEase((u-.65)/.35);if(d.time>=1.45){d.paper.position.copy(d.flat);d.paper.quaternion.copy(d.flatQ);results.documents[a.id].deposits++;begin('release');}
 }else if(d.phase==='release'){grip=0;if(d.time>=.7){grip=0;begin('rest');}}
 else if(d.phase==='grasp'){grip=docEase(d.time/.75);const u=grip*.60;d.paper.position.lerpVectors(d.flat,d.hold,u);d.paper.position.y+=.04*Math.sin(Math.PI*u);d.paper.quaternion.copy(d.flatQ).slerp(d.holdQ,u);const extent=Math.abs(new V(0,1,0).applyQuaternion(d.paper.quaternion).y)*d.half.y+Math.abs(new V(1,0,0).applyQuaternion(d.paper.quaternion).y)*d.half.x+Math.abs(new V(0,0,1).applyQuaternion(d.paper.quaternion).y)*d.half.z;d.paper.position.y=Math.max(d.paper.position.y,d.top+extent+.0015);if(d.time>=.75){grip=1;begin('lifting');results.documents[a.id].pickups++;}}
 else if(d.phase==='lifting'){const u=docEase(d.time/.95);d.paper.position.lerpVectors(d.from,d.hold,u);d.paper.position.y+=.055*Math.sin(Math.PI*u);d.paper.quaternion.copy(d.fromQ).slerp(d.holdQ,u);const q=d.paper.quaternion,extent=Math.abs(new V(0,1,0).applyQuaternion(q).y)*d.half.y+Math.abs(new V(1,0,0).applyQuaternion(q).y)*d.half.x+Math.abs(new V(0,0,1).applyQuaternion(q).y)*d.half.z;d.paper.position.y=Math.max(d.paper.position.y,d.top+extent+.0015);grip=1;if(d.time>=.95)begin('hold');}
 else if(d.phase==='hold')grip=1;else grip=0;
 const turn=d.turnTime,readFlat=active&&d.phase==='rest'&&((turn>.95+d.index*.17&&turn<2.15+d.index*.17)||(turn>5.7&&turn%9>6.0&&turn%9<7.4));const reading=readFlat||(a.state==='reading'&&d.phase==='hold');if(reading&&!d.reading)results.documents[a.id].reads++;d.reading=reading;d.grip=grip;
 const gesture=active&&!reading&&d.phase==='rest'&&turn>.5?Math.max(0,Math.sin(turn*1.5+d.index))*.8:0;d.gesture+=(gesture-d.gesture)*(1-Math.exp(-dt*5));
 d.paper.updateWorldMatrix(true,true);for(const side of ['L','R'])docArm(a,side,grip,side==='R'?d.gesture:0);
 d.contactError=Math.max(...Object.values(a.supportErrors||{}));d.paperGap=d.paper.position.y-(Math.abs(new V(1,0,0).applyQuaternion(d.paper.quaternion).y)*d.half.x+Math.abs(new V(0,1,0).applyQuaternion(d.paper.quaternion).y)*d.half.y+Math.abs(new V(0,0,1).applyQuaternion(d.paper.quaternion).y)*d.half.z)-d.top;
}

const BAR_ROLES=['client_prevenu','temoin_01'];let courtVisit=null,courtQueue=[],manualCourtTest=false,courtElapsed=0;
function courtInternal(a,state,clip=null){a.courtInternal=true;try{return change(a,state,0,clip);}finally{a.courtInternal=false;}}
function setupCourtClips(a){
 if(a.id!=='temoin_01')return;const source=actors.client_prevenu;
 for(const [tag,src,state]of [['debout_barre','standing_idle_a','standing_idle'],['parole_barre','speaking_a','speaking']]){
  const original=source.clips['client_prevenu__'+src],tracks=[];for(const tr of original.tracks){const cut=tr.name.lastIndexOf('.'),name=tr.name.slice(0,cut),prop=tr.name.slice(cut);if(!['.quaternion','.position','.scale'].includes(prop))continue;const b=a.bones[norm(name.replaceAll('client_prevenu','temoin_01'))];if(!b)continue;const copy=tr.clone();copy.name=b.name+prop;tracks.push(copy);}
  const name=a.id+'__'+tag;a.clips[name]=new THREE.AnimationClip(name,original.duration,tracks);a.map.clips[name]={state,loop:true,once:false};if(state==='standing_idle')a.map.states.standing_idle=[name];a.courtSpeakingClip=state==='speaking'?name:a.courtSpeakingClip;
 }
}
function interceptCourtChange(a,state){
 if(!BAR_ROLES.includes(a.id)||a.courtInternal)return null;
 if(state==='speaking'){if(courtVisit?.id===a.id&&courtVisit.phase==='speaking')return null;return requestBar(a.id);}
 if(a.courtMoving){if(['idle','listening'].includes(state)&&courtVisit?.id===a.id&&courtVisit.phase==='speaking')beginCourtReturn();return true;}
 return null;
}
function requestBar(id){
 if(!BAR_ROLES.includes(id))return false;if(actors.president?.gavelAction){courtQueue=[];return false;}if(courtVisit){if(courtVisit.id!==id&&!courtQueue.includes(id))courtQueue.push(id);return true;}
 const a=actors[id];releaseFloor();courtVisit={id,a,phase:'called',time:0,home:a.root.position.clone(),homeYaw:a.root.rotation.y,center:null,feet:{},heading:a.root.rotation.y,stand:0,spoken:0};a.courtMoving=true;initCourtFeet(courtVisit);courtInternal(actors.president,'asking');speakerId='president';if($('voice').getAttribute('src'))$('voice').pause();results.court??={events:[],samples:0,max_foot_ik_error_m:0};courtEvent('called');courtCamera('general');return true;
}
function courtEvent(type){results.court.events.push({type,id:courtVisit.id,time:courtElapsed,audience_clock:clock,phase:courtVisit.phase,position:courtVisit.a.root.position.toArray()});}
function courtCamera(mode){if($('followSpeaker')?.checked)chooseView(mode);}
function courtPhase(phase){courtVisit.phase=phase;courtVisit.time=0;courtEvent(phase);}
function initCourtFeet(v){
 const a=v.a;a.root.updateWorldMatrix(true,true);v.relativeQ={};v.homeFeet={};let center=new V();for(const side of ['L','R']){const f=bone(a,'foot.'+side),p=world(f);v.feet[side]={position:p.clone(),q:f.getWorldQuaternion(new Q())};v.homeFeet[side]=p.clone();v.relativeQ[side]=a.root.getWorldQuaternion(new Q()).invert().multiply(f.getWorldQuaternion(new Q()));center.add(p);}center.multiplyScalar(.5);center.y=0;v.center=center;v.homeCenter=center.clone();v.stance=.36;v.footHeight=(v.feet.L.position.y+v.feet.R.position.y)/2;
}
function courtSetRoot(v,center,yaw,bounce=0){
 const a=v.a;v.center.copy(center);v.heading=yaw;a.root.rotation.y=yaw;const forward=new V(Math.sin(yaw),0,Math.cos(yaw));a.root.position.copy(center).addScaledVector(forward,-v.stance);a.root.position.y=v.home.y+bounce;a.root.updateWorldMatrix(true,true);
}
function courtCurve(v,returning){
 let points;if(returning)points=v.outPoints.slice().reverse().map(p=>p.clone());else{const mids=v.id==='client_prevenu'?[[-2.0,1.95],[-1.55,1.10],[-.65,.90]]:[[2,1.85],[1.5,1.15],[.6,.90]];points=[v.homeCenter.clone(),...mids.map(p=>new V(p[0],0,p[1])),new V(0,0,.88)];v.outPoints=points.map(p=>p.clone());}
 v.curve=new THREE.CatmullRomCurve3(points,false,'centripetal');v.length=v.curve.getLength();v.walkDuration=Math.max(2,v.length/.40);v.step=-1;v.returning=returning;v.lastCenter=v.center.clone();v.walkStartYaw=v.heading;
}
function courtPathPoint(v,time){return v.curve.getPointAt(docEase(time/v.walkDuration));}
function courtStartTurn(v,targetYaw,next){v.turnFrom=v.heading;v.turnTo=v.heading+Math.atan2(Math.sin(targetYaw-v.heading),Math.cos(targetYaw-v.heading));v.turnFeet=Object.fromEntries(['L','R'].map(s=>[s,{position:v.feet[s].position.clone(),q:v.feet[s].q.clone()}]));v.afterTurn=next;courtPhase('turning');}
function courtStandingTarget(v,side,yaw){return v.center.clone().add(new V(side==='L'?.115:-.115,v.footHeight,0).applyAxisAngle(new V(0,1,0),yaw));}
function courtTurnFeet(v){
 const u=THREE.MathUtils.clamp(v.time/1.2,0,1),yaw=THREE.MathUtils.lerp(v.turnFrom,v.turnTo,docEase(u));courtSetRoot(v,v.center.clone(),yaw);for(const [i,side]of ['L','R'].entries()){const t=THREE.MathUtils.clamp((u-i*.5)*2,0,1),ease=docEase(t),target=courtStandingTarget(v,side,v.turnTo);v.feet[side].position.lerpVectors(v.turnFeet[side].position,target,ease);v.feet[side].position.y+=.045*Math.sin(Math.PI*t);const q=new Q().setFromAxisAngle(new V(0,1,0),v.turnTo).multiply(v.relativeQ[side]);v.feet[side].q.copy(v.turnFeet[side].q).slerp(q,ease);}
}
function beginCourtReturn(){
 const v=courtVisit;if(!v||v.phase!=='speaking')return;courtInternal(v.a,'standing_idle');if($('voice').dataset.actor===v.id)$('voice').pause();speakerId='president';courtCurve(v,true);const tangent=v.curve.getTangentAt(0);courtStartTurn(v,Math.atan2(tangent.x,tangent.z),'walk');
}
function advanceCourt(dt){
 courtElapsed+=dt;const v=courtVisit;if(!v){if(courtQueue.length)requestBar(courtQueue.shift());return;}v.time+=dt;const a=v.a;
 if(v.phase==='called'&&v.time>=1.15){courtInternal(actors.president,'idle');courtInternal(a,'standing_idle');courtPhase('rising');}
 else if(v.phase==='rising'){v.stand=docEase(v.time/1.45);if(v.time>=1.5){initCourtFeet(v);courtCurve(v,false);const tangent=v.curve.getTangentAt(0);courtStartTurn(v,Math.atan2(tangent.x,tangent.z),'walk');}}
 else if(v.phase==='turning'){v.stance+=THREE.MathUtils.clamp(.36-v.stance,-dt*.25,dt*.25);courtTurnFeet(v);if(v.time>=1.2){if(v.afterTurn==='walk'){courtPhase('walking');v.step=-1;}else if(v.afterTurn==='speak'){courtInternal(a,'speaking',a.id==='temoin_01'?a.courtSpeakingClip:null);speakerId=a.id;courtPhase('speaking');courtCamera('barre');const voice=$('voice');v.speechDuration=5.6;if(voice.dataset.actor===a.id&&voice.getAttribute('src')){voice.currentTime=0;if(Number.isFinite(voice.duration))v.speechDuration=Math.max(5.6,voice.duration+.25);voice.play().catch(()=>{results.court.audio_autoplay_blocked=true;});}}else{courtInternal(a,'idle');courtPhase('sitting');}}}
 else if(v.phase==='walking'){
  const center=courtPathPoint(v,v.time),future=courtPathPoint(v,Math.min(v.walkDuration,v.time+.18)),delta=future.clone().sub(center);if(delta.length()>.001){const target=Math.atan2(delta.x,delta.z),gap=Math.atan2(Math.sin(target-v.heading),Math.cos(target-v.heading));v.heading+=THREE.MathUtils.clamp(gap,-dt*1.8,dt*1.8);}
  const duration=.52,step=Math.floor(v.time/duration),u=(v.time%duration)/duration,side=step%2===0?'L':'R';if(step!==v.step){v.step=step;v.swingSide=side;v.swingFrom=v.feet[side].position.clone();v.swingFromQ=v.feet[side].q.clone();const future=courtPathPoint(v,Math.min(v.walkDuration,(step+1)*duration+.1)),targetYaw=v.heading;v.swingTo=future.add(new V(side==='L'?.115:-.115,v.footHeight,0).applyAxisAngle(new V(0,1,0),targetYaw));v.swingToQ=new Q().setFromAxisAngle(new V(0,1,0),targetYaw).multiply(v.relativeQ[side]);}
  const swing=v.feet[v.swingSide];swing.position.lerpVectors(v.swingFrom,v.swingTo,docEase(u));swing.position.y+=.075*Math.sin(Math.PI*u);swing.q.copy(v.swingFromQ).slerp(v.swingToQ,docEase(u)).premultiply(new Q().setFromAxisAngle(new V(1,0,0).applyAxisAngle(new V(0,1,0),v.heading),-.14*Math.sin(Math.PI*u)));if(u>1-dt/duration){swing.position.copy(v.swingTo);swing.q.copy(v.swingToQ);}
  v.stance+=THREE.MathUtils.clamp(.36-v.stance,-dt*.25,dt*.25);const envelope=Math.max(0,Math.min(1,v.time/.65,(v.walkDuration-v.time)/.65));courtSetRoot(v,center,v.heading,(-.04+.009*Math.sin(2*Math.PI*v.time/duration))*envelope);if(v.time>=v.walkDuration){const destination=v.returning?v.homeCenter:new V(0,0,.88);courtSetRoot(v,destination,v.heading);courtStartTurn(v,v.returning?v.homeYaw:Math.PI,v.returning?'sit':'speak');}
 }
 else if(v.phase==='speaking'){v.spoken+=dt;if(v.time>=(v.speechDuration||5.6))beginCourtReturn();}
 else if(v.phase==='sitting'){v.stand=1-docEase(v.time/1.45);if(v.time>=1.5){a.root.position.copy(v.home);a.root.rotation.y=v.homeYaw;a.courtMoving=false;courtEvent('seated');const close=v.closeRequested;courtVisit=null;if(close){courtQueue=[];closeAudience();}else if(courtQueue.length)requestBar(courtQueue.shift());}}
 if(courtVisit?.closeRequested&&courtVisit.phase==='speaking')beginCourtReturn();
 const current=courtVisit;if(current){const labels={called:'Appel',rising:'Se lève',turning:'Orientation',walking:current.returning?'Retour à la place':'Marche vers la barre',speaking:'Parole à la barre',sitting:'Se rassoit'};$('playbackStatus').textContent=ROLE_LABELS[current.id]+' · '+labels[current.phase];}
}
function courtLeg(a,side,goal,footQ){
 const hip=bone(a,'upperleg01.'+side),knee=bone(a,'lowerleg01.'+side),foot=bone(a,'foot.'+side),origin=world(hip),l1=origin.distanceTo(world(knee)),l2=world(knee).distanceTo(world(foot)),dir=goal.clone().sub(origin),d=Math.max(.001,Math.min(dir.length(),l1+l2-.0001));dir.normalize();const pole=new V(0,-.3,.8).applyQuaternion(a.root.quaternion);pole.addScaledVector(dir,-pole.dot(dir)).normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),targetKnee=origin.clone().addScaledVector(dir,along).addScaledVector(pole,height);
 function aim(joint,tip,target){const from=world(tip).sub(world(joint)).normalize(),to=target.clone().sub(world(joint)).normalize(),q=new Q().setFromUnitVectors(from,to).multiply(joint.getWorldQuaternion(new Q()));joint.quaternion.copy(joint.parent.getWorldQuaternion(new Q()).invert().multiply(q));joint.updateWorldMatrix(false,true);}
 aim(hip,knee,targetKnee);aim(knee,foot,goal);foot.quaternion.copy(foot.parent.getWorldQuaternion(new Q()).invert().multiply(footQ));foot.updateWorldMatrix(false,true);return world(foot).distanceTo(goal);
}
function updateCourtPose(a,dt){
 const v=courtVisit;if(!v||v.a!==a)return;morph(a,'Seated_Drape',1-v.stand);
 if(v.feet.L&&['walking','turning'].includes(v.phase)){let correction=0;for(const side of ['L','R']){const hip=bone(a,'upperleg01.'+side),knee=bone(a,'lowerleg01.'+side),foot=bone(a,'foot.'+side),h=world(hip),k=world(knee),f=world(foot),g=v.feet[side].position,length=h.distanceTo(k)+k.distanceTo(f)-.001,horizontal=Math.hypot(h.x-g.x,h.z-g.z),height=Math.sqrt(Math.max(0,length*length-horizontal*horizontal));correction=Math.max(correction,h.y-g.y-height);}v.pelvisCorrection=Math.max(0,Math.min(.07,correction));a.root.position.y-=v.pelvisCorrection;a.root.updateWorldMatrix(true,true);results.court.max_pelvis_correction_m=Math.max(results.court.max_pelvis_correction_m||0,v.pelvisCorrection);}
 if(v.feet.L){for(const side of ['L','R']){const error=courtLeg(a,side,v.feet[side].position,v.feet[side].q);results.court.max_foot_ik_error_m=Math.max(results.court.max_foot_ik_error_m,error);}}
 if(v.phase==='walking'){
  const phase=2*Math.PI*v.time/1.04;for(const [i,side]of ['L','R'].entries()){const upper=bone(a,'upperarm01.'+side),axis=new V(1,0,0).applyQuaternion(a.root.quaternion),q=new Q().setFromAxisAngle(axis,.10*Math.sin(phase+i*Math.PI)).multiply(upper.getWorldQuaternion(new Q()));upper.quaternion.copy(upper.parent.getWorldQuaternion(new Q()).invert().multiply(q));upper.updateWorldMatrix(false,true);}
 }
}
function courtAttention(a){const v=courtVisit;if(v&&a.id==='president'&&['called','rising'].includes(v.phase))return {mode:'appel',id:v.id,point:world(bone(v.a,'head'))};if(!v||v.a!==a)return null;if(['walking','turning'].includes(v.phase)){const p=world(bone(a,'head')).add(new V(Math.sin(v.heading)*2,-.12,Math.cos(v.heading)*2));return {mode:'trajet',id:null,point:p};}if(v.phase==='speaking')return {mode:'cour',id:'president',point:world(bone(actors.president,'head'))};return null;}
function startBarDemo(){if(courtVisit)return false;stopCollective();$('followSpeaker').checked=true;courtQueue=['temoin_01'];requestBar('client_prevenu');return true;}
window.SkillforceCourt={requestBar,startBarDemo,get visit(){return courtVisit;},get queue(){return courtQueue.slice();}};

function bone(a,n){return a.bones[norm(a.id+'__'+n)];}

function world(o){return o.getWorldPosition(new V());}

const ORAL_STATES=['speaking','asking','presenting','reply','calming'];
const ROLE_LABELS={president:'Président',assesseur_01:'Assesseur 1',assesseur_02:'Assesseur 2',ministere_public:'Ministère public',avocat_adverse:'Avocat adverse',greffier:'Greffier',etudiant_avocat:'Étudiant avocat',client_prevenu:'Prévenu (client)',temoin_01:'Témoin 01'};
function quiet(a){
 change(a,'idle',a.seed%2);a.reactionStart=-100;
 if(a.quietToken!==a.token){a.quietToken=a.token;const duration=a.target.getClip().duration;a.target.time=((a.seed*1.137)+(schedule?.cycle||0)*.37)%duration;a.target.setEffectiveTimeScale(.94+(a.seed%4)*.027);}
}
function releaseFloor(){for(const a of Object.values(actors))if(ORAL_STATES.includes(a.state))quiet(a);}
function takeFloor(id,state='speaking',reaction=null,v=0){
 releaseFloor();change(actors[id],state,v);if(id==='ministere_public')courtCamera(id);
 if(reaction&&actors[reaction]&&reaction!==id)actors[reaction].reactionStart=clock+1.15+(actors[reaction].seed%3)*.13;
}

function change(a,state,v=variant,explicit=null){const intercepted=interceptCourtChange(a,state);if(intercepted!==null)return intercepted;if(actors.president?.gavelAction&&!actors.president.gavelAction.finishing)return false;const choices=a.map.states[state];if(!explicit&&!choices?.length)return false;const name=explicit||choices[v%choices.length],clip=a.clips[name];if(!clip)return false;if(ORAL_STATES.includes(state)){for(const other of Object.values(actors))if(other!==a&&ORAL_STATES.includes(other.state)){quiet(other);other.mouthBlend=0;for(const n of ['Jaw_Open','Viseme_A','Viseme_E','Viseme_O','Viseme_MBP'])morph(other,n,0);}if(speakerId!==a.id){previousSpeakerId=speakerId;speakerId=a.id;}if(!ORAL_STATES.includes(a.state))a.turnStart=clock;}if(name===a.current&&a.target&&!explicit)return true;

 if(BAR_ROLES.includes(a.id)){const standing=s=>s==='standing_idle'||s==='speaking';a.poseTransition=standing(a.state)!==standing(state);a.rising=standing(state)&&a.poseTransition;}
 const before=world(bone(a,'head'));a.previous=a.active.map(x=>({action:x.action,weight:x.action.getEffectiveWeight(),meta:x.meta}));a.elapsed=0;a.state=state;a.current=name;a.token++;

 let action=a.mixer.clipAction(clip);const prior=a.previous.find(x=>x.action===action);if(!prior||prior.weight<1e-6)action.reset();action.enabled=true;action.paused=false;action.setEffectiveWeight(prior?.weight||0).setEffectiveTimeScale(1);const meta=a.map.clips[name];action.setLoop(meta.loop?THREE.LoopRepeat:THREE.LoopOnce,meta.loop?Infinity:1);action.clampWhenFinished=true;action.play();a.active=a.previous.filter(x=>x.action!==action);a.active.push({action,weight:0,meta});a.target=action;a.once=meta.once;a.done=false;

 const jump=before.distanceTo(world(bone(a,'head')));results.transition_tests.push({id:a.id,state,immediate_head_jump_m:jump,interrupted:a.previous.length>1});return true;}

function setState(id,state,v){return change(actors[id],state,v);}

function setVisemes(id,cues){if(!Array.isArray(cues))throw Error('Tableau de timings requis');for(const c of cues)if(!Number.isFinite(c.time_ms)||c.time_ms<0||!Number.isFinite(c.duration_ms)||c.duration_ms<=0||!['A','E','O','MBP'].includes(c.viseme))throw Error('Visème invalide');actors[id].cues=cues;}

window.Skillforce={setState,setVisemes,actors,results,playClip:(id,name)=>change(actors[id],actors[id].map.clips[name].state,0,name)};

function morph(a,name,value){for(const m of a.morphs){const i=m.morphTargetDictionary[name];if(i!==undefined)m.morphTargetInfluences[i]=value;}}

function localTarget(a,p){return a.root.localToWorld(new V(p[0],p[2],-p[1]));}

function handMinimum(a,side){scene.updateMatrixWorld(true);let minimum=Infinity;for(const {mesh,indices}of a.handSurface[side]){mesh.skeleton.update();for(const i of indices){const p=mesh.getVertexPosition(i,new V()).applyMatrix4(mesh.matrixWorld);minimum=Math.min(minimum,p.y);}}return minimum;}
function calibrateSupports(a){
 if(a.map.posture!=='seated')return;
 a.handSurface={L:[],R:[]};
 a.model.traverse(mesh=>{if(!mesh.isSkinnedMesh||!mesh.name.includes('Corps_visage_mains'))return;const joints=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');for(const side of ['L','R']){const valid=new Set(mesh.skeleton.bones.map((b,i)=>norm(b.name).endsWith(side.toLowerCase())&&/(finger|metacarpal|wrist)/i.test(b.name)?i:-1)),indices=[];for(let i=0;i<joints.count;i++){let total=0;for(let c=0;c<4;c++)if(valid.has(joints.getComponent(i,c)))total+=weights.getComponent(i,c);if(total>.65)indices.push(i);}a.handSurface[side].push({mesh,indices});}});
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,wrist=bone(a,'wrist.'+side),f=world(bone(a,'finger3-1.'+side)).sub(world(wrist)).normalize(),w=world(bone(a,'finger2-1.'+side)).sub(world(bone(a,'finger5-1.'+side)));w.addScaledVector(f,-w.dot(f)).normalize();const n=w.clone().cross(f),tf=new V(-.08*sign,-.025,1).normalize().applyQuaternion(a.root.quaternion),tw=new V(-sign,0,0).applyQuaternion(a.root.quaternion);tw.addScaledVector(tf,-tw.dot(tf)).normalize();const tn=tw.clone().cross(tf),rotation=new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tw,tf,tn).multiply(new THREE.Matrix4().makeBasis(w,f,n).invert()));
  a.supportPose[side].wristRoot=a.root.getWorldQuaternion(new Q()).invert().multiply(rotation.multiply(wrist.getWorldQuaternion(new Q())));
 }
 contacts(a,0);a.root.updateWorldMatrix(true,true);
 const table=a.root.localToWorld(new V(0,a.map.stage.desk.center_blender[2]+a.map.stage.desk.size_blender[2]/2,0)).y;
 for(const side of ['L','R']){const minimum=handMinimum(a,side);if(Number.isFinite(minimum))a.map.anchors_blender[side][2]+=table+.002-minimum;}
 contacts(a,0);a.root.updateWorldMatrix(true,true);
}

// Solve a supported arm with a stable outward elbow plane. Wrist position
// alone is insufficient: unconstrained CCD can fold the elbow across the body.
function supportArm(a,side,goal,wristQ){
 const upper=bone(a,'upperarm01.'+side),lower=bone(a,'lowerarm01.'+side),wrist=bone(a,'wrist.'+side),shoulder=world(upper),elbow=world(lower),hand=world(wrist),l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(hand),axis=goal.clone().sub(shoulder),d=Math.min(axis.length(),l1+l2-.0005);axis.normalize();
 const local=a.root.worldToLocal(goal.clone()),pole=a.root.localToWorld(new V((side==='L'?1:-1)*.32,local.y-.20,local.z-.12)).sub(shoulder);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),desiredElbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,height);
 function rotate(p,from,to){const q=p.getWorldQuaternion(new Q()).premultiply(new Q().setFromUnitVectors(from.normalize(),to.normalize()));p.quaternion.copy(p.parent.getWorldQuaternion(new Q()).invert().multiply(q));p.updateWorldMatrix(false,true);}
 rotate(upper,world(lower).sub(shoulder),desiredElbow.sub(shoulder));rotate(lower,world(wrist).sub(world(lower)),goal.clone().sub(world(lower)));
 wrist.quaternion.copy(wrist.parent.getWorldQuaternion(new Q()).invert().multiply(wristQ));wrist.updateWorldMatrix(false,true);
 const error=world(wrist).distanceTo(goal);a.supportErrors??={};a.supportErrors[side]=error;results.runtime.contact_error_m=Math.max(results.runtime.contact_error_m,error);
}
function contacts(a,dt){
 if(a.map.posture!=='seated')return;
 a.supportBlend??={gesture:0,writing:0};
 const wanting=ORAL_STATES.includes(a.state)&&a.id===speakerId&&clock>=(a.turnStart??0)+.45?1:0,writing=a.id==='greffier'&&a.state==='writing'?1:0,blend=1-Math.exp(-dt*5);
 a.supportBlend.gesture+=(wanting-a.supportBlend.gesture)*blend;a.supportBlend.writing+=(writing-a.supportBlend.writing)*blend;
 for(const side of ['L','R']){
  if(a.id==='president'&&a.gavelAction&&side==='R')continue;
  for(const [name,q]of a.supportPose[side].arms)bone(a,name).quaternion.copy(q);a.root.updateWorldMatrix(true,true);const base=localTarget(a,a.map.anchors_blender[side]),right=side==='R',g=right?a.supportBlend.gesture:0,w=right?a.supportBlend.writing:0;
  // The supporting hand stays planted; a speaking hand lifts through one
  // controlled arc, then settles continuously instead of dropping at a clip boundary.
  const lift=g*(.055+.015*Math.sin(clock*1.8));
  const goal=base.clone().add(new V(w*.008*Math.sin(clock*5),lift,w*.006*Math.cos(clock*5)).applyQuaternion(a.root.quaternion));
  const desired=a.root.getWorldQuaternion(new Q()).multiply(a.supportPose[side].wristRoot.clone());
  if(g>.001)desired.premultiply(new Q().setFromAxisAngle(new V(1,0,0).applyQuaternion(a.root.quaternion),g*.14));
  supportArm(a,side,goal,desired);
  for(const [name,q]of a.supportPose[side].fingers)bone(a,name).quaternion.copy(q);
 }
}

function attentionTarget(a){const courtTarget=courtAttention(a);if(courtTarget)return courtTarget;
 if(a.documents&&(a.documents.reading||['placing','grasp','release'].includes(a.documents.phase)))return {mode:'notes',id:null,point:world(a.documents.paper)};
 if(a.id==='president'&&a.gavelAction)return {mode:'gavel',id:null,point:a.root.localToWorld(new V(-.38,.80,.55))};
 const head=bone(a,'head'),speaker=actors[speakerId],index=ids.indexOf(a.id),period=14+index*1.37,phase=(clock+index*3.17)%period;
 if(a.id===speakerId){
  const other=['client_prevenu','etudiant_avocat','temoin_01'].includes(a.id)?actors.president:actors[previousSpeakerId]&&previousSpeakerId!==a.id?actors[previousSpeakerId]:a.id==='president'?actors.ministere_public:actors.president;
  return {mode:'interlocutor',id:other?.id,point:other?world(bone(other,'head')):world(head).add(new V(0,0,2))};
 }
 const writing=a.id==='greffier'&&a.state==='writing';
 const notes=writing?phase%5<3.6:phase<(a.id==='greffier'?4.5:a.map.posture==='seated'?2.8:2.3);
 if(notes&&['client_prevenu','temoin_01'].includes(a.id)){const h=a.root.worldToLocal(world(head)).y;return {mode:'neutral',id:null,point:localTarget(a,[.15,-1.8,h-.20])};}
 if(notes){
  let point=localTarget(a,a.map.reading_target_blender);
  if(a.documentMesh){const m=a.documentMesh;m.skeleton?.update();point=new V();const n=m.geometry.getAttribute('position').count;for(let i=0;i<n;i++)point.add(m.getVertexPosition(i,new V()).applyMatrix4(m.matrixWorld));point.divideScalar(n);}
  return {mode:'notes',id:null,point};
 }
 if(phase<(a.id==='greffier'?7:5.5)){
  const h=a.root.worldToLocal(world(head)).y;
  return {mode:'neutral',id:null,point:localTarget(a,[(index%2?-.25:.3),-2.8,h-.04])};
 }
 return {mode:'speaker',id:speaker?.id,point:speaker?world(bone(speaker,'head')):world(head).add(new V(0,0,2))};
}

function gaze(a,dt){
 const head=bone(a,'head'),attention=attentionTarget(a),target=attention.point;a.targetPoint=target;a.gazeTargetId=attention.id;a.attentionMode=attention.mode;
 const rate=1-Math.exp(-dt*6),up=new V(0,1,0),base=head.getWorldQuaternion(new Q()),forward=a.headAxis.clone().applyQuaternion(base),desired=target.clone().sub(world(head)).normalize();
 let yaw=Math.atan2(desired.x,desired.z)-Math.atan2(forward.x,forward.z);yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));
 a.lookYaw??=0;a.lookVelocity??=0;const gap=yaw-a.lookYaw,wantedVelocity=THREE.MathUtils.clamp(gap*5,-2.2,2.2);a.lookVelocity+=THREE.MathUtils.clamp(wantedVelocity-a.lookVelocity,-10*dt,10*dt);const advance=a.lookVelocity*dt;if(Math.abs(advance)>Math.abs(gap)){a.lookYaw=yaw;a.lookVelocity=0;}else a.lookYaw+=advance;
 function yawBone(name,angle){const p=bone(a,name);if(!p)return;const q=p.getWorldQuaternion(new Q()).premultiply(new Q().setFromAxisAngle(up,angle));p.quaternion.copy(p.parent.getWorldQuaternion(new Q()).invert().multiply(q));p.updateWorldMatrix(false,true);}
 const torso=a.map.posture.startsWith('seated')?0:THREE.MathUtils.clamp(a.lookYaw*.35,-.60,.60),neck=THREE.MathUtils.clamp((a.lookYaw-torso)*.35,-.55,.55);
 for(const [name,part]of [['spine03',.30],['spine02',.35],['spine01',.35]])yawBone(name,torso*part);for(const name of ['neck01','neck02','neck03'])yawBone(name,neck/3);yawBone('head',THREE.MathUtils.clamp(a.lookYaw-torso-neck,-1.35,1.35));
 const q=head.getWorldQuaternion(new Q()),front=a.headAxis.clone().applyQuaternion(q),aim=target.clone().sub(world(head)).normalize(),pitch=THREE.MathUtils.clamp(Math.asin(aim.y)-Math.asin(THREE.MathUtils.clamp(front.y,-1,1)),a.attentionMode==='notes'?-.60:-.32,.32);
 a.lookPitch=(a.lookPitch??0)+(pitch-(a.lookPitch??0))*rate;
 const reactionTime=clock-(a.reactionStart??-100),ack=a.id!==speakerId&&reactionTime>=0&&reactionTime<1.15?.028*Math.sin(Math.PI*reactionTime/1.15)**2:0;const axis=front.clone().cross(up).normalize(),out=q.premultiply(new Q().setFromAxisAngle(axis,a.lookPitch-ack));head.quaternion.copy(head.parent.getWorldQuaternion(new Q()).invert().multiply(out));head.updateWorldMatrix(false,true);
 for(const side of ['L','R']){const eye=bone(a,'eye.'+side);if(!eye)continue;eye.quaternion.copy(a.eyeRest[side]);eye.updateWorldMatrix(false,true);const eq=eye.getWorldQuaternion(new Q()),from=a.eyeAxes[side].clone().applyQuaternion(eq),to=target.clone().sub(world(eye)).normalize(),delta=new Q().setFromUnitVectors(from,to),angle=2*Math.acos(Math.min(1,Math.abs(delta.w)));if(angle>.60)delta.identity().slerp(new Q().setFromUnitVectors(from,to),.60/angle);const local=eye.parent.getWorldQuaternion(new Q()).invert().multiply(delta.multiply(eq));a.eyeCurrent[side].slerp(local,1-Math.exp(-dt*16));eye.quaternion.copy(a.eyeCurrent[side]);eye.updateWorldMatrix(false,true);}
}

function face(a,dt){a.blinkClock+=dt;if(a.blinkClock>a.nextBlink+.18){a.blinkClock=0;a.nextBlink=3.1+(a.seed++%17)*.19;}const b=Math.exp(-Math.pow((a.blinkClock-a.nextBlink)/.052,2));morph(a,'Blink_L',b);morph(a,'Blink_R',b*.98);morph(a,'V02_Eyes_Attentive',1-b);a.faceBrow=(a.faceBrow??.025)+((a.state==='asking'?.13:.025)-(a.faceBrow??.025))*(1-Math.exp(-dt*8));morph(a,'Brow_Raise',a.faceBrow);morph(a,'Brow_Frown',0);morph(a,'Smile_Soft',.015);

 for(const n of ['Jaw_Open','Viseme_A','Viseme_E','Viseme_O','Viseme_MBP','Lips_Wide','Lips_Round'])morph(a,n,0);morph(a,'Lips_Rest_Closed',1);const audio=$('voice');const oral=a.id===speakerId&&['speaking','asking','reply','calming'].includes(a.state)&&!(a.id==='client_prevenu'&&a.rising&&a.elapsed<1.45);const demo=$('mouthDemo').checked&&!audio.getAttribute('src');const wanted=demo&&oral?1:0;a.mouthBlend=Math.max(0,Math.min(1,(a.mouthBlend||0)+(wanted?1:-1)*dt/.12));if(oral)a.mouthClock=(a.mouthClock||0)+dt;if(a.mouthBlend>0&&oral){const syllables=['A','E','MBP','O','E'],phase=((a.mouthClock||0)+(a.mouthOffset??=(a.seed%5)*.07))%1.75,index=Math.floor(phase/.23);if(index<syllables.length){const pulse=Math.sin(Math.PI*((phase/.23)%1))**2*a.mouthBlend;morph(a,'Viseme_'+syllables[index],pulse*.62);morph(a,'Jaw_Open',pulse*(syllables[index]==='MBP'?.025:.22));morph(a,'Lips_Rest_Closed',1-pulse*.7);}}if(oral&&!audio.paused&&!audio.ended&&a.cues?.length){const t=audio.currentTime*1000;for(const c of a.cues){const u=t-c.time_ms;if(u>=0&&u<=c.duration_ms){const w=Math.min(1,u/40,(c.duration_ms-u)/60)*(c.intensity??1);morph(a,'Viseme_'+c.viseme,Math.max(0,w));}}}}

function microphone(a){
 const d=a.map.stage.desk,top=d.center_blender[2]+d.size_blender[2]/2,scale=a.map.height_m/1.78;
 const g=new THREE.Group();g.name=a.id+'__Microphone_table';
 // Base near the far edge, slightly off-centre: clear of the paper and hands.
 const base=new V(.32*scale,top+.012*scale,-d.center_blender[1]+d.size_blender[1]*.31),mat=new THREE.MeshStandardMaterial({color:0x292c31,roughness:.72,metalness:.2}),foam=new THREE.MeshStandardMaterial({color:0x15181b,roughness:1});
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.053*scale,.061*scale,.024*scale,20),mat);foot.position.copy(base);g.add(foot);
 const low=base.clone().add(new V(0,.025*scale,0)),bend=base.clone().add(new V(0,.18*scale,0)),tip=base.clone().add(new V(-.08*scale,.29*scale,-.30*scale));
 const curve=new THREE.CatmullRomCurve3([low,bend,tip]);const stem=new THREE.Mesh(new THREE.TubeGeometry(curve,16,.006*scale,8,false),mat);g.add(stem);
 const capsule=new THREE.Mesh(new THREE.CapsuleGeometry(.014*scale,.055*scale,4,10),foam);const direction=new V(0,top+.36*scale,.10*scale).sub(tip).normalize();capsule.position.copy(tip).addScaledVector(direction,.025*scale);capsule.quaternion.setFromUnitVectors(new V(0,1,0),direction);g.add(capsule);
 const led=new THREE.Mesh(new THREE.SphereGeometry(.0035*scale,8,6),new THREE.MeshStandardMaterial({color:0x326847,roughness:.5}));led.position.copy(base).add(new V(0,.014*scale,-.034*scale));g.add(led);
 a.root.add(g);a.microphone={group:g,base,tip,baseRadius:.061*scale,tableTop:top};
}
// Small local gavel, with a single hand-bound closing gesture.
function addGavel(a){
 if(a.id!=='president')return;
 const top=a.map.stage.desk.center_blender[2]+a.map.stage.desk.size_blender[2]/2,wood=new THREE.MeshStandardMaterial({color:0x59331e,roughness:.72}),endwood=new THREE.MeshStandardMaterial({color:0x784c2c,roughness:.8});
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(.062,.068,.018,32),endwood);pad.name='president__Socle_marteau';pad.position.set(-.38,top+.009,.55);a.root.add(pad);
 const prop=new THREE.Group();prop.name='president__Marteau';const handle=new THREE.Mesh(new THREE.CylinderGeometry(.008,.011,.190,16),wood);handle.name='president__Marteau_manche';handle.position.y=.020;prop.add(handle);
 const head=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.108,24),endwood);head.name='president__Marteau_tete';head.rotation.z=Math.PI/2;head.position.y=.115;prop.add(head);
 for(const x of [-.041,.041]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(.023,.023,.008,24),wood);ring.rotation.z=Math.PI/2;ring.position.set(x,.115,0);prop.add(ring);}a.root.add(prop);
 const wrist=bone(a,'wrist.R'),q=wrist.getWorldQuaternion(new Q()),f=world(bone(a,'finger3-1.R')).sub(world(wrist)).normalize(),width=world(bone(a,'finger2-1.R')).sub(world(bone(a,'finger5-1.R')));width.addScaledVector(f,-width.dot(f)).normalize();const n=width.clone().cross(f).normalize(),grip=world(wrist).lerp(world(bone(a,'finger3-1.R')),.66).addScaledVector(n,.014),offset=grip.sub(world(wrist)).applyQuaternion(q.clone().invert()),relative=q.clone().invert().multiply(new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f,width,f.clone().cross(width))));
 const normal=a.root.getWorldQuaternion(new Q()).multiply(a.supportPose.R.wristRoot.clone()),strike=new Q().setFromAxisAngle(new V(1,0,0),.18).multiply(new Q().setFromAxisAngle(new V(0,1,0),-Math.PI/2)).multiply(normal),park=new V(-.38,top+.018+.022,.435),parkQ=a.root.getWorldQuaternion(new Q()).invert().multiply(strike.clone().multiply(relative));
 const axis=new V(1,0,0).applyQuaternion(parkQ),handleAxis=new V(0,1,0).applyQuaternion(parkQ),radial=Math.sqrt(1-axis.y*axis.y),depth=Math.max(.054*Math.abs(axis.y)+.022*radial,.045*Math.abs(axis.y)+.023*radial);park.y=top+.018+depth-.115*handleAxis.y;
 a.gavel={prop,pad,top,padTop:top+.018,offset,relative,normal,strike,park,parkQ};prop.position.copy(park);prop.quaternion.copy(parkQ);
}
const gavelEase=x=>{const t=THREE.MathUtils.clamp(x,0,1);return t*t*(3-2*t);};
function gavelGrip(a,amount){
 for(const [name,q]of a.supportPose.R.fingers)bone(a,name).quaternion.copy(q);a.root.updateWorldMatrix(true,true);
 const wrist=bone(a,'wrist.R'),f=world(bone(a,'finger3-1.R')).sub(world(wrist)).normalize(),width=world(bone(a,'finger2-1.R')).sub(world(bone(a,'finger5-1.R'))).normalize();
 for(let finger=2;finger<=5;finger++)for(let segment=1;segment<=3;segment++){const joint=bone(a,'finger'+finger+'-'+segment+'.R'),angle=[0,.80,1.05,.80][segment]*amount,q=new Q().setFromAxisAngle(width,angle).multiply(joint.getWorldQuaternion(new Q()));joint.quaternion.copy(joint.parent.getWorldQuaternion(new Q()).invert().multiply(q));joint.updateWorldMatrix(false,true);}
 for(let segment=1;segment<=3;segment++){const joint=bone(a,'finger1-'+segment+'.R'),q=new Q().setFromAxisAngle(f,[0,.20,.40,.35][segment]*amount).multiply(joint.getWorldQuaternion(new Q()));joint.quaternion.copy(joint.parent.getWorldQuaternion(new Q()).invert().multiply(q));joint.updateWorldMatrix(false,true);}
}
function closeAudience(){if(courtVisit){courtVisit.closeRequested=true;courtQueue=[];schedule=null;if(courtVisit.phase==='speaking')beginCourtReturn();return true;}
 const a=actors.president;if(!a?.gavel||a.gavelAction)return false;stopCollective();releaseFloor();change(a,'idle',0);a.gavelAction={elapsed:0,hit:false};a.state='closing';a.current='president__clore_audience';speakerId='president';$('closeAudience').disabled=true;$('playbackStatus').textContent='Clôture : le président prend le marteau';return true;
}
window.Skillforce.closeAudience=closeAudience;
function updateGavel(a,dt){
 if(a.id!=='president'||!a.gavel)return;const g=a.gavel,action=a.gavelAction;
 if(!action){g.prop.position.copy(g.park);g.prop.quaternion.copy(g.parkQ);return;}
 action.elapsed+=dt;let t=action.elapsed,impact=false;if(!action.hit&&t>=2.08){t=2.08;action.hit=true;impact=true;}
 const rootQ=a.root.getWorldQuaternion(new Q()),parkWorld=a.root.localToWorld(g.park.clone()),base=localTarget(a,a.map.anchors_blender.R),normal=g.normal.clone(),strike=g.strike.clone();let palm=parkWorld.clone(),wristQ=strike.clone(),closure=1,held=t>=.70&&t<2.70;
 if(t<.70){const u=gavelEase(t/.70);wristQ.copy(normal).slerp(strike,u);closure=gavelEase((t-.25)/.45);const parkWrist=parkWorld.clone().sub(g.offset.clone().applyQuaternion(strike));const goal=base.clone().lerp(parkWrist,u);palm=goal.add(g.offset.clone().applyQuaternion(wristQ));palm.y+=.022*Math.sin(Math.PI*u);}
 else if(t<1.55){const u=gavelEase((t-.70)/.85);palm.y+=.12*u;wristQ.premultiply(new Q().setFromAxisAngle(new V(1,0,0).applyQuaternion(rootQ),-.65*u));}
 else if(t<1.80){palm.y+=.12;wristQ.premultiply(new Q().setFromAxisAngle(new V(1,0,0).applyQuaternion(rootQ),-.65));}
 else if(t<2.08){const u=THREE.MathUtils.clamp((t-1.80)/.28,0,1),lift=1-u*u;palm.y+=.12*lift;wristQ.premultiply(new Q().setFromAxisAngle(new V(1,0,0).applyQuaternion(rootQ),-.65*lift));}
 else if(t<2.45){const u=(t-2.08)/.37,lift=.025*Math.sin(Math.PI*u);palm.y+=lift;wristQ.premultiply(new Q().setFromAxisAngle(new V(1,0,0).applyQuaternion(rootQ),-.10*Math.sin(Math.PI*u)));}
 else if(t<3.10){closure=1-gavelEase((t-2.70)/.40);if(t>=2.70)palm.y+=.022*Math.sin(Math.PI*(t-2.70)/.40);}
 else {const u=gavelEase((t-3.10)/1.10);closure=0;wristQ.copy(strike).slerp(normal,u);const parked=parkWorld.clone().sub(g.offset.clone().applyQuaternion(strike)),goal=parked.lerp(base,u);palm=goal.add(g.offset.clone().applyQuaternion(wristQ));held=false;}
 for(const [name,q]of a.supportPose.R.arms)bone(a,name).quaternion.copy(q);a.root.updateWorldMatrix(true,true);const goal=palm.clone().sub(g.offset.clone().applyQuaternion(wristQ));supportArm(a,'R',goal,wristQ);gavelGrip(a,closure);a.root.updateWorldMatrix(true,true);
 const wrist=bone(a,'wrist.R'),actualGrip=world(wrist).add(g.offset.clone().applyQuaternion(wrist.getWorldQuaternion(new Q())));
 if(held){g.prop.position.copy(a.root.worldToLocal(actualGrip.clone()));g.prop.quaternion.copy(rootQ.clone().invert().multiply(wrist.getWorldQuaternion(new Q())).multiply(g.relative));}else{g.prop.position.copy(g.park);g.prop.quaternion.copy(g.parkQ);}g.prop.updateWorldMatrix(true,true);
 const head=new V(0,.115,0).applyMatrix4(g.prop.matrixWorld),padTop=a.root.localToWorld(new V(g.pad.position.x,g.padTop,g.pad.position.z)).y,axis=new V(1,0,0).applyQuaternion(g.prop.getWorldQuaternion(new Q())),radial=Math.sqrt(Math.max(0,1-axis.y*axis.y)),depth=Math.max(.054*Math.abs(axis.y)+.022*radial,.045*Math.abs(axis.y)+.023*radial),gap=head.y-depth-padTop;action.gripError=held?g.prop.getWorldPosition(new V()).distanceTo(actualGrip):0;action.headGap=gap;
 if(impact){results.gavel??={impacts:[]};results.gavel.impacts.push({gap_m:gap,head:head.toArray(),pad:g.pad.getWorldPosition(new V()).toArray(),grip_error_m:action.gripError});$('playbackStatus').textContent='Le président clôt l’audience';}
 if(action.elapsed>=4.20){action.finishing=true;change(a,'idle',0);delete a.gavelAction;$('closeAudience').disabled=false;$('playbackStatus').textContent='Audience close — marteau reposé';}
}

function clientFeet(a){
 if(!BAR_ROLES.includes(a.id)||a.courtMoving||!a.map.foot_anchors_blender)return;
 if(!a.footOrientation)a.footOrientation=Object.fromEntries(['L','R'].map(side=>[side,a.root.getWorldQuaternion(new Q()).invert().multiply(bone(a,'foot.'+side).getWorldQuaternion(new Q()))]));
 for(const side of ['L','R']){
  const upper=bone(a,'upperleg01.'+side),lower=bone(a,'lowerleg01.'+side),foot=bone(a,'foot.'+side),origin=world(upper),end=localTarget(a,a.map.foot_anchors_blender[side]);
  const l1=origin.distanceTo(world(lower)),l2=world(lower).distanceTo(world(foot)),dir=end.clone().sub(origin),d=Math.max(.00001,Math.min(dir.length(),l1+l2-.00001));dir.normalize();
  const pole=localTarget(a,[side==='L'?.115:-.115,-.65,.48]).sub(origin);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),knee=origin.clone().addScaledVector(dir,along).addScaledVector(pole,height);
  function aim(joint,tip,target){const o=world(joint),from=world(tip).sub(o).normalize(),to=target.clone().sub(o).normalize(),q=new Q().setFromUnitVectors(from,to).multiply(joint.getWorldQuaternion(new Q()));joint.quaternion.copy(joint.parent.getWorldQuaternion(new Q()).invert().multiply(q));a.root.updateWorldMatrix(true,true);}
  aim(upper,lower,knee);aim(lower,foot,end);foot.quaternion.copy(foot.parent.getWorldQuaternion(new Q()).invert().multiply(a.root.getWorldQuaternion(new Q()).multiply(a.footOrientation[side])));a.root.updateWorldMatrix(true,true);
 }
}
function clientTable(a){
 const g=new THREE.Group();g.name='client_prevenu__Table_eau_micro';const wood=new THREE.MeshStandardMaterial({color:0x64503d,roughness:.85}),metal=new THREE.MeshStandardMaterial({color:0x242a2e,roughness:.7});
 function box(name,size,pos,mat=wood){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.name='client_prevenu__'+name;m.position.set(...pos);g.add(m);return m;}
 box('Table_plateau',[.98,.045,.56],[0,.7975,.91]);for(const x of [-.41,.41])for(const z of [.70,1.12])box('Table_pied',[.045,.775,.045],[x,.3875,z],metal);
 const bottle=new THREE.Group();bottle.name='client_prevenu__Bouteille_eau';bottle.position.set(-.32,.82,.98);const plastic=new THREE.MeshStandardMaterial({color:0xb8dce8,transparent:true,opacity:.45,roughness:.32,depthWrite:false});const body=new THREE.Mesh(new THREE.CylinderGeometry(.032,.034,.19,20),plastic);body.position.y=.095;bottle.add(body);const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(.014,.032,.034,20),plastic);shoulder.position.y=.207;bottle.add(shoulder);const neck=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.025,16),plastic);neck.position.y=.236;bottle.add(neck);const lid=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.015,16),new THREE.MeshStandardMaterial({color:0x246298,roughness:.7}));lid.position.y=.254;bottle.add(lid);const label=new THREE.Mesh(new THREE.CylinderGeometry(.033,.033,.042,20),new THREE.MeshStandardMaterial({color:0xe3e7e6,roughness:.85}));label.position.y=.11;bottle.add(label);g.add(bottle);
 a.root.add(g);a.clientTable=g;a.waterBottle=bottle;
}
function adjustClientMicrophone(a,dt){
 if(a.id!=='client_prevenu'||!a.clientMicRig)return;
 const shape=a.morphs.find(m=>m.morphTargetDictionary.Seated_Drape!==undefined),seated=shape?shape.morphTargetInfluences[shape.morphTargetDictionary.Seated_Drape]:1,standing=1-seated,rig=a.clientMicRig,target=new V(.13,1.26+.39*standing,.64+.20*standing);
 a.microphone.tip.copy(target);rig.cap.position.copy(target);rig.cap.quaternion.setFromUnitVectors(new V(0,1,0),new V(0,0,-1));
 if(!rig.last||rig.last.distanceTo(target)>.003){const curve=new THREE.CatmullRomCurve3([new V(.15,.844,1.04),new V(.15,1.08+.20*standing,1.00),target]);rig.stem.geometry.dispose();rig.stem.geometry=new THREE.TubeGeometry(curve,20,.006,8,false);rig.last=target.clone();}
}
function clientChair(a){const g=new THREE.Group();g.name=a.id+'__Chaise';const mat=new THREE.MeshStandardMaterial({color:0x483024,roughness:.9});function part(name,size,position){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.name=a.id+'__Chaise_'+name;m.position.set(...position);g.add(m);}part('assise',[.48,.04,.46],[0,.46,-.03]);part('dossier',[.48,.49,.035],[0,.735,-.245]);for(const x of [-.20,.20])for(const z of [-.21,.15])part('pied',[.035,.46,.035],[x,.23,z]);a.root.add(g);a.clientChair=g;}
function stage(a){if(a.map.posture==='seated_witness'){clientChair(a);return;}if(a.map.posture==='seated_client'){clientChair(a);clientTable(a);return;}if(a.map.posture!=='seated')return;for(const [name,color]of [['desk',0x554133],['paper',0xe3ddd0],['seat',0x423732]]){const b=a.map.stage[name],d=b.size_blender,c=b.center_blender;const mesh=new THREE.Mesh(new THREE.BoxGeometry(d[0],d[2],d[1]),new THREE.MeshStandardMaterial({color,roughness:.95}));mesh.name=a.id+'__stage_'+name;mesh.position.set(c[0],c[2],-c[1]);a.root.add(mesh);}microphone(a);}

async function load(id,index){let gltf;if(EMBED){const b=Uint8Array.from(atob(EMBED[id]),c=>c.charCodeAt(0));gltf=await new Promise((ok,no)=>loader.parse(b.buffer,'',ok,no));}else gltf=await loader.loadAsync(MAP[id].asset_url||'../'+id+'/'+id+'_v04.glb');

 const root=new THREE.Group();scene.add(root);root.add(gltf.scene);root.position.set(...positions[id]);root.rotation.y=ROOM.layout[id].yaw;

 const a=actors[id]={id,map:MAP[id],root,model:gltf.scene,mixer:new THREE.AnimationMixer(gltf.scene),clips:{},bones:{},morphs:[],active:[],previous:[],elapsed:1,state:'idle',token:0,seed:index*11+3,blinkClock:index*.41,nextBlink:3.3+index*.27,eyeRest:{},eyeAxes:{},eyeCurrent:{},savedBody:[],bindPose:{}};

 configureRole(a);
 gltf.scene.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=false;}if(o.isBone){a.bones[norm(o.name)]=o;a.bindPose[norm(o.name)]=o.quaternion.clone();}if(o.isMesh&&o.name.includes('Piece_main'))a.documentMesh=o;if(o.morphTargetDictionary)a.morphs.push(o);});

 for(const c of gltf.animations){c.tracks=c.tracks.filter(t=>!/(eyeL|eyeR)\.quaternion$/.test(t.name));a.clips[c.name]=c;}

 setupCourtClips(a);change(a,'idle',0);a.target.setEffectiveWeight(1);a.active=[{action:a.target,meta:a.map.clips[a.current]}];a.elapsed=1;a.previous=[{action:a.target,weight:1,meta:a.map.clips[a.current]}];a.mixer.update(.0001);a.mixer.update(.0001);root.updateWorldMatrix(true,true);

 for(const side of ['L','R']){const e=bone(a,'eye.'+side);a.eyeRest[side]=e.quaternion.clone();a.eyeCurrent[side]=e.quaternion.clone();a.eyeAxes[side]=new V(0,1,0);}

 a.headAxis=a.eyeAxes.L.clone().applyQuaternion(bone(a,'eye.L').getWorldQuaternion(new Q())).applyQuaternion(bone(a,'head').getWorldQuaternion(new Q()).invert());a.feet=['foot.L','foot.R'].map(n=>({bone:bone(a,n),position:world(bone(a,n))}));a.rootBone=bone(a,'root');a.rootPosition=world(a.rootBone);a.supportPose={};for(const side of ['L','R']){const wrist=bone(a,'wrist.'+side);a.supportPose[side]={wristRoot:a.root.getWorldQuaternion(new Q()).invert().multiply(wrist.getWorldQuaternion(new Q())),fingers:[],arms:['upperarm01.','upperarm02.','lowerarm01.','lowerarm02.'].map(n=>[n+side,bone(a,n+side).quaternion.clone()])};for(let f=1;f<=5;f++)for(let seg=1;seg<=3;seg++){const name='finger'+f+'-'+seg+'.'+side;a.supportPose[side].fingers.push([name,bone(a,name).quaternion.clone()]);}}roomStage(a);calibrateSupports(a);addGavel(a);contactShade(a);initDocuments(a);results.loaded.push({id,clips:Object.keys(a.clips),morphs:a.morphs.map(m=>Object.keys(m.morphTargetDictionary))});return a;}

function drawReport(){ $('report').textContent=JSON.stringify({...results,states:Object.fromEntries(Object.values(actors).map(a=>[a.id,{state:a.state,clip:a.current,weights:a.active.map(x=>+x.action.getEffectiveWeight().toFixed(3))}]))},null,2);}

function buttons(){const a=actors[$('who').value];$('clip').replaceChildren();for(const n of Object.keys(a.clips)){const o=document.createElement('option');o.value=n;o.textContent=n;$('clip').append(o);}$('states').replaceChildren();for(const state of Object.keys(a.map.states)){const b=document.createElement('button');b.textContent=['client_prevenu','temoin_01'].includes(a.id)?({idle:'Repos assis',standing_idle:'Debout',listening:'Écoute',speaking:'Parole'}[state]||state):state;b.disabled=!a.map.states[state].length;b.onclick=()=>{stopCollective();change(a,state);};$('states').append(b);}}

function fitAudience(){chooseView('general');}
function setView(showAudience){chooseView(showAudience?'general':'president');}
function focus(){chooseView('president');}

// This is a presentation choreography, not a simulation of procedural law.
// Quiet gaps leave time for the previous speaker's hand to settle.
const AUDIENCE_TURNS=[
 {at:0,end:3.8,id:'president',state:'speaking',react:'assesseur_01'},
 {at:4.5,end:11,id:'ministere_public',state:'speaking',react:'assesseur_02'},
 {at:11.8,end:14.4,id:'president',state:'asking',react:'client_prevenu'},
 {at:15,end:17.6,id:'client_prevenu',state:'speaking',react:'president'},
 {at:18.3,end:21,id:'etudiant_avocat',state:'speaking',react:'client_prevenu'},
 {at:21.8,end:24.3,id:'assesseur_01',state:'asking',react:'etudiant_avocat'},
 {at:25,end:28.5,id:'etudiant_avocat',state:'speaking',react:'assesseur_01'},
 {at:29.2,end:31.6,id:'assesseur_02',state:'asking',react:'avocat_adverse'},
 {at:32.3,end:38.4,id:'avocat_adverse',state:'speaking',react:'president',variant:1},
 {at:39.1,end:42,id:'president',state:'speaking',react:'greffier'},
 {at:42.8,end:46,id:'greffier',state:'speaking',react:'president'},
 {at:47,end:49,id:'president',state:'asking',react:'temoin_01'},
 {at:49.8,end:55.4,id:'temoin_01',state:'speaking',react:'president'}
];
const AUDIENCE_SEQUENCE=AUDIENCE_TURNS.flatMap(t=>[{at:t.at,turn:t},{at:t.end,release:true}]).sort((a,b)=>a.at-b.at);

function stopCollective(){schedule=null;paused=false;syncPlayback();$('playbackStatus').textContent='Pilotage manuel : '+($('who').value||'personnage sélectionné');}
function syncPlayback(){const label=paused?'Reprendre':'Mettre en pause';$('pause').textContent=label;}
function timeline(kind){if(actors.president?.gavelAction)return;paused=false;clock=0;schedule={kind,index:-1,cycle:0};for(const a of Object.values(actors))quiet(a);if(kind!=='president')setView(true);syncPlayback();}
function updateSchedule(){
 if(!schedule||courtVisit)return;
 const duration=schedule.kind==='audience'?58:schedule.kind==='president'?24:12;
 const entries=schedule.kind==='audience'?AUDIENCE_SEQUENCE:(schedule.kind==='president'?[
  {at:0,release:true},{at:4,release:true},{at:8,turn:{id:'president',state:'asking'}},{at:10.7,release:true},{at:12,read:'president'},{at:16.5,turn:{id:'president',state:'speaking'}},{at:21.5,release:true}
 ]:[{at:0,turn:{id:'ministere_public',state:'speaking',react:'president'}},{at:2.6,release:true},{at:3.2,turn:{id:'etudiant_avocat',state:'presenting',react:'assesseur_01'}},{at:5.4,release:true},{at:6,turn:{id:'president',state:'asking',react:'etudiant_avocat'}},{at:8.3,release:true},{at:9,turn:{id:'avocat_adverse',state:'speaking',react:'president'}},{at:11.3,release:true}]);
 for(let i=schedule.index+1;i<entries.length&&entries[i].at<=clock;i++){
  const e=entries[i];if(e.release)releaseFloor();if(e.read)change(actors[e.read],'reading');if(e.turn)takeFloor(e.turn.id,e.turn.state,e.turn.react,e.turn.variant||0);schedule.index=i;
 }
 // Only the clerk takes notes. No periodic whole-court gesture is scheduled.
 const clerk=actors.greffier,notes=schedule.kind==='audience'&&((clock>5.6&&clock<9.8)||(clock>17&&clock<20)||(clock>34&&clock<37));
 if(clerk&&clerk.id!==speakerId){if(notes&&clerk.state!=='writing')change(clerk,'writing',0,'greffier__writing');else if(!notes&&clerk.state==='writing')quiet(clerk);}
 const active=Object.values(actors).find(a=>a.id===speakerId&&ORAL_STATES.includes(a.state));
 $('playbackStatus').textContent=(paused?'En pause · ':'Lecture · ')+(schedule.kind==='audience'?'Audience entière':schedule.kind==='president'?'Président':'Échange court')+' · '+Math.floor(clock)+' / '+duration+' s · '+(active?'Parole : '+ROLE_LABELS[active.id]:'Temps d’écoute')+(schedule.kind==='audience'?' · tour '+(schedule.cycle+1):'');
 if(clock>=duration){if(schedule.kind==='audience'&&$('audienceLoop').checked){clock=0;schedule.index=-1;schedule.cycle++;for(const a of Object.values(actors))quiet(a);updateSchedule();}else{releaseFloor();schedule=null;$('playbackStatus').textContent='Séquence terminée — cliquer sur Animer l’audience pour continuer.';}}
}

let viewportWidth=0,viewportHeight=0,viewportRatio=0;
function resizeViewport(width,height){const ratio=Math.min(window.devicePixelRatio||1,qualityMode==='high'?1.5:1);if(width<=0||height<=0)return;if(width===viewportWidth&&height===viewportHeight&&ratio===viewportRatio)return;viewportWidth=width;viewportHeight=height;viewportRatio=ratio;if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(viewMode==='general'&&Object.keys(actors).length===ids.length)chooseView('general');}

function simulationTick(dt){if(dt>0){if(!courtVisit)clock+=dt;updateSchedule();}advanceCourt(dt);
 for(const a of Object.values(actors)){for(const [b,q]of a.savedBody)b.quaternion.copy(q);if(!paused){a.elapsed+=dt;const x=Math.max(0,Math.min(1,a.elapsed/(BAR_ROLES.includes(a.id)&&a.poseTransition?1.45:.65))),w=x*x*(3-2*x);let sum=0;for(const item of a.active){const old=a.previous.find(y=>y.action===item.action)?.weight||0,weight=item.action===a.target?old+(1-old)*w:old*(1-w);item.action.setEffectiveWeight(weight);sum+=weight;}if(Math.abs(1-sum)>1e-6&&(results.weight_events??=[]).length<20)results.weight_events.push({id:a.id,state:a.state,elapsed:a.elapsed,sum,old:a.previous.map(x=>({name:x.action.getClip().name,weight:x.weight})),active:a.active.map(x=>({name:x.action.getClip().name,weight:x.action.getEffectiveWeight()}))});results.runtime.weight_error_max=Math.max(results.runtime.weight_error_max,Math.abs(1-sum));if(x===1){for(const item of a.active)if(item.action!==a.target)item.action.stop();a.active=a.active.filter(y=>y.action===a.target);}a.mixer.update(dt);if(a.once&&!a.done&&a.target.time>=a.target.getClip().duration){a.done=true;change(a,'idle',variant);}}

 a.root.updateWorldMatrix(true,true);a.savedBody=['spine03','spine02','spine01','neck01','neck02','neck03','head'].map(n=>[bone(a,n),bone(a,n).quaternion.clone()]);for(const side of ['L','R'])for(const n of ['upperarm01.','upperarm02.','lowerarm01.','lowerarm02.','wrist.']){const b=bone(a,n+side);a.savedBody.push([b,b.quaternion.clone()]);}if(BAR_ROLES.includes(a.id))for(const side of ['L','R'])for(const n of ['upperleg01.','upperleg02.','lowerleg01.','lowerleg02.','foot.'])a.savedBody.push([bone(a,n+side),bone(a,n+side).quaternion.clone()]);if(!a.courtMoving&&a.id!=='client_prevenu')for(const f of a.feet)results.runtime.foot_drift_m=Math.max(results.runtime.foot_drift_m,world(f.bone).distanceTo(f.position));results.runtime.root_drift_m=Math.max(results.runtime.root_drift_m,a.id==='client_prevenu'||a.courtMoving?0:world(a.rootBone).distanceTo(a.rootPosition));face(a,dt);}

 for(const a of Object.values(actors)){gaze(a,dt);contacts(a,dt);clientFeet(a);adjustClientMicrophone(a,dt);updateGavel(a,dt);updateDocuments(a,dt);updateCourtPose(a,dt);}}

function frame(_stamp){const now=performance.now();requestAnimationFrame(frame);const raw=(now-last)/1000;last=now;if(manualCourtTest||paused||document.hidden)return;const dt=Math.max(0,Math.min(raw,.08));simulationTick(dt);

const width=renderer.domElement.clientWidth,height=renderer.domElement.clientHeight;resizeViewport(width,height);updateRoomCamera();orbit.update();renderer.render(scene,camera);

 if(benchmark){benchmark.times.push(raw*1000);if(now-benchmark.start>=15000){const sorted=benchmark.times.slice(3).sort((a,b)=>a-b);results.performance={elapsed_s:(now-benchmark.start)/1000,frames:sorted.length,median_frame_ms:sorted[Math.floor(sorted.length*.5)],p95_frame_ms:sorted[Math.floor(sorted.length*.95)],fps:benchmark.times.length/((now-benchmark.start)/1000),width,height,pixel_ratio:renderer.getPixelRatio(),triangles:renderer.info.render.triangles,draw_calls:renderer.info.render.calls,user_agent:navigator.userAgent,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER),all_seven_visible:group&&ids.length===7,loaded_character_count:ids.length};benchmark=null;$('status').textContent='Mesure terminée';}}

 if(selftest){const t=now-selftest.start,events=[[0,'idle'],[500,'listening'],[900,'speaking'],[1100,'asking'],[2200,'idle']];for(let i=selftest.index+1;i<events.length&&events[i][0]<=t;i++){change(actors.president,events[i][1]);selftest.index=i;}if(t>4000){results.selftest={completed:true,final_state:actors.president.state,silent_visemes_zero:actors.president.morphs.every(m=>Object.entries(m.morphTargetDictionary).filter(([n])=>n.startsWith('Viseme_')||n==='Jaw_Open').every(([,i])=>m.morphTargetInfluences[i]===0)),independent_mixers:new Set(Object.values(actors).map(a=>a.mixer)).size===ids.length};selftest=null;$('status').textContent='Transitions testées';}}

 if(Math.floor(now/700)!==Math.floor((now-raw*1000)/700))drawReport();}

(async()=>{await loadRoom();window.lexoraSceneProgress?.(1,10);for(let i=0;i<ids.length;i++){$('status').textContent='Chargement '+ids[i];await load(ids[i],i);window.lexoraSceneProgress?.(i+2,10);}for(const id of ids){const o=document.createElement('option');o.value=id;o.textContent=id;$('who').append(o);}$('barSequence').onclick=startBarDemo;$('who').value='president';$('who').onchange=buttons;$('playClip').onclick=()=>{stopCollective();window.Skillforce.playClip($('who').value,$('clip').value);};buttons();setQuality('low');$('quality').onchange=e=>setQuality(e.target.value);$('cameraView').onchange=e=>{$('followSpeaker').checked=false;chooseView(e.target.value);};setView(true);$('status').textContent=ids.length+' personnages charges';$('variant').onclick=()=>{stopCollective();variant=1-variant;change(actors[$('who').value],actors[$('who').value].state,variant);};$('pause').onclick=()=>{paused=!paused;if(paused)$('voice').pause();syncPlayback();if(schedule)updateSchedule();};$('focus').onclick=focus;$('audience').onclick=()=>setView(true);$('closeAudience').onclick=closeAudience;$('animateAudience').onclick=()=>timeline('audience');$('director').onclick=()=>timeline('president');$('exchange').onclick=()=>timeline('exchange');$('test').onclick=()=>{stopCollective();paused=false;syncPlayback();selftest={start:performance.now(),index:-1};};$('bench').onclick=()=>{setView(true);paused=false;timeline('exchange');benchmark={start:performance.now(),times:[]};$('status').textContent='Mesure réelle pendant 15 secondes…';};$('save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(results,null,2)],{type:'application/json'}));a.download='validation_navigateur_v04.json';a.click();};$('audioFile').onchange=e=>{const f=e.target.files[0];if(f){$('voice').dataset.actor=$('who').value;$('voice').src=URL.createObjectURL(f);results.audio_available=true;}};$('cuesFile').onchange=async e=>{try{setVisemes($('who').value,JSON.parse(await e.target.files[0].text()));}catch(e){results.errors.push(String(e));}};if(!LEXORA_EMBED)timeline('audience');else{schedule=null;releaseFloor();window.lexoraBootReady=true;window.lexoraSceneReady?.();}last=performance.now();requestAnimationFrame(frame);if(location.hash.includes('autotest')){$('test').click();setTimeout(()=>$('bench').click(),5000);}})().catch(e=>{window.lexoraBootFailed=true;if(LEXORA_EMBED)parent.postMessage({channel:'lexora-courtroom',version:1,type:'unavailable'},location.origin);$('status').textContent='ÉCHEC : '+e;results.errors.push(e.stack||String(e));drawReport();});

window.addEventListener('error',e=>{results.errors.push(String(e.message));drawReport();});
