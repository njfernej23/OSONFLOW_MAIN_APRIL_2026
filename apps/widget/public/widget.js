(function(){var e={WIDGET_URL:`https://osonflow-main-april-2026.vercel.app`,DEAFULT_ORG_ID:`org_3CRWr58AdbEEnRYzfABrn1RdE7y`,DEFAULT_POSITION:`bottom-right`},t=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
</svg>`;(function(){let a=null,o=null,s=null,c=!1,l={launcherColor:`#3b82f6`,launcherLabel:`Chat with us`,launcherIcon:`chat`,launcherIconUrl:``},u=null,d=e.DEFAULT_POSITION,f=e=>{switch(e){case`sparkles`:return n;case`question`:return r;default:return t}},p=e=>e===`sparkles`||e===`question`||e===`chat`?e:`chat`,m=e=>{if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e))return null;if(e.length===4){let[t,n,r,i]=e;return`${t}${n}${n}${r}${r}${i}${i}`}return e},h=e=>{let t=m(e);if(!t)return`#ffffff`;let n=parseInt(t.slice(1,3),16),r=parseInt(t.slice(3,5),16),i=parseInt(t.slice(5,7),16);return(.299*n+.587*r+.114*i)/255>.6?`#111111`:`#ffffff`},g=e=>{let t=m(e);return t?`rgba(${parseInt(t.slice(1,3),16)}, ${parseInt(t.slice(3,5),16)}, ${parseInt(t.slice(5,7),16)}, 0.35)`:`rgba(59, 130, 246, 0.35)`},_=e=>e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`),v=e=>`<img src="${_(e)}" alt="Launcher" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; display: block;" />`,y=()=>{if(!s)return;let e=l.launcherLabel.trim(),t=!c&&l.launcherIconUrl.trim().length>0,n=!c&&!t&&e.length>0,r=c?i:t?v(l.launcherIconUrl):f(l.launcherIcon);s.style.width=n?`auto`:`60px`,s.style.padding=n?`0 16px`:`0`,s.style.borderRadius=n?`9999px`:`50%`,s.style.justifyContent=n?`flex-start`:`center`,s.style.background=l.launcherColor,s.style.color=h(l.launcherColor),s.style.boxShadow=`0 4px 24px ${g(l.launcherColor)}`,s.setAttribute(`aria-label`,c?`Close chat widget`:n?e:`Open chat widget`),n?s.innerHTML=`${r}<span style="white-space: nowrap; line-height: 1;">${_(e)}</span>`:s.innerHTML=r},b=e=>{typeof e.launcherColor==`string`&&e.launcherColor.trim()&&(l.launcherColor=e.launcherColor),typeof e.launcherLabel==`string`&&(l.launcherLabel=e.launcherLabel),typeof e.launcherIcon==`string`&&(l.launcherIcon=p(e.launcherIcon)),typeof e.launcherIconUrl==`string`&&(l.launcherIconUrl=e.launcherIconUrl.trim()),y()},x=document.currentScript;if(x)u=x.getAttribute(`data-organization-id`),d=x.getAttribute(`data-position`)||e.DEFAULT_POSITION;else{let t=document.querySelectorAll(`script[src*="embed"]`),n=Array.from(t).find(e=>e.hasAttribute(`data-organization-id`));n&&(u=n.getAttribute(`data-organization-id`),d=n.getAttribute(`data-position`)||e.DEFAULT_POSITION)}if(!u){console.error(`Echo Widget: data-organization-id attribute is required`);return}function S(){document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,C):C()}function C(){s=document.createElement(`button`),s.id=`echo-widget-button`,s.style.cssText=`
      position: fixed;
      ${d===`bottom-right`?`right: 20px;`:`left: 20px;`}
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
    `,y(),s.addEventListener(`click`,E),s.addEventListener(`mouseenter`,()=>{s&&(s.style.transform=`scale(1.05)`)}),s.addEventListener(`mouseleave`,()=>{s&&(s.style.transform=`scale(1)`)}),document.body.appendChild(s),o=document.createElement(`div`),o.id=`echo-widget-container`,o.style.cssText=`
      position: fixed;
      ${d===`bottom-right`?`right: 20px;`:`left: 20px;`}
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
      transform: translateY(10px);
      transition: all 0.3s ease;
    `,a=document.createElement(`iframe`),a.src=w(),a.style.cssText=`
      width: 100%;
      height: 100%;
      border: none;
    `,a.allow=`microphone; clipboard-read; clipboard-write`,o.appendChild(a),document.body.appendChild(o),window.addEventListener(`message`,T)}function w(){let t=new URLSearchParams;return t.append(`organizationId`,u),`${e.WIDGET_URL}?${t.toString()}`}function T(t){if(t.origin!==new URL(e.WIDGET_URL).origin)return;let{type:n,payload:r}=t.data;switch(n){case`close`:O();break;case`resize`:r.height&&o&&(o.style.height=`${r.height}px`);break;case`widget-settings`:r?.appearance&&b(r.appearance);break}}function E(){c?O():D()}function D(){o&&s&&(c=!0,o.style.display=`block`,setTimeout(()=>{o&&(o.style.opacity=`1`,o.style.transform=`translateY(0)`)},10),y())}function O(){o&&s&&(c=!1,o.style.opacity=`0`,o.style.transform=`translateY(10px)`,setTimeout(()=>{o&&(o.style.display=`none`)},300),y())}function k(){window.removeEventListener(`message`,T),o&&(o.remove(),o=null,a=null),s&&=(s.remove(),null),c=!1}function A(e){k(),e.organizationId&&(u=e.organizationId),e.position&&(d=e.position),S()}window.EchoWidget={init:A,show:D,hide:O,destroy:k,setAppearance:b},S()})()})();