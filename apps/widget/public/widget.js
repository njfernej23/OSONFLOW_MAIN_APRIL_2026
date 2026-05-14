(function(){var e={WIDGET_URL:`http://localhost:3001`,DEFAULT_ORG_ID:`org_3CRWr58AdbEEnRYzfABrn1RdE7y`,DEFAULT_POSITION:`bottom-right`},t=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,n=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
  <path d="M5 3v4"></path>
  <path d="M3 5h4"></path>
</svg>`,r=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3"></path>
  <path d="M12 17h.01"></path>
</svg>`,i=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;(function(){let a=null,o=null,s=null,c=!1,l=null,u=!1,d={launcherColor:`#3b82f6`,launcherLabel:`Chat with us`,launcherIcon:`chat`,launcherIconUrl:``,animation:`slide-up`},f={"slide-up":{closedTransform:`translate3d(0, 18px, 0) scale(0.98)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:260,easing:`cubic-bezier(0.16, 1, 0.3, 1)`},scale:{closedTransform:`translate3d(0, 8px, 0) scale(0.92)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:240,easing:`cubic-bezier(0.2, 0.8, 0.2, 1)`},fade:{closedTransform:`translate3d(0, 0, 0) scale(1)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:200,easing:`ease`},pop:{closedTransform:`translate3d(0, 20px, 0) scale(0.86)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:320,easing:`cubic-bezier(0.18, 1.35, 0.32, 1)`}},p=null,m=e.DEFAULT_POSITION,h=e=>{switch(e){case`sparkles`:return n;case`question`:return r;default:return t}},g=e=>e===`sparkles`||e===`question`||e===`chat`?e:`chat`,_=e=>e===`slide-up`||e===`scale`||e===`fade`||e===`pop`?e:`slide-up`,v=e=>{if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e))return null;if(e.length===4){let[t,n,r,i]=e;return`${t}${n}${n}${r}${r}${i}${i}`}return e},y=e=>{let t=v(e);if(!t)return`#ffffff`;let n=parseInt(t.slice(1,3),16),r=parseInt(t.slice(3,5),16),i=parseInt(t.slice(5,7),16);return(.299*n+.587*r+.114*i)/255>.6?`#111111`:`#ffffff`},b=e=>{let t=v(e);return t?`rgba(${parseInt(t.slice(1,3),16)}, ${parseInt(t.slice(3,5),16)}, ${parseInt(t.slice(5,7),16)}, 0.35)`:`rgba(59, 130, 246, 0.35)`},x=e=>e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`),S=e=>`<img src="${x(e)}" alt="Launcher" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; display: block;" />`,C=()=>{if(!s)return;let e=d.launcherLabel.trim(),t=!c&&d.launcherIconUrl.trim().length>0,n=!c&&!t&&e.length>0,r=c?i:t?S(d.launcherIconUrl):h(d.launcherIcon);s.style.width=n?`auto`:`60px`,s.style.padding=n?`0 16px`:`0`,s.style.borderRadius=n?`9999px`:`50%`,s.style.justifyContent=n?`flex-start`:`center`,s.style.background=d.launcherColor,s.style.color=y(d.launcherColor),s.style.boxShadow=`0 4px 24px ${b(d.launcherColor)}`,s.setAttribute(`aria-label`,c?`Close chat widget`:n?e:`Open chat widget`),n?s.innerHTML=`${r}<span style="white-space: nowrap; line-height: 1;">${x(e)}</span>`:s.innerHTML=r},w=e=>{typeof e.launcherColor==`string`&&e.launcherColor.trim()&&(d.launcherColor=e.launcherColor),typeof e.launcherLabel==`string`&&(d.launcherLabel=e.launcherLabel),typeof e.launcherIcon==`string`&&(d.launcherIcon=g(e.launcherIcon)),typeof e.launcherIconUrl==`string`&&(d.launcherIconUrl=e.launcherIconUrl.trim()),typeof e.animation==`string`&&(d.animation=_(e.animation),M(c?`open`:`closed`)),C(),T()},T=()=>{!s||u||(u=!0,s.style.visibility=`visible`,s.style.opacity=`1`,s.style.pointerEvents=`auto`)},E=document.currentScript;if(E)p=E.getAttribute(`data-organization-id`),m=E.getAttribute(`data-position`)||e.DEFAULT_POSITION,d.animation=_(E.getAttribute(`data-animation`));else{let t=document.querySelectorAll(`script[src*="embed"]`),n=Array.from(t).find(e=>e.hasAttribute(`data-organization-id`));n&&(p=n.getAttribute(`data-organization-id`),m=n.getAttribute(`data-position`)||e.DEFAULT_POSITION,d.animation=_(n.getAttribute(`data-animation`)))}if(!p){console.error(`Echo Widget: data-organization-id attribute is required`);return}function D(){document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,O):O()}function O(){s=document.createElement(`button`),s.id=`echo-widget-button`,s.style.cssText=`
      position: fixed;
      ${m===`bottom-right`?`right: 20px;`:`left: 20px;`}
      bottom: 20px;
      width: auto;
      min-width: 60px;
      height: 60px;
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
    `,C(),s.addEventListener(`click`,j),s.addEventListener(`mouseenter`,()=>{s&&(s.style.transform=`scale(1.05)`)}),s.addEventListener(`mouseleave`,()=>{s&&(s.style.transform=`scale(1)`)}),document.body.appendChild(s),o=document.createElement(`div`),o.id=`echo-widget-container`,o.style.cssText=`
      position: fixed;
      ${m===`bottom-right`?`right: 20px;`:`left: 20px;`}
      bottom: 90px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 110px);
      z-index: 999998;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      transform: ${f[d.animation].closedTransform};
      transform-origin: ${m===`bottom-right`?`bottom right`:`bottom left`};
      transition:
        opacity ${f[d.animation].duration}ms ${f[d.animation].easing},
        transform ${f[d.animation].duration}ms ${f[d.animation].easing};
      will-change: opacity, transform;
    `,a=document.createElement(`iframe`),a.src=k(),a.style.cssText=`
      width: 100%;
      height: 100%;
      border: none;
    `,a.allow=`microphone; clipboard-read; clipboard-write`,o.appendChild(a),document.body.appendChild(o),window.addEventListener(`message`,A)}function k(){let t=new URLSearchParams;return t.append(`organizationId`,p),`${e.WIDGET_URL}?${t.toString()}`}function A(t){if(t.origin!==new URL(e.WIDGET_URL).origin)return;let{type:n,payload:r}=t.data;switch(n){case`close`:P();break;case`resize`:r.height&&o&&(o.style.height=`${r.height}px`);break;case`widget-settings`:r?.appearance&&w(r.appearance);break}}function j(){c?P():N()}function M(e){if(!o)return;let t=f[d.animation];o.style.transition=`opacity ${t.duration}ms ${t.easing}, transform ${t.duration}ms ${t.easing}`,o.style.opacity=e===`open`?`1`:`0`,o.style.transform=e===`open`?t.openTransform:t.closedTransform}function N(){o&&s&&(l!==null&&(window.clearTimeout(l),l=null),c=!0,o.style.display=`block`,M(`closed`),window.requestAnimationFrame(()=>{window.requestAnimationFrame(()=>M(`open`))}),C())}function P(){o&&s&&(l!==null&&(window.clearTimeout(l),l=null),c=!1,M(`closed`),l=window.setTimeout(()=>{o&&!c&&(o.style.display=`none`),l=null},f[d.animation].duration),C())}function F(){window.removeEventListener(`message`,A),o&&(o.remove(),o=null,a=null),s&&=(s.remove(),null),l!==null&&(window.clearTimeout(l),l=null),c=!1,u=!1}function I(e){F(),e.organizationId&&(p=e.organizationId),e.position&&(m=e.position),e.animation&&(d.animation=_(e.animation)),D()}window.EchoWidget={init:I,show:N,hide:P,destroy:F,setAppearance:w},D()})()})();