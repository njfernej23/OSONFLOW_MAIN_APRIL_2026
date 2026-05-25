(function(){var e={WIDGET_URL:`https://osonflow-main-april-2026-widget-git-co-5175a1-dfsbdfgs-projects.vercel.app`,DEFAULT_ORG_ID:`org_3CRWr58AdbEEnRYzfABrn1RdE7y`,DEFAULT_POSITION:`bottom-right`},t=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,n=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
  <path d="M5 3v4"></path>
  <path d="M3 5h4"></path>
</svg>`,r=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3"></path>
  <path d="M12 17h.01"></path>
</svg>`,i=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`,a=20,o=52,s=10,c=14,l=a*2+o+s;(function(){let u=null,d=null,f=null,p=!1,m=null,h=!1,g={launcherColor:`#3b82f6`,launcherLabel:`Chat with us`,launcherIcon:`chat`,launcherIconUrl:``,animation:`slide-up`},_={"slide-up":{closedTransform:`translate3d(0, 18px, 0) scale(0.98)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:260,easing:`cubic-bezier(0.16, 1, 0.3, 1)`},scale:{closedTransform:`translate3d(0, 8px, 0) scale(0.92)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:240,easing:`cubic-bezier(0.2, 0.8, 0.2, 1)`},fade:{closedTransform:`translate3d(0, 0, 0) scale(1)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:200,easing:`ease`},pop:{closedTransform:`translate3d(0, 20px, 0) scale(0.86)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:320,easing:`cubic-bezier(0.18, 1.35, 0.32, 1)`}},v=null,y=e.DEFAULT_POSITION,b=e=>{switch(e){case`sparkles`:return n;case`question`:return r;default:return t}},x=e=>e===`sparkles`||e===`question`||e===`chat`?e:`chat`,S=e=>e===`slide-up`||e===`scale`||e===`fade`||e===`pop`?e:`slide-up`,C=e=>{if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e))return null;if(e.length===4){let[t,n,r,i]=e;return`${t}${n}${n}${r}${r}${i}${i}`}return e},w=e=>{let t=C(e);if(!t)return`#ffffff`;let n=parseInt(t.slice(1,3),16),r=parseInt(t.slice(3,5),16),i=parseInt(t.slice(5,7),16);return(.299*n+.587*r+.114*i)/255>.6?`#111111`:`#ffffff`},T=e=>{let t=C(e);return t?`rgba(${parseInt(t.slice(1,3),16)}, ${parseInt(t.slice(3,5),16)}, ${parseInt(t.slice(5,7),16)}, 0.35)`:`rgba(59, 130, 246, 0.35)`},E=e=>e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`),D=e=>`<img src="${E(e)}" alt="Launcher" style="width: ${o}px; height: ${o}px; border-radius: 50%; object-fit: cover; display: block;" />`,O=()=>{if(!f)return;let e=g.launcherLabel.trim(),t=!p&&g.launcherIconUrl.trim().length>0,n=!p&&!t&&e.length>0,r=p?i:t?D(g.launcherIconUrl):b(g.launcherIcon);f.style.width=n?`auto`:`${o}px`,f.style.padding=n?`0 ${c}px`:`0`,f.style.borderRadius=n?`9999px`:`50%`,f.style.justifyContent=n?`flex-start`:`center`,f.style.background=g.launcherColor,f.style.color=w(g.launcherColor),f.style.boxShadow=`0 4px 24px ${T(g.launcherColor)}`,f.setAttribute(`aria-label`,p?`Close chat widget`:n?e:`Open chat widget`),n?f.innerHTML=`${r}<span style="white-space: nowrap; line-height: 1;">${E(e)}</span>`:f.innerHTML=r},k=e=>{typeof e.launcherColor==`string`&&e.launcherColor.trim()&&(g.launcherColor=e.launcherColor),typeof e.launcherLabel==`string`&&(g.launcherLabel=e.launcherLabel),typeof e.launcherIcon==`string`&&(g.launcherIcon=x(e.launcherIcon)),typeof e.launcherIconUrl==`string`&&(g.launcherIconUrl=e.launcherIconUrl.trim()),typeof e.animation==`string`&&(g.animation=S(e.animation),L(p?`open`:`closed`)),O(),A()},A=()=>{!f||h||(h=!0,f.style.visibility=`visible`,f.style.opacity=`1`,f.style.pointerEvents=`auto`)},j=document.currentScript;if(j)v=j.getAttribute(`data-organization-id`),y=j.getAttribute(`data-position`)||e.DEFAULT_POSITION,g.animation=S(j.getAttribute(`data-animation`));else{let t=document.querySelectorAll(`script[src*="embed"]`),n=Array.from(t).find(e=>e.hasAttribute(`data-organization-id`));n&&(v=n.getAttribute(`data-organization-id`),y=n.getAttribute(`data-position`)||e.DEFAULT_POSITION,g.animation=S(n.getAttribute(`data-animation`)))}if(!v){console.error(`Echo Widget: data-organization-id attribute is required`);return}function M(){document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,N):N()}function N(){f=document.createElement(`button`),f.id=`echo-widget-button`,f.style.cssText=`
      position: fixed;
      ${y===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
      bottom: ${a}px;
      width: auto;
      min-width: ${o}px;
      height: ${o}px;
      border-radius: 9999px;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
    `,O(),f.addEventListener(`click`,I),f.addEventListener(`mouseenter`,()=>{f&&(f.style.transform=`scale(1.05)`)}),f.addEventListener(`mouseleave`,()=>{f&&(f.style.transform=`scale(1)`)}),document.body.appendChild(f),d=document.createElement(`div`),d.id=`echo-widget-container`,d.style.cssText=`
      position: fixed;
      ${y===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
      bottom: ${a+o+s}px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - ${l}px);
      z-index: 999998;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      transform: ${_[g.animation].closedTransform};
      transform-origin: ${y===`bottom-right`?`bottom right`:`bottom left`};
      transition:
        opacity ${_[g.animation].duration}ms ${_[g.animation].easing},
        transform ${_[g.animation].duration}ms ${_[g.animation].easing};
      will-change: opacity, transform;
    `,u=document.createElement(`iframe`),u.src=P(),u.style.cssText=`
      width: 100%;
      height: 100%;
      border: none;
    `,u.allow=`microphone; clipboard-read; clipboard-write`,d.appendChild(u),document.body.appendChild(d),window.addEventListener(`message`,F)}function P(){let t=new URLSearchParams;return t.append(`organizationId`,v),`${e.WIDGET_URL}?${t.toString()}`}function F(t){if(t.origin!==new URL(e.WIDGET_URL).origin)return;let{type:n,payload:r}=t.data;switch(n){case`close`:z();break;case`resize`:r.height&&d&&(d.style.height=`${r.height}px`);break;case`widget-settings`:r?.appearance&&k(r.appearance);break}}function I(){p?z():R()}function L(e){if(!d)return;let t=_[g.animation];d.style.transition=`opacity ${t.duration}ms ${t.easing}, transform ${t.duration}ms ${t.easing}`,d.style.opacity=e===`open`?`1`:`0`,d.style.transform=e===`open`?t.openTransform:t.closedTransform}function R(){d&&f&&(m!==null&&(window.clearTimeout(m),m=null),p=!0,d.style.display=`block`,L(`closed`),window.requestAnimationFrame(()=>{window.requestAnimationFrame(()=>L(`open`))}),O())}function z(){d&&f&&(m!==null&&(window.clearTimeout(m),m=null),p=!1,L(`closed`),m=window.setTimeout(()=>{d&&!p&&(d.style.display=`none`),m=null},_[g.animation].duration),O())}function B(){window.removeEventListener(`message`,F),d&&(d.remove(),d=null,u=null),f&&=(f.remove(),null),m!==null&&(window.clearTimeout(m),m=null),p=!1,h=!1}function V(e){B(),e.organizationId&&(v=e.organizationId),e.position&&(y=e.position),e.animation&&(g.animation=S(e.animation)),M()}window.EchoWidget={init:V,show:R,hide:z,destroy:B,setAppearance:k},M()})()})();