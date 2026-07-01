(function(){var e={WIDGET_URL:`https://widget.osonflow.uz`,DEFAULT_ORG_ID:`org_3Dhb76QSczUyE7dErBZuY9k65wC`,DEFAULT_POSITION:`bottom-right`},t=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,n=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
  <path d="M5 3v4"></path>
  <path d="M3 5h4"></path>
</svg>`,r=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3"></path>
  <path d="M12 17h.01"></path>
</svg>`,i=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round">
  <path d="m6 9 6 6 6-6"></path>
</svg>`,a=20,o=48,s=o,c=18,ee=180,l=34,te=18,ne=220,u=380,d=640,re=470,ie=`translate3d(0, 26px, 0) scale(0.975)`,ae=`translate3d(0, 0, 0) scale(1)`,oe=360,se=220,f=`cubic-bezier(0.16, 1, 0.3, 1)`,p=`cubic-bezier(0.4, 0, 1, 1)`,ce=`blur(10px)`,m=`blur(0px)`,h=`30px`,le=a*2,ue=76,de=96,g=`echo-widget-launcher-styles`,fe=`(prefers-reduced-motion: reduce)`,_=`Talk with us`;(function(){let v=null,y=null,b=null,x=null,S=!1,C=null,w=null,T=null,E=!1,D=!1,O=!1,k={launcherColor:`#3b82f6`,launcherLabel:`Chat with us`,voiceLauncherLabel:_,launcherIcon:`chat`,launcherIconUrl:``,launcherPromptEnabled:!1,launcherPromptText:`Need help? Talk with us`,launcherPromptDelaySeconds:5,animation:`slide-up`},A={"slide-up":{closedTransform:`translate3d(0, 18px, 0) scale(0.98)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:260,easing:`cubic-bezier(0.16, 1, 0.3, 1)`},scale:{closedTransform:`translate3d(0, 8px, 0) scale(0.92)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:240,easing:`cubic-bezier(0.2, 0.8, 0.2, 1)`},fade:{closedTransform:`translate3d(0, 0, 0) scale(1)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:200,easing:`ease`},pop:{closedTransform:`translate3d(0, 20px, 0) scale(0.86)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:320,easing:`cubic-bezier(0.18, 1.35, 0.32, 1)`}},j=null,M=e.DEFAULT_POSITION,pe=e=>{switch(e){case`sparkles`:return n;case`question`:return r;default:return t}},me=e=>e===`sparkles`||e===`question`||e===`chat`?e:`chat`,N=e=>e===`slide-up`||e===`scale`||e===`fade`||e===`pop`?e:`slide-up`,P=e=>{if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e))return null;if(e.length===4){let[t,n,r,i]=e;return`${t}${n}${n}${r}${r}${i}${i}`}return e},F=e=>{let t=P(e);if(!t)return`#ffffff`;let n=parseInt(t.slice(1,3),16),r=parseInt(t.slice(3,5),16),i=parseInt(t.slice(5,7),16);return(.299*n+.587*r+.114*i)/255>.6?`#111111`:`#ffffff`},I=e=>{let t=P(e);return t?`rgba(${parseInt(t.slice(1,3),16)}, ${parseInt(t.slice(3,5),16)}, ${parseInt(t.slice(5,7),16)}, 0.35)`:`rgba(59, 130, 246, 0.35)`},L=e=>e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#039;`),R=e=>Number.isNaN(e)?5:Math.max(0,Math.min(120,e)),z=()=>{w!==null&&(window.clearTimeout(w),w=null)},B=()=>{T&&(T.style.cssText=`
      position: fixed;
      ${M===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
      bottom: 76px;
      max-width: ${ne}px;
      padding: 8px 12px;
      border-radius: 16px;
      background: #ffffff;
      color: #020617;
      box-shadow: 0 16px 34px -22px rgba(15, 23, 42, 0.45);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
      text-align: ${M===`bottom-right`?`right`:`left`};
      z-index: 999999;
      pointer-events: none;
      opacity: 0;
      transform: translate3d(0, 8px, 0);
      transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
      display: none;
    `)},V=()=>{z(),T&&(T.style.display=`none`,T.style.opacity=`0`,T.style.transform=`translate3d(0, 8px, 0)`)},he=()=>{if(!T)return;let e=k.launcherPromptText.trim();e&&(T.textContent=e,B(),T.style.display=`block`,window.requestAnimationFrame(()=>{T&&(T.style.opacity=`1`,T.style.transform=`translate3d(0, 0, 0)`)}))},H=()=>{let e=!S||!O;return k.launcherPromptEnabled&&!E&&!S&&!O&&D&&!!x&&e},U=()=>{if(!H()){V();return}if(T&&T.style.display===`block`){T.textContent=k.launcherPromptText.trim(),B();return}if(w!==null)return;let e=R(k.launcherPromptDelaySeconds)*1e3;w=window.setTimeout(()=>{w=null,H()&&he()},e)},ge=e=>`<img src="${L(e)}" alt="Launcher" style="width: ${o}px; height: ${o}px; border-radius: 50%; object-fit: cover; display: block;" />`,_e=()=>`
      <span class="echo-widget-voice-orb" aria-hidden="true">
        <span class="echo-widget-voice-orb__pulse"></span>
        <span class="echo-widget-voice-orb__gradient"></span>
        <span class="echo-widget-voice-orb__shine"></span>
        <span class="echo-widget-voice-orb__sweep"></span>
        <span class="echo-widget-voice-orb__core"></span>
        <span class="echo-widget-voice-orb__ripple"></span>
      </span>
    `,ve=()=>{if(document.getElementById(g))return;let e=document.createElement(`style`);e.id=g,e.textContent=`
      @keyframes echo-widget-orb-shape {
        0%, 100% {
          border-radius: 50%;
          transform: scale(1) rotate(0deg);
        }

        50% {
          border-radius: 44% 56% 53% 47% / 49% 44% 56% 51%;
          transform: scale(1.08) rotate(8deg);
        }
      }

      @keyframes echo-widget-orb-gradient {
        0% {
          transform: translate3d(-3%, -2%, 0) rotate(0deg) scale(1);
        }

        50% {
          transform: translate3d(3%, 2%, 0) rotate(180deg) scale(1.06);
        }

        100% {
          transform: translate3d(-3%, -2%, 0) rotate(360deg) scale(1);
        }
      }

      @keyframes echo-widget-orb-core {
        0%, 100% {
          transform: scale(0.82);
          opacity: 0.78;
        }

        50% {
          transform: scale(1.18);
          opacity: 1;
        }
      }

      @keyframes echo-widget-orb-pulse-ripple {
        0% {
          box-shadow: 0 0 0 0 rgba(125, 211, 252, 0.42);
          opacity: 0.88;
        }

        72% {
          box-shadow: 0 0 0 10px rgba(125, 211, 252, 0);
          opacity: 0;
        }

        100% {
          box-shadow: 0 0 0 10px rgba(125, 211, 252, 0);
          opacity: 0;
        }
      }

      @keyframes echo-widget-orb-sweep {
        0% {
          transform: translate3d(-140%, 110%, 0) rotate(34deg);
          opacity: 0;
        }

        24% {
          opacity: 0.72;
        }

        52% {
          opacity: 0.34;
        }

        100% {
          transform: translate3d(140%, -130%, 0) rotate(34deg);
          opacity: 0;
        }
      }

      @keyframes echo-widget-orb-click-ripple {
        0% {
          transform: scale(0.25);
          opacity: 0.46;
        }

        100% {
          transform: scale(2.15);
          opacity: 0;
        }
      }

      @keyframes echo-widget-voice-launcher-glow {
        0%, 100% {
          box-shadow:
            0 16px 36px rgba(0, 0, 0, 0.28),
            0 0 0 1px rgba(255, 255, 255, 0.08),
            0 0 0 0 rgba(56, 189, 248, 0.18);
        }

        50% {
          box-shadow:
            0 18px 42px rgba(0, 0, 0, 0.34),
            0 0 0 1px rgba(255, 255, 255, 0.12),
            0 0 0 8px rgba(56, 189, 248, 0.08);
        }
      }

      @keyframes echo-widget-voice-shimmer {
        0% {
          transform: translateX(-130%) skewX(-18deg);
        }

        100% {
          transform: translateX(220%) skewX(-18deg);
        }
      }

      #echo-widget-button.echo-widget-button--voice {
        isolation: isolate;
        overflow: hidden;
        contain: paint;
      }

      #echo-widget-button.echo-widget-button--voice::before {
        content: "";
        position: absolute;
        inset: 1px;
        z-index: -1;
        overflow: hidden;
        border-radius: inherit;
        background:
          radial-gradient(circle at 17% 50%, rgba(56, 189, 248, 0.1), transparent 30%),
          linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 54%, rgba(241,245,249,0.96) 100%);
      }

      #echo-widget-button.echo-widget-button--voice::after {
        content: "";
        position: absolute;
        top: 1px;
        bottom: 1px;
        left: 1px;
        z-index: 0;
        width: 34%;
        border-radius: inherit;
        background: linear-gradient(90deg, transparent, rgba(14,165,233,0.12), transparent);
        animation: echo-widget-voice-shimmer 3.4s ease-in-out infinite;
        pointer-events: none;
      }

      #echo-widget-button.echo-widget-button--voice > * {
        position: relative;
        z-index: 1;
      }

      .echo-widget-voice-label {
        position: relative;
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
        line-height: 1;
        letter-spacing: -0.01em;
      }

      .echo-widget-voice-orb {
        position: relative;
        display: inline-flex;
        width: ${l}px;
        height: ${l}px;
        flex: 0 0 ${l}px;
        overflow: hidden;
        border-radius: 50%;
        clip-path: circle(50%);
        -webkit-clip-path: circle(50%);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.38),
          0 8px 18px rgba(14, 165, 233, 0.34);
        animation: echo-widget-orb-shape 1.8s ease-in-out infinite;
      }

      .echo-widget-voice-orb__pulse {
        position: absolute;
        inset: 3px;
        z-index: 0;
        border-radius: inherit;
        animation: echo-widget-orb-pulse-ripple 1.9s cubic-bezier(0.16, 1, 0.3, 1) infinite;
      }

      .echo-widget-voice-orb__gradient {
        position: absolute;
        inset: -8px;
        z-index: 1;
        background:
          radial-gradient(circle at 28% 22%, rgba(238, 247, 126, 0.92), transparent 30%),
          radial-gradient(circle at 72% 24%, rgba(139, 211, 255, 0.96), transparent 34%),
          radial-gradient(circle at 46% 84%, rgba(0, 120, 224, 0.95), transparent 42%),
          radial-gradient(circle at 86% 72%, rgba(4, 31, 43, 0.86), transparent 42%),
          radial-gradient(circle at 20% 70%, rgba(96, 169, 129, 0.74), transparent 34%);
        animation: echo-widget-orb-gradient 3.2s linear infinite;
      }

      .echo-widget-voice-orb__shine {
        position: absolute;
        inset: 0;
        z-index: 2;
        background: conic-gradient(from 120deg, rgba(255,255,255,0.2), rgba(255,255,255,0), rgba(255,255,255,0.24), rgba(255,255,255,0));
        mix-blend-mode: overlay;
        opacity: 0.82;
      }

      .echo-widget-voice-orb__sweep {
        position: absolute;
        inset: -10px;
        z-index: 3;
        width: 18px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.74), transparent);
        filter: blur(0.5px);
        animation: echo-widget-orb-sweep 2.7s cubic-bezier(0.16, 1, 0.3, 1) infinite;
      }

      .echo-widget-voice-orb__core {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 4;
        width: 9px;
        height: 9px;
        margin-left: -4.5px;
        margin-top: -4.5px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 0 16px rgba(255, 255, 255, 0.72);
        animation: echo-widget-orb-core 1.4s ease-in-out infinite;
      }

      .echo-widget-voice-orb__ripple {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 5;
        width: 100%;
        height: 100%;
        margin-left: -50%;
        margin-top: -50%;
        border-radius: inherit;
        background: rgba(255, 255, 255, 0.52);
        opacity: 0;
        transform: scale(0.25);
        pointer-events: none;
      }

      #echo-widget-button.echo-widget-button--voice:active .echo-widget-voice-orb__ripple {
        animation: echo-widget-orb-click-ripple 520ms ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        #echo-widget-button.echo-widget-button--voice,
        #echo-widget-button.echo-widget-button--voice::after,
        .echo-widget-voice-orb,
        .echo-widget-voice-orb__pulse,
        .echo-widget-voice-orb__gradient,
        .echo-widget-voice-orb__core,
        .echo-widget-voice-orb__sweep,
        .echo-widget-voice-orb__ripple {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    `,document.head.appendChild(e)},W=()=>{if(!x)return;if(x.style.transition=`all 0.2s ease`,S){x.classList.remove(`echo-widget-button--voice`),O||(x.style.width=`${s}px`,x.style.minWidth=`${s}px`,x.style.height=`${s}px`,x.style.padding=`0`,x.style.borderRadius=`50%`,x.style.justifyContent=`center`,x.style.background=k.launcherColor,x.style.color=F(k.launcherColor),x.style.boxShadow=`0 18px 40px ${I(k.launcherColor)}`,x.style.animation=`none`,x.setAttribute(`aria-label`,`Close chat widget`),x.innerHTML=i),K();return}let e=O,t=e&&!S,n=t?k.voiceLauncherLabel.trim()||_:k.launcherLabel.trim(),r=!t&&!S&&k.launcherIconUrl.trim().length>0,a=!S&&(t||!r&&n.length>0),c=r?ge(k.launcherIconUrl):t?_e():pe(k.launcherIcon);x.classList.toggle(`echo-widget-button--voice`,t),x.style.width=a?`auto`:`${o}px`,x.style.minWidth=`${o}px`,x.style.height=`${o}px`,x.style.padding=t?`0 22px 0 7px`:a?`0 ${te}px 0 8px`:`0`,x.style.borderRadius=a?`9999px`:`50%`,x.style.justifyContent=a?`flex-start`:`center`,x.style.background=e?`rgba(255, 255, 255, 0.94)`:k.launcherColor,x.style.color=e?`#0f172a`:F(k.launcherColor),x.style.boxShadow=e?`0 16px 36px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(15, 23, 42, 0.08)`:`0 4px 24px ${I(k.launcherColor)}`,x.style.animation=t?`echo-widget-voice-launcher-glow 2.8s ease-in-out infinite`:`none`,x.setAttribute(`aria-label`,S?e?`Close voice widget`:`Close chat widget`:a?n:`Open chat widget`),a?x.innerHTML=`${c}<span class="echo-widget-voice-label">${L(n)}</span>`:x.innerHTML=c,K()},ye=()=>{x&&(W(),x.style.transition=`none`,x.style.visibility=`visible`,x.style.display=`flex`,x.style.opacity=`0`,x.style.pointerEvents=`none`,x.style.transform=`translate3d(${c}px, 0, 0) scale(0.94)`,window.requestAnimationFrame(()=>{x&&(x.style.transition=`opacity ${ee}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${ee}ms cubic-bezier(0.16, 1, 0.3, 1)`,x.style.opacity=`1`,x.style.pointerEvents=`auto`,x.style.transform=`scale(1)`)}))},G=e=>{typeof e.launcherColor==`string`&&e.launcherColor.trim()&&(k.launcherColor=e.launcherColor),typeof e.launcherLabel==`string`&&(k.launcherLabel=e.launcherLabel),typeof e.voiceLauncherLabel==`string`&&(k.voiceLauncherLabel=e.voiceLauncherLabel),typeof e.launcherIcon==`string`&&(k.launcherIcon=me(e.launcherIcon)),typeof e.launcherIconUrl==`string`&&(k.launcherIconUrl=e.launcherIconUrl.trim()),typeof e.animation==`string`&&(k.animation=N(e.animation),Q(S?`open`:`closed`)),typeof e.launcherPromptEnabled==`boolean`&&(k.launcherPromptEnabled=e.launcherPromptEnabled),typeof e.launcherPromptText==`string`&&(k.launcherPromptText=e.launcherPromptText),typeof e.launcherPromptDelaySeconds==`number`&&(k.launcherPromptDelaySeconds=R(e.launcherPromptDelaySeconds)),W(),be()},be=()=>{!x||D||(D=!0,K(),U())},K=()=>{if(!x||!D)return;let e=!S||!O;x.style.visibility=e?`visible`:`hidden`,x.style.display=e?`flex`:`none`,x.style.opacity=e?`1`:`0`,x.style.pointerEvents=e?`auto`:`none`,x.style.transform=`scale(1)`,U()},q=document.currentScript;if(q)j=q.getAttribute(`data-organization-id`),M=q.getAttribute(`data-position`)||e.DEFAULT_POSITION,k.animation=N(q.getAttribute(`data-animation`));else{let t=document.querySelectorAll(`script[src*="embed"]`),n=Array.from(t).find(e=>e.hasAttribute(`data-organization-id`));n&&(j=n.getAttribute(`data-organization-id`),M=n.getAttribute(`data-position`)||e.DEFAULT_POSITION,k.animation=N(n.getAttribute(`data-animation`)))}if(!j){console.error(`Echo Widget: data-organization-id attribute is required`);return}function J(){document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,Y):Y()}function Y(){ve(),x=document.createElement(`button`),x.id=`echo-widget-button`,x.style.cssText=`
      position: fixed;
      ${M===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
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
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      transition: all 0.2s ease;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
    `,W(),x.addEventListener(`click`,Se),x.addEventListener(`mouseenter`,()=>{x&&(x.style.transform=`scale(1.05)`)}),x.addEventListener(`mouseleave`,()=>{x&&(x.style.transform=`scale(1)`)}),document.body.appendChild(x),T=document.createElement(`div`),T.id=`echo-widget-launcher-prompt`,T.setAttribute(`aria-hidden`,`true`),B(),document.body.appendChild(T),y=document.createElement(`div`),y.id=`echo-widget-container`,y.style.cssText=`
      position: fixed;
      ${M===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
      bottom: ${a}px;
      width: ${u}px;
      height: ${d}px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - ${le}px);
      z-index: 999998;
      border-radius: ${h};
      overflow: hidden;
      isolation: isolate;
      background: #ffffff;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      filter: ${m};
      transform: ${A[k.animation].closedTransform};
      transform-origin: ${M===`bottom-right`?`bottom right`:`bottom left`};
      transition:
        opacity ${A[k.animation].duration}ms ${A[k.animation].easing},
        transform ${A[k.animation].duration}ms ${A[k.animation].easing},
        filter ${A[k.animation].duration}ms ${A[k.animation].easing},
        border-radius ${A[k.animation].duration}ms ${A[k.animation].easing};
      will-change: opacity, transform, filter, border-radius;
    `,b=document.createElement(`div`),b.setAttribute(`aria-hidden`,`true`),b.style.cssText=`
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      opacity: 0;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0) 22%),
        linear-gradient(0deg, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0) 24%);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      mask-image: linear-gradient(180deg, black 0%, transparent 26%, transparent 74%, black 100%);
      -webkit-mask-image: linear-gradient(180deg, black 0%, transparent 26%, transparent 74%, black 100%);
      transform: translate3d(0, 8px, 0);
      transition: none;
      will-change: opacity, transform;
    `,v=document.createElement(`iframe`),v.src=xe(),v.style.cssText=`
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      border: none;
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transform-origin: center;
      will-change: opacity, transform;
    `,v.allow=`microphone; clipboard-read; clipboard-write`,y.appendChild(b),y.appendChild(v),document.body.appendChild(y),window.addEventListener(`message`,X)}function xe(){let t=new URLSearchParams;return t.append(`organizationId`,j),`${e.WIDGET_URL}?${t.toString()}`}function X(t){if(t.origin!==new URL(e.WIDGET_URL).origin)return;let{type:n,payload:r}=t.data;switch(n){case`close`:$();break;case`resize`:r.height&&y&&(y.style.height=`${r.height}px`);break;case`widget-settings`:if(r){let e=r;typeof e.liveVoiceEnabled==`boolean`&&(O=e.liveVoiceEnabled,Q(S?`open`:`closed`)),e.appearance?G(e.appearance):W()}break}}function Se(){S?$():Ae()}function Z(){return window.matchMedia?.(fe).matches??!1}function Ce(e){return Z()?0:O?e===`open`?oe:se:A[k.animation].duration}function we(e){return O?e===`open`?f:p:A[k.animation].easing}function Te(e){if(O)return e===`open`?ae:ie;let t=A[k.animation];return e===`open`?t.openTransform:t.closedTransform}function Ee(){!y||!x||(y.style.transformOrigin=M===`bottom-right`?`bottom right`:`bottom left`)}function De(){if(!y)return;let e=S&&!O;y.style.width=`${u}px`,y.style.bottom=`${e?ue:a}px`,y.style.maxHeight=`calc(100vh - ${e?de:le}px)`,y.style.height=`${O?re:d}px`}function Oe(e,t=!1){if(!v)return;if(!O||t||Z()){v.style.opacity=`1`,v.style.transition=`none`,v.style.transform=`translate3d(0, 0, 0)`,v.style.filter=`blur(0px)`,O&&e===`closed`&&(v.style.opacity=`0`,v.style.transform=`translate3d(0, 10px, 0)`,v.style.filter=`blur(8px)`);return}let n=e===`open`?260:120,r=e===`open`?72:0,i=e===`open`?f:p;v.style.transition=`opacity ${n}ms ${i} ${r}ms, transform ${n}ms ${i} ${r}ms, filter ${n}ms ${i} ${r}ms`,v.style.opacity=e===`open`?`1`:`0`,v.style.transform=e===`open`?`translate3d(0, 0, 0)`:`translate3d(0, 10px, 0)`,v.style.filter=e===`open`?`blur(0px)`:`blur(8px)`}function ke(e,t=!1){if(!b)return;if(!O||t||Z()){b.style.opacity=`0`,b.style.transition=`none`,b.style.transform=`translate3d(0, 8px, 0)`;return}let n=e===`open`?220:120,r=e===`open`?42:0,i=e===`open`?f:p;b.style.transition=`opacity ${n}ms ${i} ${r}ms, transform ${n}ms ${i} ${r}ms`,b.style.opacity=e===`open`?`0`:`1`,b.style.transform=e===`open`?`translate3d(0, -4px, 0)`:`translate3d(0, 8px, 0)`}function Q(e,t={}){if(!y)return;let n=Ce(e),r=we(e),i=t.immediate||n===0,a=Te(e),o=O&&e===`open`?`0 24px 70px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06)`:`0 4px 24px rgba(0, 0, 0, 0.15)`,s=O&&e===`closed`?ce:m;De(),y.style.transition=i?`none`:`opacity ${n}ms ${r}, transform ${n}ms ${r}, filter ${n}ms ${r}, border-radius ${n}ms ${r}, box-shadow ${n}ms ${r}`,y.style.opacity=O||e===`open`?`1`:`0`,y.style.background=`#ffffff`,y.style.transform=a,y.style.filter=s,y.style.borderRadius=h,y.style.boxShadow=o,ke(e,i),Oe(e,i)}function Ae(){y&&x&&(C!==null&&(window.clearTimeout(C),C=null),E=!0,V(),y.style.display=`block`,Ee(),S=!0,Q(`closed`,{immediate:!0}),K(),window.requestAnimationFrame(()=>{window.requestAnimationFrame(()=>Q(`open`))}),W())}function $(){if(y&&x){C!==null&&(window.clearTimeout(C),C=null);let e=!O;S=!1;let t=O;t||ye(),Ee(),O&&x&&(x.style.visibility=`hidden`,x.style.opacity=`0`,x.style.pointerEvents=`none`),Q(`closed`),C=window.setTimeout(()=>{y&&!S&&(y.style.display=`none`),t?K():e&&x&&(x.style.pointerEvents=`auto`),C=null},Ce(`closed`))}}function je(){window.removeEventListener(`message`,X),y&&(y.remove(),y=null,v=null,b=null),T&&=(T.remove(),null),x&&=(x.remove(),null),C!==null&&(window.clearTimeout(C),C=null),z(),S=!1,D=!1,O=!1,E=!1}function Me(e){je(),e.organizationId&&(j=e.organizationId),e.position&&(M=e.position),e.animation&&(k.animation=N(e.animation)),J()}window.EchoWidget={init:Me,show:Ae,hide:$,destroy:je,setAppearance:G},J()})()})();