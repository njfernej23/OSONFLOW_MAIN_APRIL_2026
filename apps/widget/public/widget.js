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
</svg>`,a=20,o=48,s=o,c=18,l=180,u=34,ee=18,te=220,d=380,ne=640,re=470,ie=`translate3d(0, 26px, 0) scale(0.975)`,ae=`translate3d(0, 0, 0) scale(1)`,oe=360,se=220,f=`cubic-bezier(0.16, 1, 0.3, 1)`,p=`cubic-bezier(0.4, 0, 1, 1)`,ce=`blur(10px)`,m=`blur(0px)`,h=`30px`,g=a*2,le=76,ue=96,_=`echo-widget-launcher-styles`,de=`(prefers-reduced-motion: reduce)`,v=`Talk with us`;(function(){let y=null,b=null,x=null,S=null,C=!1,w=null,T=null,E=null,D=!1,O=!1,k=!1,A={launcherColor:`#3b82f6`,launcherLabel:`Chat with us`,voiceLauncherLabel:v,launcherIcon:`chat`,launcherIconUrl:``,launcherPromptEnabled:!1,launcherPromptText:`Need help? Talk with us`,launcherPromptDelaySeconds:5,animation:`slide-up`},j={"slide-up":{closedTransform:`translate3d(0, 18px, 0) scale(0.98)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:260,easing:`cubic-bezier(0.16, 1, 0.3, 1)`},scale:{closedTransform:`translate3d(0, 8px, 0) scale(0.92)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:240,easing:`cubic-bezier(0.2, 0.8, 0.2, 1)`},fade:{closedTransform:`translate3d(0, 0, 0) scale(1)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:200,easing:`ease`},pop:{closedTransform:`translate3d(0, 20px, 0) scale(0.86)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:320,easing:`cubic-bezier(0.18, 1.35, 0.32, 1)`}},M=null,N=null,P=e.DEFAULT_POSITION,fe=e=>{switch(e){case`sparkles`:return n;case`question`:return r;default:return t}},pe=e=>e===`sparkles`||e===`question`||e===`chat`?e:`chat`,F=e=>e===`slide-up`||e===`scale`||e===`fade`||e===`pop`?e:`slide-up`,I=e=>{if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e))return null;if(e.length===4){let[t,n,r,i]=e;return`${t}${n}${n}${r}${r}${i}${i}`}return e},L=e=>{let t=I(e);if(!t)return`#ffffff`;let n=parseInt(t.slice(1,3),16),r=parseInt(t.slice(3,5),16),i=parseInt(t.slice(5,7),16);return(.299*n+.587*r+.114*i)/255>.6?`#111111`:`#ffffff`},R=e=>{let t=I(e);return t?`rgba(${parseInt(t.slice(1,3),16)}, ${parseInt(t.slice(3,5),16)}, ${parseInt(t.slice(5,7),16)}, 0.35)`:`rgba(59, 130, 246, 0.35)`},z=e=>e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#039;`),B=e=>Number.isNaN(e)?5:Math.max(0,Math.min(120,e)),V=()=>{T!==null&&(window.clearTimeout(T),T=null)},H=()=>{E&&(E.style.cssText=`
      position: fixed;
      ${P===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
      bottom: 76px;
      max-width: ${te}px;
      padding: 8px 12px;
      border-radius: 16px;
      background: #ffffff;
      color: #020617;
      box-shadow: 0 16px 34px -22px rgba(15, 23, 42, 0.45);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
      text-align: ${P===`bottom-right`?`right`:`left`};
      z-index: 999999;
      pointer-events: none;
      opacity: 0;
      transform: translate3d(0, 8px, 0);
      transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
      display: none;
    `)},U=()=>{V(),E&&(E.style.display=`none`,E.style.opacity=`0`,E.style.transform=`translate3d(0, 8px, 0)`)},me=()=>{if(!E)return;let e=A.launcherPromptText.trim();e&&(E.textContent=e,H(),E.style.display=`block`,window.requestAnimationFrame(()=>{E&&(E.style.opacity=`1`,E.style.transform=`translate3d(0, 0, 0)`)}))},W=()=>{let e=!C||!k;return A.launcherPromptEnabled&&!D&&!C&&!k&&O&&!!S&&e},G=()=>{if(!W()){U();return}if(E&&E.style.display===`block`){E.textContent=A.launcherPromptText.trim(),H();return}if(T!==null)return;let e=B(A.launcherPromptDelaySeconds)*1e3;T=window.setTimeout(()=>{T=null,W()&&me()},e)},he=e=>`<img src="${z(e)}" alt="Launcher" style="width: ${o}px; height: ${o}px; border-radius: 50%; object-fit: cover; display: block;" />`,ge=()=>`
      <span class="echo-widget-voice-orb" aria-hidden="true">
        <span class="echo-widget-voice-orb__pulse"></span>
        <span class="echo-widget-voice-orb__gradient"></span>
        <span class="echo-widget-voice-orb__shine"></span>
        <span class="echo-widget-voice-orb__sweep"></span>
        <span class="echo-widget-voice-orb__core"></span>
        <span class="echo-widget-voice-orb__ripple"></span>
      </span>
    `,_e=()=>{if(document.getElementById(_))return;let e=document.createElement(`style`);e.id=_,e.textContent=`
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
        width: ${u}px;
        height: ${u}px;
        flex: 0 0 ${u}px;
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
    `,document.head.appendChild(e)},K=()=>{if(!S)return;if(S.style.transition=`all 0.2s ease`,C){S.classList.remove(`echo-widget-button--voice`),k||(S.style.width=`${s}px`,S.style.minWidth=`${s}px`,S.style.height=`${s}px`,S.style.padding=`0`,S.style.borderRadius=`50%`,S.style.justifyContent=`center`,S.style.background=A.launcherColor,S.style.color=L(A.launcherColor),S.style.boxShadow=`0 18px 40px ${R(A.launcherColor)}`,S.style.animation=`none`,S.setAttribute(`aria-label`,`Close chat widget`),S.innerHTML=i),J();return}let e=k,t=e&&!C,n=t?A.voiceLauncherLabel.trim()||v:A.launcherLabel.trim(),r=!t&&!C&&A.launcherIconUrl.trim().length>0,a=!C&&(t||!r&&n.length>0),c=r?he(A.launcherIconUrl):t?ge():fe(A.launcherIcon);S.classList.toggle(`echo-widget-button--voice`,t),S.style.width=a?`auto`:`${o}px`,S.style.minWidth=`${o}px`,S.style.height=`${o}px`,S.style.padding=t?`0 22px 0 7px`:a?`0 ${ee}px 0 8px`:`0`,S.style.borderRadius=a?`9999px`:`50%`,S.style.justifyContent=a?`flex-start`:`center`,S.style.background=e?`rgba(255, 255, 255, 0.94)`:A.launcherColor,S.style.color=e?`#0f172a`:L(A.launcherColor),S.style.boxShadow=e?`0 16px 36px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(15, 23, 42, 0.08)`:`0 4px 24px ${R(A.launcherColor)}`,S.style.animation=t?`echo-widget-voice-launcher-glow 2.8s ease-in-out infinite`:`none`,S.setAttribute(`aria-label`,C?e?`Close voice widget`:`Close chat widget`:a?n:`Open chat widget`),a?S.innerHTML=`${c}<span class="echo-widget-voice-label">${z(n)}</span>`:S.innerHTML=c,J()},ve=()=>{S&&(K(),S.style.transition=`none`,S.style.visibility=`visible`,S.style.display=`flex`,S.style.opacity=`0`,S.style.pointerEvents=`none`,S.style.transform=`translate3d(${c}px, 0, 0) scale(0.94)`,window.requestAnimationFrame(()=>{S&&(S.style.transition=`opacity ${l}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${l}ms cubic-bezier(0.16, 1, 0.3, 1)`,S.style.opacity=`1`,S.style.pointerEvents=`auto`,S.style.transform=`scale(1)`)}))},q=e=>{typeof e.launcherColor==`string`&&e.launcherColor.trim()&&(A.launcherColor=e.launcherColor),typeof e.launcherLabel==`string`&&(A.launcherLabel=e.launcherLabel),typeof e.voiceLauncherLabel==`string`&&(A.voiceLauncherLabel=e.voiceLauncherLabel),typeof e.launcherIcon==`string`&&(A.launcherIcon=pe(e.launcherIcon)),typeof e.launcherIconUrl==`string`&&(A.launcherIconUrl=e.launcherIconUrl.trim()),typeof e.animation==`string`&&(A.animation=F(e.animation),Z(C?`open`:`closed`)),typeof e.launcherPromptEnabled==`boolean`&&(A.launcherPromptEnabled=e.launcherPromptEnabled),typeof e.launcherPromptText==`string`&&(A.launcherPromptText=e.launcherPromptText),typeof e.launcherPromptDelaySeconds==`number`&&(A.launcherPromptDelaySeconds=B(e.launcherPromptDelaySeconds)),K(),ye()},ye=()=>{!S||O||(O=!0,J(),G())},J=()=>{if(!S||!O)return;let e=!C||!k;S.style.visibility=e?`visible`:`hidden`,S.style.display=e?`flex`:`none`,S.style.opacity=e?`1`:`0`,S.style.pointerEvents=e?`auto`:`none`,S.style.transform=`scale(1)`,G()},Y=document.currentScript;if(Y)M=Y.getAttribute(`data-organization-id`),N=Y.getAttribute(`data-agent-id`),P=Y.getAttribute(`data-position`)||e.DEFAULT_POSITION,A.animation=F(Y.getAttribute(`data-animation`));else{let t=document.querySelectorAll(`script[src*="embed"]`),n=Array.from(t).find(e=>e.hasAttribute(`data-organization-id`));n&&(M=n.getAttribute(`data-organization-id`),N=n.getAttribute(`data-agent-id`),P=n.getAttribute(`data-position`)||e.DEFAULT_POSITION,A.animation=F(n.getAttribute(`data-animation`)))}if(!M){console.error(`Echo Widget: data-organization-id attribute is required`);return}function be(){document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,xe):xe()}function xe(){_e(),S=document.createElement(`button`),S.id=`echo-widget-button`,S.style.cssText=`
      position: fixed;
      ${P===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
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
    `,K(),S.addEventListener(`click`,we),S.addEventListener(`mouseenter`,()=>{S&&(S.style.transform=`scale(1.05)`)}),S.addEventListener(`mouseleave`,()=>{S&&(S.style.transform=`scale(1)`)}),document.body.appendChild(S),E=document.createElement(`div`),E.id=`echo-widget-launcher-prompt`,E.setAttribute(`aria-hidden`,`true`),H(),document.body.appendChild(E),b=document.createElement(`div`),b.id=`echo-widget-container`,b.style.cssText=`
      position: fixed;
      ${P===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
      bottom: ${a}px;
      width: ${d}px;
      height: ${ne}px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - ${g}px);
      z-index: 999998;
      border-radius: ${h};
      overflow: hidden;
      isolation: isolate;
      background: #ffffff;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      filter: ${m};
      transform: ${j[A.animation].closedTransform};
      transform-origin: ${P===`bottom-right`?`bottom right`:`bottom left`};
      transition:
        opacity ${j[A.animation].duration}ms ${j[A.animation].easing},
        transform ${j[A.animation].duration}ms ${j[A.animation].easing},
        filter ${j[A.animation].duration}ms ${j[A.animation].easing},
        border-radius ${j[A.animation].duration}ms ${j[A.animation].easing};
      will-change: opacity, transform, filter, border-radius;
    `,x=document.createElement(`div`),x.setAttribute(`aria-hidden`,`true`),x.style.cssText=`
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
    `,y=document.createElement(`iframe`),y.src=Se(),y.style.cssText=`
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      border: none;
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transform-origin: center;
      will-change: opacity, transform;
    `,y.allow=`microphone; clipboard-read; clipboard-write`,b.appendChild(x),b.appendChild(y),document.body.appendChild(b),window.addEventListener(`message`,Ce)}function Se(){let t=new URLSearchParams;t.append(`organizationId`,M);let n=N?.trim();return n&&t.append(`agentId`,n),`${e.WIDGET_URL}?${t.toString()}`}function Ce(t){if(t.origin!==new URL(e.WIDGET_URL).origin)return;let{type:n,payload:r}=t.data;switch(n){case`close`:Q();break;case`resize`:r.height&&b&&(b.style.height=`${r.height}px`);break;case`widget-settings`:if(r){let e=r;typeof e.liveVoiceEnabled==`boolean`&&(k=e.liveVoiceEnabled,Z(C?`open`:`closed`)),e.appearance?q(e.appearance):K()}break}}function we(){C?Q():Me()}function X(){return window.matchMedia?.(de).matches??!1}function Te(e){return X()?0:k?e===`open`?oe:se:j[A.animation].duration}function Ee(e){return k?e===`open`?f:p:j[A.animation].easing}function De(e){if(k)return e===`open`?ae:ie;let t=j[A.animation];return e===`open`?t.openTransform:t.closedTransform}function Oe(){!b||!S||(b.style.transformOrigin=P===`bottom-right`?`bottom right`:`bottom left`)}function ke(){if(!b)return;let e=C&&!k;b.style.width=`${d}px`,b.style.bottom=`${e?le:a}px`,b.style.maxHeight=`calc(100vh - ${e?ue:g}px)`,b.style.height=`${k?re:ne}px`}function Ae(e,t=!1){if(!y)return;if(!k||t||X()){y.style.opacity=`1`,y.style.transition=`none`,y.style.transform=`translate3d(0, 0, 0)`,y.style.filter=`blur(0px)`,k&&e===`closed`&&(y.style.opacity=`0`,y.style.transform=`translate3d(0, 10px, 0)`,y.style.filter=`blur(8px)`);return}let n=e===`open`?260:120,r=e===`open`?72:0,i=e===`open`?f:p;y.style.transition=`opacity ${n}ms ${i} ${r}ms, transform ${n}ms ${i} ${r}ms, filter ${n}ms ${i} ${r}ms`,y.style.opacity=e===`open`?`1`:`0`,y.style.transform=e===`open`?`translate3d(0, 0, 0)`:`translate3d(0, 10px, 0)`,y.style.filter=e===`open`?`blur(0px)`:`blur(8px)`}function je(e,t=!1){if(!x)return;if(!k||t||X()){x.style.opacity=`0`,x.style.transition=`none`,x.style.transform=`translate3d(0, 8px, 0)`;return}let n=e===`open`?220:120,r=e===`open`?42:0,i=e===`open`?f:p;x.style.transition=`opacity ${n}ms ${i} ${r}ms, transform ${n}ms ${i} ${r}ms`,x.style.opacity=e===`open`?`0`:`1`,x.style.transform=e===`open`?`translate3d(0, -4px, 0)`:`translate3d(0, 8px, 0)`}function Z(e,t={}){if(!b)return;let n=Te(e),r=Ee(e),i=t.immediate||n===0,a=De(e),o=k&&e===`open`?`0 24px 70px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06)`:`0 4px 24px rgba(0, 0, 0, 0.15)`,s=k&&e===`closed`?ce:m;ke(),b.style.transition=i?`none`:`opacity ${n}ms ${r}, transform ${n}ms ${r}, filter ${n}ms ${r}, border-radius ${n}ms ${r}, box-shadow ${n}ms ${r}`,b.style.opacity=k||e===`open`?`1`:`0`,b.style.background=`#ffffff`,b.style.transform=a,b.style.filter=s,b.style.borderRadius=h,b.style.boxShadow=o,je(e,i),Ae(e,i)}function Me(){b&&S&&(w!==null&&(window.clearTimeout(w),w=null),D=!0,U(),b.style.display=`block`,Oe(),C=!0,Z(`closed`,{immediate:!0}),J(),window.requestAnimationFrame(()=>{window.requestAnimationFrame(()=>Z(`open`))}),K())}function Q(){if(b&&S){w!==null&&(window.clearTimeout(w),w=null);let e=!k;C=!1;let t=k;t||ve(),Oe(),k&&S&&(S.style.visibility=`hidden`,S.style.opacity=`0`,S.style.pointerEvents=`none`),Z(`closed`),w=window.setTimeout(()=>{b&&!C&&(b.style.display=`none`),t?J():e&&S&&(S.style.pointerEvents=`auto`),w=null},Te(`closed`))}}function $(){window.removeEventListener(`message`,Ce),b&&(b.remove(),b=null,y=null,x=null),E&&=(E.remove(),null),S&&=(S.remove(),null),w!==null&&(window.clearTimeout(w),w=null),V(),C=!1,O=!1,k=!1,D=!1}function Ne(e){$(),e.organizationId&&(M=e.organizationId),e.agentId!==void 0&&(N=e.agentId),e.position&&(P=e.position),e.animation&&(A.animation=F(e.animation)),be()}window.EchoWidget={init:Ne,show:Me,hide:Q,destroy:$,setAppearance:q},be()})()})();