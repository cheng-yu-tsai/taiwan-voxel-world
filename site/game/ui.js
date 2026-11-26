import { BLOCKS, ISLANDS } from './config.js';
import { DECORATIONS } from './world-objects.js';
import { hotkeyForIndex } from './hotbar.js';
import { readWorldSaveFile } from './world-save.js';

const $ = selector => document.querySelector(selector);

export class GameUI {
  constructor(hooks={}){
    this.hooks=hooks;
    this.toastTimer=0;
    this.activeTransport='boat';
    this.selectedBlock=BLOCKS[0].id;
    this.selectedDecoration=DECORATIONS[0];
    this.decorationMode=false;
    this.modalIds=['welcome','travel-modal','settings-modal','help-modal'];
    this.modalReturnFocus=new Map();
    this.confirmation=null;
    this.hotbar=$('#hotbar');
    this.islandList=$('#island-list');
    this.decorationSelect=$('#decoration-select');
    DECORATIONS.forEach(decoration=>{
      const option=document.createElement('option');
      option.value=decoration.id;option.textContent=decoration.name;
      this.decorationSelect.append(option);
    });
    this.renderHotbar();
    this.renderIslandRoutes();
    this.bindEvents();
    this.selectDecoration(this.selectedDecoration.id);
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
    $('#decoration-mode').addEventListener('click',()=>this.toggleDecorationMode());
    this.decorationSelect.addEventListener('change',()=>this.selectDecoration(this.decorationSelect.value,true));
    $('#travel-button').addEventListener('click',()=>this.openTravel());
    $('#settings-button').addEventListener('click',()=>this.openSettings());
    $('#howto-button').addEventListener('click',()=>this.openModal('help-modal'));
    document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>this.closeModal(button.dataset.close)));
    document.querySelectorAll('.modal-backdrop').forEach(backdrop=>{
      backdrop.addEventListener('mousedown',event=>{if(event.target===backdrop&&backdrop.id!=='welcome')this.closeModal(backdrop.id);});
      backdrop.addEventListener('keydown',event=>this.keepFocusInside(event,backdrop));
    });
    $('#confirm-cancel').addEventListener('click',()=>this.finishConfirmation(false));
    $('#confirm-accept').addEventListener('click',()=>this.finishConfirmation(true));
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
    $('#reset-world').addEventListener('click',async()=>{
      if(await this.requestConfirmation({
        title:'重設這個世界？',
        message:'重設會清除這台裝置上已放置與挖除的方塊和道具，並回到初始台灣世界。',
        confirmLabel:'重設世界',
        danger:true,
      })){
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
        $('#import-world').focus();
        if(!await this.requestConfirmation({
          title:'匯入備份並取代目前世界？',
          message:`備份包含 ${save.blocks.length.toLocaleString('zh-TW')} 個方塊和 ${(save.decorations?.length??0).toLocaleString('zh-TW')} 個裝飾道具，匯入後會完整取代目前世界。建議先匯出備份。`,
          confirmLabel:'匯入並取代',
          danger:true,
        }))return;
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

  toggleDecorationMode(){
    if(this.isModalOpen())return;
    this.setDecorationMode(!this.decorationMode);
  }

  selectDecoration(decorationId,announce=false){
    const decoration=DECORATIONS.find(item=>item.id===decorationId);
    if(!decoration)return;
    this.selectedDecoration=decoration;
    this.decorationSelect.value=decoration.id;
    $('#decoration-mode-label').textContent=this.decorationMode?decoration.name:'道具';
    $('#decoration-mode').setAttribute('aria-label',this.decorationMode?`離開${decoration.name}道具模式`:'進入裝飾道具模式');
    $('#touch-place').setAttribute('aria-label',this.decorationMode?`放置${decoration.name}到準星指向的方塊`:'在準星指向的位置放置方塊');
    $('#touch-rotate-decoration').setAttribute('aria-label',`旋轉目前的${decoration.name}道具`);
    this.hooks.selectDecoration?.(decoration);
    if(announce)this.showToast(`已選擇${decoration.name}`);
  }

  cycleDecoration(){
    if(!this.decorationMode)return;
    const index=DECORATIONS.findIndex(item=>item.id===this.selectedDecoration.id);
    const next=DECORATIONS[(index+1)%DECORATIONS.length];
    this.selectDecoration(next.id,true);
  }

  setDecorationMode(enabled){
    this.decorationMode=Boolean(enabled);
    const button=$('#decoration-mode');
    button.setAttribute('aria-pressed',String(this.decorationMode));
    button.setAttribute('aria-label',this.decorationMode?`離開${this.selectedDecoration.name}道具模式`:'進入裝飾道具模式');
    button.title=this.decorationMode?`${this.selectedDecoration.name}道具模式（V）`:'裝飾道具模式（V）';
    $('#decoration-mode-label').textContent=this.decorationMode?this.selectedDecoration.name:'道具';
    this.decorationSelect.hidden=!this.decorationMode;
    $('#touch-mine').setAttribute('aria-label',this.decorationMode?'移除準星指向的裝飾道具':'挖掘準星指向的方塊');
    $('#touch-place').setAttribute('aria-label',this.decorationMode?`放置${this.selectedDecoration.name}到準星指向的方塊`:'在準星指向的位置放置方塊');
    $('#touch-rotate-decoration').setAttribute('aria-label',`旋轉目前的${this.selectedDecoration.name}道具`);
    $('#touch-rotate-decoration').hidden=!this.decorationMode;
    this.hooks.setDecorationMode?.(this.decorationMode);
    this.showToast(this.decorationMode?`${this.selectedDecoration.name}模式：Q 選道具、R 旋轉`:'方塊模式');
  }

  rotateDecoration(){
    if(this.decorationMode)this.hooks.rotateDecoration?.();
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
    const previouslyOpen=this.modalIds.find(modalId=>modalId!==id&&!document.getElementById(modalId).classList.contains('hidden'));
    const returnFocus=previouslyOpen?this.modalReturnFocus.get(previouslyOpen):document.activeElement;
    if(previouslyOpen)this.modalReturnFocus.delete(previouslyOpen);
    this.modalReturnFocus.set(id,returnFocus);
    this.modalIds.forEach(modalId=>document.getElementById(modalId).classList.toggle('hidden',modalId!==id));
    this.focusModal(id);
  }

  focusableElements(container){
    return [...container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(element=>element.getClientRects().length>0);
  }

  focusModal(id){
    const modal=document.getElementById(id);
    this.focusableElements(modal)[0]?.focus();
  }

  keepFocusInside(event,modal){
    if(event.key!=='Tab'||modal.classList.contains('hidden'))return;
    const focusable=this.focusableElements(modal);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(!modal.contains(document.activeElement)){
      event.preventDefault();
      (event.shiftKey?last:first).focus();
    }else if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();first.focus();
    }
  }

  requestConfirmation({title,message,confirmLabel='確定',danger=false}){
    if(this.confirmation)this.finishConfirmation(false);
    $('#confirm-title').textContent=title;
    $('#confirm-message').textContent=message;
    const accept=$('#confirm-accept');
    accept.textContent=confirmLabel;
    accept.classList.toggle('danger-confirm',danger);
    return new Promise(resolve=>{
      this.confirmation={resolve,previousFocus:document.activeElement};
      $('#confirm-modal').classList.remove('hidden');
      $('#confirm-cancel').focus();
    });
  }

  finishConfirmation(confirmed){
    if(!this.confirmation)return;
    const {resolve,previousFocus}=this.confirmation;
    this.confirmation=null;
    $('#confirm-modal').classList.add('hidden');
    resolve(confirmed);
    if(previousFocus?.isConnected)previousFocus.focus();
  }

  closeModal(id){
    if(id==='confirm-modal'){this.finishConfirmation(false);return;}
    const modal=document.getElementById(id);
    if(!modal||modal.classList.contains('hidden'))return;
    modal.classList.add('hidden');
    const returnFocus=this.modalReturnFocus.get(id);
    this.modalReturnFocus.delete(id);
    if(returnFocus?.isConnected)returnFocus.focus();
  }
  closeTopModal(){
    if(this.confirmation){this.finishConfirmation(false);return true;}
    const open=this.modalIds.find(id=>id!=='welcome'&&!document.getElementById(id).classList.contains('hidden'));
    if(open){this.closeModal(open);return true;}return false;
  }
  showWelcome(){this.openModal('welcome');}
  isModalOpen(){return Boolean(this.confirmation)||this.modalIds.some(id=>!document.getElementById(id).classList.contains('hidden'));}

  updateWorld({count,decorationCount,saved,message,canUndo,canRedo}={}){
    if(count!==undefined)$('#block-count').textContent=Number(count).toLocaleString('zh-TW');
    if(decorationCount!==undefined)$('#decoration-count').textContent=Number(decorationCount).toLocaleString('zh-TW');
    if(saved!==undefined)$('#save-state').textContent=saved?'已儲存':'儲存中…';
    if(canUndo!==undefined)$('#undo-button').disabled=!canUndo;
    if(canRedo!==undefined)$('#redo-button').disabled=!canRedo;
    if(message)this.showToast(message);
  }

  updatePlayer(position,island){
    $('#coordinates').textContent=`座標 ${Math.floor(position.x)}, ${Math.floor(position.z)}`;
    if(island){
      $('#location-name').textContent=island.shortName;
      $('#world-location').textContent=island.shortName;
    }
  }

  setTarget(block,decorationMode=false,decoration=null,rotation=0,selectedDecorationName=this.selectedDecoration.name){
    const label=$('#target-label');
    if(decorationMode){
      if(decoration){
        const hitName=DECORATIONS.find(item=>item.id===decoration.type)?.name||'裝飾道具';
        label.textContent=`${hitName}｜左鍵移除`;
      }
      else if(block&&block.normal.y>.7)label.textContent=`${selectedDecorationName}｜右鍵放置（${rotation*90}°）`;
      else if(block)label.textContent=`${selectedDecorationName}只能放在方塊上表面`;
      else label.textContent=`${selectedDecorationName}模式｜Q 選道具、R 旋轉（${rotation*90}°）`;
      label.hidden=false;return;
    }
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
