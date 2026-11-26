import { BLOCKS, ISLANDS } from './config.js';
import { hotkeyForIndex } from './hotbar.js';
import { readWorldSaveFile } from './world-save.js';

const $ = selector => document.querySelector(selector);

export class GameUI {
  constructor(hooks={}){
    this.hooks=hooks;
    this.toastTimer=0;
    this.activeTransport='boat';
    this.selectedBlock=BLOCKS[0].id;
    this.modalIds=['welcome','travel-modal','settings-modal','help-modal'];
    this.hotbar=$('#hotbar');
    this.islandList=$('#island-list');
    this.renderHotbar();
    this.renderIslandRoutes();
    this.bindEvents();
    this.loadSettings();
  }

  bindEvents(){
    $('#start-button').addEventListener('click',()=>{
      this.closeModal('welcome');
      this.hooks.start?.();
    });
    $('#map-button').addEventListener('click',()=>this.openTravel());
    $('#undo-button').addEventListener('click',()=>this.hooks.undo?.());
    $('#redo-button').addEventListener('click',()=>this.hooks.redo?.());
    $('#travel-button').addEventListener('click',()=>this.openTravel());
    $('#settings-button').addEventListener('click',()=>this.openSettings());
    $('#howto-button').addEventListener('click',()=>this.openModal('help-modal'));
    document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>this.closeModal(button.dataset.close)));
    document.querySelectorAll('.modal-backdrop').forEach(backdrop=>{
      backdrop.addEventListener('mousedown',event=>{if(event.target===backdrop&&backdrop.id!=='welcome')this.closeModal(backdrop.id);});
    });
    document.querySelectorAll('[data-transport]').forEach(button=>button.addEventListener('click',()=>this.setTransport(button.dataset.transport)));
    $('#sensitivity').addEventListener('input',event=>{
      const value=Number(event.target.value);
      this.hooks.setSensitivity?.(value);
      localStorage.setItem('island-blocks-sensitivity',String(value));
    });
    $('#quality').addEventListener('change',event=>{
      this.hooks.setQuality?.(event.target.value);
      localStorage.setItem('island-blocks-quality',event.target.value);
    });
    $('#reset-world').addEventListener('click',()=>{
      if(window.confirm('重設會清除這台裝置上已放置與挖除的方塊，並回到初始台灣世界。確定重設嗎？')){
        this.hooks.reset?.();
        this.closeModal('settings-modal');
        this.showToast('世界已回到初始樣子');
      }
    });
    $('#export-world').addEventListener('click',()=>this.downloadWorldSave());
    const importInput=$('#import-world-file');
    $('#import-world').addEventListener('click',()=>importInput.click());
    importInput.addEventListener('change',async()=>{
      const file=importInput.files?.[0];
      if(!file)return;
      try{
        const save=await readWorldSaveFile(file);
        if(!window.confirm(`即將以備份中的 ${save.blocks.length.toLocaleString('zh-TW')} 個方塊完整取代目前世界。建議先匯出備份。確定匯入嗎？`))return;
        this.hooks.importWorld?.(save);
        this.closeModal('settings-modal');
        this.showToast('世界存檔已匯入');
      }catch(error){
        console.warn('Could not import voxel world:',error);
        this.showToast(error instanceof SyntaxError?'存檔不是有效的 JSON':error.message||'匯入存檔失敗');
      }finally{
        importInput.value='';
      }
    });
    document.querySelectorAll('.touch-controls [data-key]').forEach(button=>{
      const press=event=>{event.preventDefault();button.setPointerCapture?.(event.pointerId);this.hooks.touchKey?.(button.dataset.key,true);};
      const release=event=>{event.preventDefault();this.hooks.touchKey?.(button.dataset.key,false);};
      button.addEventListener('pointerdown',press);button.addEventListener('pointerup',release);
      button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    });
    document.querySelectorAll('.touch-actions [data-action]').forEach(button=>{
      button.addEventListener('click',()=>this.hooks.touchAction?.(button.dataset.action));
    });
  }

  loadSettings(){
    const sensitivity=Number(localStorage.getItem('island-blocks-sensitivity'));
    const quality=localStorage.getItem('island-blocks-quality');
    if(Number.isFinite(sensitivity)&&sensitivity>0){$('#sensitivity').value=String(sensitivity);this.hooks.setSensitivity?.(sensitivity);}
    if(quality&&['high','balanced','low'].includes(quality)){$('#quality').value=quality;this.hooks.setQuality?.(quality);}
  }

  renderHotbar(){
    this.hotbar.replaceChildren();
    BLOCKS.forEach((block,index)=>{
      const hotkey=hotkeyForIndex(index);
      const button=document.createElement('button');
      button.className='hotbar-slot';button.type='button';button.dataset.block=block.id;
      button.setAttribute('aria-label',`${hotkey} ${block.name}`);button.title=`${hotkey} ${block.name}`;
      button.innerHTML=`<span class="slot-number">${hotkey}</span><i class="slot-swatch" style="background:${block.swatch}"></i><span class="slot-name">${block.name}</span>`;
      button.addEventListener('click',()=>this.selectBlock(block.id));
      this.hotbar.append(button);
    });
    this.selectBlock(this.selectedBlock);
  }

  downloadWorldSave(){
    try{
      const save=this.hooks.exportWorld?.();
      if(!save)throw new Error('目前無法匯出世界');
      const json=JSON.stringify(save);
      if(new TextEncoder().encode(json).byteLength>32*1024*1024)throw new RangeError('存檔超過 32 MB 上限');
      const blob=new Blob([json],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;link.download=`island-blocks-${new Date().toISOString().slice(0,10)}.json`;
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      this.showToast('世界存檔已匯出');
    }catch(error){
      console.warn('Could not export voxel world:',error);
      this.showToast(error.message||'匯出存檔失敗');
    }
  }

  selectBlock(blockId){
    this.selectedBlock=blockId;
    this.hotbar.querySelectorAll('.hotbar-slot').forEach(slot=>{
      const selected=slot.dataset.block===blockId;
      slot.classList.toggle('selected',selected);slot.setAttribute('aria-pressed',String(selected));
    });
    this.hotbar.querySelector('.hotbar-slot.selected')?.scrollIntoView({block:'nearest',inline:'nearest'});
    const block=BLOCKS.find(item=>item.id===blockId);
    if(block)this.hooks.selectBlock?.(block);
  }

  renderIslandRoutes(){
    this.islandList.replaceChildren();
    ISLANDS.forEach(island=>{
      const button=document.createElement('button');button.type='button';button.className='island-route';
      button.innerHTML=`<span class="island-emoji">${island.emoji}</span><span class="island-route-text"><b>${island.name}</b><small>${island.note}</small></span><span class="route-arrow">→</span>`;
      button.addEventListener('click',()=>{
        this.closeModal('travel-modal');
        this.hooks.travel?.(island,this.activeTransport);
      });
      this.islandList.append(button);
    });
  }

  setTransport(transport){
    this.activeTransport=transport;
    document.querySelectorAll('[data-transport]').forEach(button=>button.classList.toggle('selected',button.dataset.transport===transport));
  }

  openTravel(){this.hooks.releasePointer?.();this.openModal('travel-modal');}
  openSettings(){
    this.hooks.releasePointer?.();
    $('#sensitivity').value=String(this.hooks.getSensitivity?.()??0.0024);
    this.openModal('settings-modal');
  }

  openModal(id){
    this.modalIds.forEach(modalId=>document.getElementById(modalId).classList.toggle('hidden',modalId!==id));
  }

  closeModal(id){document.getElementById(id)?.classList.add('hidden');}
  closeTopModal(){
    const open=this.modalIds.find(id=>id!=='welcome'&&!document.getElementById(id).classList.contains('hidden'));
    if(open){this.closeModal(open);return true;}return false;
  }
  showWelcome(){this.openModal('welcome');}
  isModalOpen(){return this.modalIds.some(id=>!document.getElementById(id).classList.contains('hidden'));}

  updateWorld({count,saved,message}={}){
    if(count!==undefined)$('#block-count').textContent=Number(count).toLocaleString('zh-TW');
    if(saved!==undefined)$('#save-state').textContent=saved?'已儲存':'儲存中…';
    if(message)this.showToast(message);
  }

  updatePlayer(position,island){
    $('#coordinates').textContent=`座標 ${Math.floor(position.x)}, ${Math.floor(position.z)}`;
    if(island)$('#location-name').textContent=island.shortName;
  }

  setTarget(block){
    const label=$('#target-label');
    if(!block){label.hidden=true;return;}
    const type=BLOCKS.find(item=>item.id===block.type);
    label.textContent=type?.name||'方塊';label.hidden=false;
  }

  showToast(message){
    const toast=$('#toast');toast.textContent=message;toast.classList.add('visible');
    clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>toast.classList.remove('visible'),2100);
  }

  hideLoading(){
    const loading=$('#loading');loading.classList.add('done');
    setTimeout(()=>loading.remove(),600);
  }
}
