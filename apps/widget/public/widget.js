(function(){var e={WIDGET_URL:`https://osonflow-main-april-2026-widget.vercel.app`,DEFAULT_ORG_ID:`org_3CRWr58AdbEEnRYzfABrn1RdE7y`,DEFAULT_POSITION:`bottom-right`},t=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,n=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
  <path d="M5 3v4"></path>
  <path d="M3 5h4"></path>
</svg>`,r=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3"></path>
  <path d="M12 17h.01"></path>
</svg>`,i=20,a=48,o=34,s=18,c=380,l=640,ee=470,te=`translate3d(0, 26px, 0) scale(0.975)`,u=`translate3d(0, 0, 0) scale(1)`,ne=360,re=220,d=`cubic-bezier(0.16, 1, 0.3, 1)`,f=`cubic-bezier(0.4, 0, 1, 1)`,p=`blur(10px)`,m=`blur(0px)`,h=`30px`,g=i*2,_=`echo-widget-launcher-styles`,v=`(prefers-reduced-motion: reduce)`,y=`Talk with us`;(function(){let b=null,x=null,S=null,C=null,w=!1,T=null,E=!1,D=!1,O={launcherColor:`#3b82f6`,launcherLabel:`Chat with us`,voiceLauncherLabel:y,launcherIcon:`chat`,launcherIconUrl:``,animation:`slide-up`},k={"slide-up":{closedTransform:`translate3d(0, 18px, 0) scale(0.98)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:260,easing:`cubic-bezier(0.16, 1, 0.3, 1)`},scale:{closedTransform:`translate3d(0, 8px, 0) scale(0.92)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:240,easing:`cubic-bezier(0.2, 0.8, 0.2, 1)`},fade:{closedTransform:`translate3d(0, 0, 0) scale(1)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:200,easing:`ease`},pop:{closedTransform:`translate3d(0, 20px, 0) scale(0.86)`,openTransform:`translate3d(0, 0, 0) scale(1)`,duration:320,easing:`cubic-bezier(0.18, 1.35, 0.32, 1)`}},A=null,j=e.DEFAULT_POSITION,ie=e=>{switch(e){case`sparkles`:return n;case`question`:return r;default:return t}},M=e=>e===`sparkles`||e===`question`||e===`chat`?e:`chat`,N=e=>e===`slide-up`||e===`scale`||e===`fade`||e===`pop`?e:`slide-up`,P=e=>{if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e))return null;if(e.length===4){let[t,n,r,i]=e;return`${t}${n}${n}${r}${r}${i}${i}`}return e},F=e=>{let t=P(e);if(!t)return`#ffffff`;let n=parseInt(t.slice(1,3),16),r=parseInt(t.slice(3,5),16),i=parseInt(t.slice(5,7),16);return(.299*n+.587*r+.114*i)/255>.6?`#111111`:`#ffffff`},I=e=>{let t=P(e);return t?`rgba(${parseInt(t.slice(1,3),16)}, ${parseInt(t.slice(3,5),16)}, ${parseInt(t.slice(5,7),16)}, 0.35)`:`rgba(59, 130, 246, 0.35)`},L=e=>e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#039;`),ae=e=>`<img src="${L(e)}" alt="Launcher" style="width: ${a}px; height: ${a}px; border-radius: 50%; object-fit: cover; display: block;" />`,oe=()=>`
      <span class="echo-widget-voice-orb" aria-hidden="true">
        <span class="echo-widget-voice-orb__pulse"></span>
        <span class="echo-widget-voice-orb__gradient"></span>
        <span class="echo-widget-voice-orb__shine"></span>
        <span class="echo-widget-voice-orb__sweep"></span>
        <span class="echo-widget-voice-orb__core"></span>
        <span class="echo-widget-voice-orb__ripple"></span>
      </span>
    `,se=()=>{if(document.getElementById(_))return;let e=document.createElement(`style`);e.id=_,e.textContent=`
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
        width: ${o}px;
        height: ${o}px;
        flex: 0 0 ${o}px;
        overflow: hidden;
        border-radius: 50%;
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
    `,document.head.appendChild(e)},R=()=>{if(!C)return;if(w){C.classList.remove(`echo-widget-button--voice`),V();return}let e=D,t=e&&!w,n=t?O.voiceLauncherLabel.trim()||y:O.launcherLabel.trim(),r=!t&&!w&&O.launcherIconUrl.trim().length>0,i=!w&&(t||!r&&n.length>0),o=r?ae(O.launcherIconUrl):t?oe():ie(O.launcherIcon);C.classList.toggle(`echo-widget-button--voice`,t),C.style.width=i?`auto`:`${a}px`,C.style.padding=t?`0 22px 0 7px`:i?`0 ${s}px 0 8px`:`0`,C.style.borderRadius=i?`9999px`:`50%`,C.style.justifyContent=i?`flex-start`:`center`,C.style.background=e?`rgba(255, 255, 255, 0.94)`:O.launcherColor,C.style.color=e?`#0f172a`:F(O.launcherColor),C.style.boxShadow=e?`0 16px 36px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(15, 23, 42, 0.08)`:`0 4px 24px ${I(O.launcherColor)}`,C.style.animation=t?`echo-widget-voice-launcher-glow 2.8s ease-in-out infinite`:`none`,C.setAttribute(`aria-label`,w?e?`Close voice widget`:`Close chat widget`:i?n:`Open chat widget`),i?C.innerHTML=`${o}<span class="echo-widget-voice-label">${L(n)}</span>`:C.innerHTML=o,V()},z=e=>{typeof e.launcherColor==`string`&&e.launcherColor.trim()&&(O.launcherColor=e.launcherColor),typeof e.launcherLabel==`string`&&(O.launcherLabel=e.launcherLabel),typeof e.voiceLauncherLabel==`string`&&(O.voiceLauncherLabel=e.voiceLauncherLabel),typeof e.launcherIcon==`string`&&(O.launcherIcon=M(e.launcherIcon)),typeof e.launcherIconUrl==`string`&&(O.launcherIconUrl=e.launcherIconUrl.trim()),typeof e.animation==`string`&&(O.animation=N(e.animation),X(w?`open`:`closed`)),R(),B()},B=()=>{!C||E||(E=!0,V())},V=()=>{!C||!E||(C.style.visibility=w?`hidden`:`visible`,C.style.display=w?`none`:`flex`,C.style.opacity=w?`0`:`1`,C.style.pointerEvents=w?`none`:`auto`,C.style.transform=`scale(1)`)},H=document.currentScript;if(H)A=H.getAttribute(`data-organization-id`),j=H.getAttribute(`data-position`)||e.DEFAULT_POSITION,O.animation=N(H.getAttribute(`data-animation`));else{let t=document.querySelectorAll(`script[src*="embed"]`),n=Array.from(t).find(e=>e.hasAttribute(`data-organization-id`));n&&(A=n.getAttribute(`data-organization-id`),j=n.getAttribute(`data-position`)||e.DEFAULT_POSITION,O.animation=N(n.getAttribute(`data-animation`)))}if(!A){console.error(`Echo Widget: data-organization-id attribute is required`);return}function U(){document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,W):W()}function W(){se(),C=document.createElement(`button`),C.id=`echo-widget-button`,C.style.cssText=`
      position: fixed;
      ${j===`bottom-right`?`right: ${i}px;`:`left: ${i}px;`}
      bottom: ${i}px;
      width: auto;
      min-width: ${a}px;
      height: ${a}px;
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
    `,R(),C.addEventListener(`click`,ce),C.addEventListener(`mouseenter`,()=>{C&&(C.style.transform=`scale(1.05)`)}),C.addEventListener(`mouseleave`,()=>{C&&(C.style.transform=`scale(1)`)}),document.body.appendChild(C),x=document.createElement(`div`),x.id=`echo-widget-container`,x.style.cssText=`
      position: fixed;
      ${j===`bottom-right`?`right: ${i}px;`:`left: ${i}px;`}
      bottom: ${i}px;
      width: ${c}px;
      height: ${l}px;
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
      transform: ${k[O.animation].closedTransform};
      transform-origin: ${j===`bottom-right`?`bottom right`:`bottom left`};
      transition:
        opacity ${k[O.animation].duration}ms ${k[O.animation].easing},
        transform ${k[O.animation].duration}ms ${k[O.animation].easing},
        filter ${k[O.animation].duration}ms ${k[O.animation].easing},
        border-radius ${k[O.animation].duration}ms ${k[O.animation].easing};
      will-change: opacity, transform, filter, border-radius;
    `,S=document.createElement(`div`),S.setAttribute(`aria-hidden`,`true`),S.style.cssText=`
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
    `,b=document.createElement(`iframe`),b.src=G(),b.style.cssText=`
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      border: none;
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transform-origin: center;
      will-change: opacity, transform;
    `,b.allow=`microphone; clipboard-read; clipboard-write`,x.appendChild(S),x.appendChild(b),document.body.appendChild(x),window.addEventListener(`message`,K)}function G(){let t=new URLSearchParams;return t.append(`organizationId`,A),`${e.WIDGET_URL}?${t.toString()}`}function K(t){if(t.origin!==new URL(e.WIDGET_URL).origin)return;let{type:n,payload:r}=t.data;switch(n){case`close`:Q();break;case`resize`:r.height&&x&&(x.style.height=`${r.height}px`);break;case`widget-settings`:if(r){let e=r;typeof e.liveVoiceEnabled==`boolean`&&(D=e.liveVoiceEnabled,X(w?`open`:`closed`)),e.appearance?z(e.appearance):R()}break}}function ce(){w?Q():Z()}function q(){return window.matchMedia?.(v).matches??!1}function J(e){return q()?0:D?e===`open`?ne:re:k[O.animation].duration}function le(e){return D?e===`open`?d:f:k[O.animation].easing}function ue(e){if(D)return e===`open`?u:te;let t=k[O.animation];return e===`open`?t.openTransform:t.closedTransform}function Y(){!x||!C||(x.style.transformOrigin=j===`bottom-right`?`bottom right`:`bottom left`)}function de(){x&&(x.style.width=`${c}px`,x.style.height=`${D?ee:l}px`)}function fe(e,t=!1){if(!b)return;if(!D||t||q()){b.style.opacity=`1`,b.style.transition=`none`,b.style.transform=`translate3d(0, 0, 0)`,b.style.filter=`blur(0px)`,D&&e===`closed`&&(b.style.opacity=`0`,b.style.transform=`translate3d(0, 10px, 0)`,b.style.filter=`blur(8px)`);return}let n=e===`open`?260:120,r=e===`open`?72:0,i=e===`open`?d:f;b.style.transition=`opacity ${n}ms ${i} ${r}ms, transform ${n}ms ${i} ${r}ms, filter ${n}ms ${i} ${r}ms`,b.style.opacity=e===`open`?`1`:`0`,b.style.transform=e===`open`?`translate3d(0, 0, 0)`:`translate3d(0, 10px, 0)`,b.style.filter=e===`open`?`blur(0px)`:`blur(8px)`}function pe(e,t=!1){if(!S)return;if(!D||t||q()){S.style.opacity=`0`,S.style.transition=`none`,S.style.transform=`translate3d(0, 8px, 0)`;return}let n=e===`open`?220:120,r=e===`open`?42:0,i=e===`open`?d:f;S.style.transition=`opacity ${n}ms ${i} ${r}ms, transform ${n}ms ${i} ${r}ms`,S.style.opacity=e===`open`?`0`:`1`,S.style.transform=e===`open`?`translate3d(0, -4px, 0)`:`translate3d(0, 8px, 0)`}function X(e,t={}){if(!x)return;let n=J(e),r=le(e),i=t.immediate||n===0,a=ue(e),o=D&&e===`open`?`0 24px 70px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06)`:`0 4px 24px rgba(0, 0, 0, 0.15)`,s=D&&e===`closed`?p:m;de(),x.style.transition=i?`none`:`opacity ${n}ms ${r}, transform ${n}ms ${r}, filter ${n}ms ${r}, border-radius ${n}ms ${r}, box-shadow ${n}ms ${r}`,x.style.opacity=D||e===`open`?`1`:`0`,x.style.background=`#ffffff`,x.style.transform=a,x.style.filter=s,x.style.borderRadius=h,x.style.boxShadow=o,pe(e,i),fe(e,i)}function Z(){x&&C&&(T!==null&&(window.clearTimeout(T),T=null),x.style.display=`block`,Y(),X(`closed`,{immediate:!0}),w=!0,V(),window.requestAnimationFrame(()=>{window.requestAnimationFrame(()=>X(`open`))}),R())}function Q(){if(x&&C){T!==null&&(window.clearTimeout(T),T=null),w=!1;let e=D;R(),Y(),e&&C&&(C.style.visibility=`hidden`,C.style.opacity=`0`,C.style.pointerEvents=`none`),X(`closed`),T=window.setTimeout(()=>{x&&!w&&(x.style.display=`none`),e&&V(),T=null},J(`closed`))}}function $(){window.removeEventListener(`message`,K),x&&(x.remove(),x=null,b=null,S=null),C&&=(C.remove(),null),T!==null&&(window.clearTimeout(T),T=null),w=!1,E=!1,D=!1}function me(e){$(),e.organizationId&&(A=e.organizationId),e.position&&(j=e.position),e.animation&&(O.animation=N(e.animation)),U()}window.EchoWidget={init:me,show:Z,hide:Q,destroy:$,setAppearance:z},U()})()})();