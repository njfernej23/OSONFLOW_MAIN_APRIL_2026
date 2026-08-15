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
</svg>`,a=20,o=48,s=o,c=18,l=180,u=34,ee=18,te=220,ne=380,d=640,re=470,ie=`translate3d(0, 26px, 0) scale(0.975)`,ae=`translate3d(0, 0, 0) scale(1)`,oe=360,se=220,f=`cubic-bezier(0.16, 1, 0.3, 1)`,p=`cubic-bezier(0.4, 0, 1, 1)`,ce=`blur(10px)`,m=`blur(0px)`,h=`30px`,le=a*2,ue=76,de=96,fe=`echo-widget-launcher-styles`,pe=`(prefers-reduced-motion: reduce)`,g=`Talk with us`,me=`/sounds/notification.mp3`;(function(){let _=null,v=null,y=null,b=null,x=!1,S=null,C=null,w=null,T=!1,E=!1,D=!1,O=null,k=!1,A=!1,j={launcherColor:`#3b82f6`,launcherLabel:`Chat with us`,voiceLauncherLabel:g,launcherIcon:`chat`,launcherIconUrl:``,launcherPromptEnabled:!1,launcherPromptText:`Need help? Talk with us`,launcherPromptDelaySeconds:5,animation:`slide-up`},M={"slide-up":{closedTransform:`translate3d(0, 18px, 0) scale(0.98)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:260,easing:`cubic-bezier(0.16, 1, 0.3, 1)`},scale:{closedTransform:`translate3d(0, 8px, 0) scale(0.92)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:240,easing:`cubic-bezier(0.2, 0.8, 0.2, 1)`},fade:{closedTransform:`translate3d(0, 0, 0) scale(1)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:200,easing:`ease`},pop:{closedTransform:`translate3d(0, 20px, 0) scale(0.86)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:320,easing:`cubic-bezier(0.18, 1.35, 0.32, 1)`}},N=null,P=null,F=e.DEFAULT_POSITION,he=e=>{switch(e){case`sparkles`:return n;case`question`:return r;default:return t}},ge=e=>e===`sparkles`||e===`question`||e===`chat`?e:`chat`,I=e=>e===`slide-up`||e===`scale`||e===`fade`||e===`pop`?e:`slide-up`,L=e=>{if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e))return null;if(e.length===4){let[t,n,r,i]=e;return`${t}${n}${n}${r}${r}${i}${i}`}return e},_e=e=>{let t=e.trim();if(!t||/[()"'\\\s;<>]/.test(t))return``;if(/^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(t))return t;try{let e=new URL(t,window.location.href).protocol;return e===`http:`||e===`https:`?t:``}catch{return``}},ve=e=>{let t=L(e);if(!t)return`#ffffff`;let n=parseInt(t.slice(1,3),16),r=parseInt(t.slice(3,5),16),i=parseInt(t.slice(5,7),16);return(.299*n+.587*r+.114*i)/255>.6?`#111111`:`#ffffff`},R=e=>{let t=L(e);return t?`rgba(${parseInt(t.slice(1,3),16)}, ${parseInt(t.slice(3,5),16)}, ${parseInt(t.slice(5,7),16)}, 0.35)`:`rgba(59, 130, 246, 0.35)`},z=e=>e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#039;`),B=e=>Number.isNaN(e)?5:Math.max(0,Math.min(120,e)),V=()=>{C!==null&&(window.clearTimeout(C),C=null)},H=()=>{w&&(w.style.cssText=`
      position: fixed;
      ${F===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
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
      text-align: ${F===`bottom-right`?`right`:`left`};
      z-index: 999999;
      pointer-events: none;
      opacity: 0;
      transform: translate3d(0, 8px, 0);
      transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
      display: none;
    `)},U=()=>{V(),w&&(w.style.display=`none`,w.style.opacity=`0`,w.style.transform=`translate3d(0, 8px, 0)`)},ye=()=>{if(!w)return;let e=j.launcherPromptText.trim();e&&(w.textContent=e,H(),w.style.display=`block`,window.requestAnimationFrame(()=>{w&&(w.style.opacity=`1`,w.style.transform=`translate3d(0, 0, 0)`)}))},W=()=>{let e=!x||!D;return j.launcherPromptEnabled&&!T&&!x&&!D&&E&&!!b&&e},G=()=>{if(!W()){U();return}if(w&&w.style.display===`block`){w.textContent=j.launcherPromptText.trim(),H();return}if(C!==null)return;let e=B(j.launcherPromptDelaySeconds)*1e3;C=window.setTimeout(()=>{C=null,W()&&ye()},e)},be=e=>`<img src="${z(e)}" alt="Launcher" style="width: ${o}px; height: ${o}px; border-radius: 50%; object-fit: cover; display: block;" />`,xe=()=>`
      <span class="echo-widget-voice-orb" aria-hidden="true">
        <span class="echo-widget-voice-orb__pulse"></span>
        <span class="echo-widget-voice-orb__gradient"></span>
        <span class="echo-widget-voice-orb__shine"></span>
        <span class="echo-widget-voice-orb__sweep"></span>
        <span class="echo-widget-voice-orb__core"></span>
        <span class="echo-widget-voice-orb__ripple"></span>
      </span>
    `,Se=()=>{if(document.getElementById(fe))return;let e=document.createElement(`style`);e.id=fe,e.textContent=`
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
    `,document.head.appendChild(e)},K=()=>{if(!b)return;if(b.style.transition=`all 0.2s ease`,x){b.classList.remove(`echo-widget-button--voice`),D||(b.style.width=`${s}px`,b.style.minWidth=`${s}px`,b.style.height=`${s}px`,b.style.padding=`0`,b.style.borderRadius=`50%`,b.style.justifyContent=`center`,b.style.background=j.launcherColor,b.style.color=ve(j.launcherColor),b.style.boxShadow=`0 18px 40px ${R(j.launcherColor)}`,b.style.animation=`none`,b.setAttribute(`aria-label`,`Close chat widget`),b.innerHTML=i),J();return}let e=D,t=e&&!x,n=t?j.voiceLauncherLabel.trim()||g:j.launcherLabel.trim(),r=!t&&!x&&j.launcherIconUrl.trim().length>0,a=!x&&(t||!r&&n.length>0),c=r?be(j.launcherIconUrl):t?xe():he(j.launcherIcon);b.classList.toggle(`echo-widget-button--voice`,t),b.style.width=a?`auto`:`${o}px`,b.style.minWidth=`${o}px`,b.style.height=`${o}px`,b.style.padding=t?`0 22px 0 7px`:a?`0 ${ee}px 0 8px`:`0`,b.style.borderRadius=a?`9999px`:`50%`,b.style.justifyContent=a?`flex-start`:`center`,b.style.background=e?`rgba(255, 255, 255, 0.94)`:j.launcherColor,b.style.color=e?`#0f172a`:ve(j.launcherColor),b.style.boxShadow=e?`0 16px 36px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(15, 23, 42, 0.08)`:`0 4px 24px ${R(j.launcherColor)}`,b.style.animation=t?`echo-widget-voice-launcher-glow 2.8s ease-in-out infinite`:`none`,b.setAttribute(`aria-label`,x?e?`Close voice widget`:`Close chat widget`:a?n:`Open chat widget`),a?b.innerHTML=`${c}<span class="echo-widget-voice-label">${z(n)}</span>`:b.innerHTML=c,J()},Ce=()=>{b&&(K(),b.style.transition=`none`,b.style.visibility=`visible`,b.style.display=`flex`,b.style.opacity=`0`,b.style.pointerEvents=`none`,b.style.transform=`translate3d(${c}px, 0, 0) scale(0.94)`,window.requestAnimationFrame(()=>{b&&(b.style.transition=`opacity ${l}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${l}ms cubic-bezier(0.16, 1, 0.3, 1)`,b.style.opacity=`1`,b.style.pointerEvents=`auto`,b.style.transform=`scale(1)`)}))},q=e=>{if(typeof e.launcherColor==`string`){let t=L(e.launcherColor.trim());t&&(j.launcherColor=t)}typeof e.launcherLabel==`string`&&(j.launcherLabel=e.launcherLabel),typeof e.voiceLauncherLabel==`string`&&(j.voiceLauncherLabel=e.voiceLauncherLabel),typeof e.launcherIcon==`string`&&(j.launcherIcon=ge(e.launcherIcon)),typeof e.launcherIconUrl==`string`&&(j.launcherIconUrl=_e(e.launcherIconUrl)),typeof e.animation==`string`&&(j.animation=I(e.animation),Q(x?`open`:`closed`)),typeof e.launcherPromptEnabled==`boolean`&&(j.launcherPromptEnabled=e.launcherPromptEnabled),typeof e.launcherPromptText==`string`&&(j.launcherPromptText=e.launcherPromptText),typeof e.launcherPromptDelaySeconds==`number`&&(j.launcherPromptDelaySeconds=B(e.launcherPromptDelaySeconds)),K(),we()},we=()=>{!b||E||(E=!0,J(),G())},J=()=>{if(!b||!E)return;let e=!x||!D;b.style.visibility=e?`visible`:`hidden`,b.style.display=e?`flex`:`none`,b.style.opacity=e?`1`:`0`,b.style.pointerEvents=e?`auto`:`none`,b.style.transform=`scale(1)`,G()},Y=document.currentScript;if(Y)N=Y.getAttribute(`data-organization-id`),P=Y.getAttribute(`data-agent-id`),F=Y.getAttribute(`data-position`)||e.DEFAULT_POSITION,j.animation=I(Y.getAttribute(`data-animation`));else{let t=document.querySelectorAll(`script[src*="embed"]`),n=Array.from(t).find(e=>e.hasAttribute(`data-organization-id`));n&&(N=n.getAttribute(`data-organization-id`),P=n.getAttribute(`data-agent-id`),F=n.getAttribute(`data-position`)||e.DEFAULT_POSITION,j.animation=I(n.getAttribute(`data-animation`)))}if(!N){console.error(`Echo Widget: data-organization-id attribute is required`);return}function X(){document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,Te):Te()}function Te(){Se(),b=document.createElement(`button`),b.id=`echo-widget-button`,b.style.cssText=`
      position: fixed;
      ${F===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
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
    `,K(),b.addEventListener(`click`,Ne),b.addEventListener(`mouseenter`,()=>{b&&(b.style.transform=`scale(1.05)`)}),b.addEventListener(`mouseleave`,()=>{b&&(b.style.transform=`scale(1)`)}),document.body.appendChild(b),w=document.createElement(`div`),w.id=`echo-widget-launcher-prompt`,w.setAttribute(`aria-hidden`,`true`),H(),document.body.appendChild(w),v=document.createElement(`div`),v.id=`echo-widget-container`,v.style.cssText=`
      position: fixed;
      ${F===`bottom-right`?`right: ${a}px;`:`left: ${a}px;`}
      bottom: ${a}px;
      width: ${ne}px;
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
      transform: ${M[j.animation].closedTransform};
      transform-origin: ${F===`bottom-right`?`bottom right`:`bottom left`};
      transition:
        opacity ${M[j.animation].duration}ms ${M[j.animation].easing},
        transform ${M[j.animation].duration}ms ${M[j.animation].easing},
        filter ${M[j.animation].duration}ms ${M[j.animation].easing},
        border-radius ${M[j.animation].duration}ms ${M[j.animation].easing};
      will-change: opacity, transform, filter, border-radius;
    `,y=document.createElement(`div`),y.setAttribute(`aria-hidden`,`true`),y.style.cssText=`
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
    `,_=document.createElement(`iframe`),_.src=je(),_.style.cssText=`
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      border: none;
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transform-origin: center;
      will-change: opacity, transform;
    `,_.allow=`microphone; clipboard-read; clipboard-write; autoplay`,v.appendChild(y),v.appendChild(_),document.body.appendChild(v),window.addEventListener(`message`,Me),Ee()}function Ee(){if(A)return;A=!0;let e=()=>{Oe(),k&&(window.removeEventListener(`pointerdown`,e),window.removeEventListener(`touchstart`,e),window.removeEventListener(`keydown`,e))};window.addEventListener(`pointerdown`,e,{passive:!0}),window.addEventListener(`touchstart`,e,{passive:!0}),window.addEventListener(`keydown`,e)}function De(){return O||(O=new Audio(`${e.WIDGET_URL}${me}`),O.preload=`auto`),O}function Oe(){if(!k)try{let e=De();e.muted=!0,e.currentTime=0;let t=e.play();if(!(t instanceof Promise))return;t.then(()=>{e.pause(),e.currentTime=0,e.muted=!1,k=!0,Ae()}).catch(()=>{e.muted=!1})}catch{}}function ke(){try{let e=De();e.muted=!1,e.currentTime=0,e.play().catch(()=>{})}catch{}}function Ae(){_?.contentWindow&&_.contentWindow.postMessage({type:`host-audio-ready`},new URL(e.WIDGET_URL).origin)}function je(){let t=new URLSearchParams;t.append(`organizationId`,N);let n=P?.trim();return n&&t.append(`agentId`,n),`${e.WIDGET_URL}?${t.toString()}`}function Me(t){if(t.origin!==new URL(e.WIDGET_URL).origin)return;let{type:n,payload:r}=t.data;switch(n){case`widget-ready`:k&&Ae();break;case`notification-sound`:ke();break;case`close`:$();break;case`resize`:r.height&&v&&(v.style.height=`${r.height}px`);break;case`widget-settings`:if(r){let e=r;typeof e.liveVoiceEnabled==`boolean`&&(D=e.liveVoiceEnabled,Q(x?`open`:`closed`)),e.appearance?q(e.appearance):K()}break}}function Ne(){x?$():Ve()}function Z(){return window.matchMedia?.(pe).matches??!1}function Pe(e){return Z()?0:D?e===`open`?oe:se:M[j.animation].duration}function Fe(e){return D?e===`open`?f:p:M[j.animation].easing}function Ie(e){if(D)return e===`open`?ae:ie;let t=M[j.animation];return e===`open`?t.openTransform:t.closedTransform}function Le(){!v||!b||(v.style.transformOrigin=F===`bottom-right`?`bottom right`:`bottom left`)}function Re(){if(!v)return;let e=x&&!D;v.style.width=`${ne}px`,v.style.bottom=`${e?ue:a}px`,v.style.maxHeight=`calc(100vh - ${e?de:le}px)`,v.style.height=`${D?re:d}px`}function ze(e,t=!1){if(!_)return;if(!D||t||Z()){_.style.opacity=`1`,_.style.transition=`none`,_.style.transform=`translate3d(0, 0, 0)`,_.style.filter=`blur(0px)`,D&&e===`closed`&&(_.style.opacity=`0`,_.style.transform=`translate3d(0, 10px, 0)`,_.style.filter=`blur(8px)`);return}let n=e===`open`?260:120,r=e===`open`?72:0,i=e===`open`?f:p;_.style.transition=`opacity ${n}ms ${i} ${r}ms, transform ${n}ms ${i} ${r}ms, filter ${n}ms ${i} ${r}ms`,_.style.opacity=e===`open`?`1`:`0`,_.style.transform=e===`open`?`translate3d(0, 0, 0)`:`translate3d(0, 10px, 0)`,_.style.filter=e===`open`?`blur(0px)`:`blur(8px)`}function Be(e,t=!1){if(!y)return;if(!D||t||Z()){y.style.opacity=`0`,y.style.transition=`none`,y.style.transform=`translate3d(0, 8px, 0)`;return}let n=e===`open`?220:120,r=e===`open`?42:0,i=e===`open`?f:p;y.style.transition=`opacity ${n}ms ${i} ${r}ms, transform ${n}ms ${i} ${r}ms`,y.style.opacity=e===`open`?`0`:`1`,y.style.transform=e===`open`?`translate3d(0, -4px, 0)`:`translate3d(0, 8px, 0)`}function Q(e,t={}){if(!v)return;let n=Pe(e),r=Fe(e),i=t.immediate||n===0,a=Ie(e),o=D&&e===`open`?`0 24px 70px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06)`:`0 4px 24px rgba(0, 0, 0, 0.15)`,s=D&&e===`closed`?ce:m;Re(),v.style.transition=i?`none`:`opacity ${n}ms ${r}, transform ${n}ms ${r}, filter ${n}ms ${r}, border-radius ${n}ms ${r}, box-shadow ${n}ms ${r}`,v.style.opacity=D||e===`open`?`1`:`0`,v.style.background=`#ffffff`,v.style.transform=a,v.style.filter=s,v.style.borderRadius=h,v.style.boxShadow=o,Be(e,i),ze(e,i)}function Ve(){v&&b&&(S!==null&&(window.clearTimeout(S),S=null),T=!0,U(),v.style.display=`block`,Le(),x=!0,Q(`closed`,{immediate:!0}),J(),window.requestAnimationFrame(()=>{window.requestAnimationFrame(()=>Q(`open`))}),K())}function $(){if(v&&b){S!==null&&(window.clearTimeout(S),S=null);let e=!D;x=!1;let t=D;t||Ce(),Le(),D&&b&&(b.style.visibility=`hidden`,b.style.opacity=`0`,b.style.pointerEvents=`none`),Q(`closed`),S=window.setTimeout(()=>{v&&!x&&(v.style.display=`none`),t?J():e&&b&&(b.style.pointerEvents=`auto`),S=null},Pe(`closed`))}}function He(){window.removeEventListener(`message`,Me),v&&(v.remove(),v=null,_=null,y=null),w&&=(w.remove(),null),b&&=(b.remove(),null),S!==null&&(window.clearTimeout(S),S=null),V(),x=!1,E=!1,D=!1,T=!1}function Ue(e){He(),e.organizationId&&(N=e.organizationId),e.agentId!==void 0&&(P=e.agentId),e.position&&(F=e.position),e.animation&&(j.animation=I(e.animation)),X()}window.EchoWidget={init:Ue,show:Ve,hide:$,destroy:He,setAppearance:q},X()})()})();