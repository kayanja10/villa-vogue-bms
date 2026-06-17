// VILLA VOGUE CUSTOMER PORTAL — LUXURY EDITION v2.0
// Dark/Light Mode | Staff Login | All Features Preserved

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

// Native IntersectionObserver — works with ANY framer-motion version
function useInView(ref, { once = true, margin = "0px" } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin: margin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, once, margin]);
  return inView;
}

const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);
const ToastCtx = createContext();
const useToast = () => useContext(ToastCtx);

// Inject styles ONCE at module load time — never removed — so navigating away
// and back (or any React remount) can never wipe out the CSS and blank the page.
(() => {
  if (typeof document === "undefined" || document.getElementById("vv-g")) return;
  const s = document.createElement("style");
  s.id = "vv-g";
  s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;1,400&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{--gold:#C9A84C;--gold-l:#E8C96B;--gold-d:#9A7A2F;--gg:rgba(201,168,76,.35);--rxl:28px;--sl:0 20px 60px rgba(0,0,0,.18),0 4px 16px rgba(201,168,76,.1);--tr:all .35s cubic-bezier(.4,0,.2,1);--fd:'Cormorant Garamond',Georgia,serif;--fb:'DM Sans',sans-serif;--fe:'Playfair Display',Georgia,serif}
      body{font-family:var(--fb);overflow-x:hidden}
      body.vv-dark{--bp:#0D0D0D;--bs:#141414;--bt:#1C1C1C;--bc:rgba(255,255,255,.04);--bch:rgba(255,255,255,.07);--bg:rgba(20,20,20,.85);--bgs:rgba(10,10,10,.96);--br:rgba(255,255,255,.08);--brg:rgba(201,168,76,.3);--tp:#F5F0E8;--ts:rgba(245,240,232,.65);--tm:rgba(245,240,232,.38);--nb:rgba(13,13,13,.92);--ib:rgba(255,255,255,.06);--ov:rgba(0,0,0,.75);--s1:#1C1C1C;--s2:#2A2A2A}
      body.vv-light{--bp:#FAF7F2;--bs:#F2EDE3;--bt:#EDEAE2;--bc:rgba(255,255,255,.75);--bch:rgba(255,255,255,.95);--bg:rgba(250,247,242,.88);--bgs:rgba(250,247,242,.98);--br:rgba(0,0,0,.08);--brg:rgba(201,168,76,.35);--tp:#1A1A1A;--ts:rgba(26,26,26,.65);--tm:rgba(26,26,26,.38);--nb:rgba(250,247,242,.92);--ib:rgba(0,0,0,.04);--ov:rgba(0,0,0,.5);--s1:#E8E3DA;--s2:#F5F0E8}
      .vv-portal{background:var(--bp);color:var(--tp);min-height:100vh;transition:background .4s,color .4s}
      ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:var(--bs)}::-webkit-scrollbar-thumb{background:var(--gold);border-radius:10px}
      ::selection{background:var(--gold);color:#000}
      .vv-nav{position:fixed;top:0;left:0;right:0;z-index:1000;background:var(--nb);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border-bottom:1px solid var(--br);transition:var(--tr)}
      .vv-nav.sc{box-shadow:0 4px 30px rgba(0,0,0,.15),0 1px 0 var(--brg)}
      .gc{background:var(--bc);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid var(--br);border-radius:var(--rxl);transition:var(--tr)}
      .gc:hover{background:var(--bch);border-color:var(--brg);box-shadow:var(--sl);transform:translateY(-4px)}
      .bg{background:linear-gradient(135deg,var(--gold-d) 0%,var(--gold) 50%,var(--gold-l) 100%);color:#000;border:none;border-radius:50px;font-family:var(--fb);font-weight:600;letter-spacing:.08em;cursor:pointer;transition:var(--tr)}
      .bg:hover{transform:translateY(-2px);box-shadow:0 8px 30px var(--gg)}.bg:active{transform:translateY(0)}
      .bgh{background:transparent;color:var(--tp);border:1px solid var(--br);border-radius:50px;font-family:var(--fb);cursor:pointer;transition:var(--tr)}
      .bgh:hover{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,.08)}
      .pc{background:var(--bc);border:1px solid var(--br);border-radius:var(--rxl);overflow:hidden;cursor:pointer;transition:all .4s cubic-bezier(.4,0,.2,1);position:relative}
      .pc:hover{transform:translateY(-8px) scale(1.01);box-shadow:0 30px 60px rgba(0,0,0,.2),0 0 0 1px var(--brg)}
      .pc .co{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 60%);opacity:0;transition:opacity .3s}.pc:hover .co{opacity:1}
      .pc .ca{position:absolute;bottom:16px;left:16px;right:16px;display:flex;gap:8px;transform:translateY(16px);opacity:0;transition:all .3s cubic-bezier(.4,0,.2,1)}.pc:hover .ca{transform:translateY(0);opacity:1}
      .hs{min-height:100vh;background:var(--bs);position:relative;overflow:hidden;display:flex;align-items:center}
      .vi{background:var(--ib);border:1px solid var(--br);border-radius:12px;color:var(--tp);font-family:var(--fb);transition:var(--tr);outline:none}
      .vi:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gg)}.vi::placeholder{color:var(--tm)}
      .lb{background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#000;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:3px 10px;border-radius:50px}
      .sb{background:linear-gradient(135deg,#FF4040,#FF7B00);color:#fff;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:50px}
      .vt{background:linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.05));border:1px solid rgba(201,168,76,.4);backdrop-filter:blur(20px);border-radius:14px;color:var(--tp);padding:14px 20px;font-family:var(--fb);min-width:280px;box-shadow:0 8px 32px rgba(0,0,0,.2)}
      .vd{position:fixed;top:0;right:0;bottom:0;width:min(440px,95vw);background:var(--bgs);backdrop-filter:blur(32px) saturate(200%);-webkit-backdrop-filter:blur(32px) saturate(200%);border-left:1px solid var(--br);z-index:2000;overflow-y:auto;box-shadow:-20px 0 60px rgba(0,0,0,.3)}
      .mb{position:fixed;inset:0;background:var(--ov);backdrop-filter:blur(8px);z-index:1800;display:flex;align-items:center;justify-content:center;padding:20px}
      .vm{background:var(--bgs);backdrop-filter:blur(32px);border:1px solid var(--br);border-radius:var(--rxl);width:100%;max-width:900px;max-height:90vh;overflow-y:auto;box-shadow:var(--sl)}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes sh{0%{background-position:-400px 0}100%{background-position:400px 0}}
      .sk{background:linear-gradient(90deg,var(--s1) 25%,var(--s2) 50%,var(--s1) 75%);background-size:400px 100%;animation:sh 1.6s ease-in-out infinite;border-radius:8px}
      .gd{height:1px;background:linear-gradient(to right,transparent,var(--gold),transparent)}
      .ts{position:relative;padding-left:36px}.ts::before{content:'';position:absolute;left:10px;top:28px;width:2px;bottom:-12px;background:var(--br)}.ts:last-child::before{display:none}
      .td{position:absolute;left:0;top:4px;width:22px;height:22px;border-radius:50%;background:var(--br);border:2px solid var(--br);display:flex;align-items:center;justify-content:center}
      .td.on{background:var(--gold);border-color:var(--gold);box-shadow:0 0 12px var(--gg)}
      .mm{position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);background:var(--bgs);backdrop-filter:blur(32px);border:1px solid var(--br);border-radius:var(--rxl);box-shadow:var(--sl);min-width:560px;padding:24px;z-index:999}
      @keyframes hp{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}.hp{animation:hp .35s ease}
      .t1{background:linear-gradient(135deg,#8B5E3C,#C4895A)}.t2{background:linear-gradient(135deg,#71787F,#B0B8C1)}.t3{background:linear-gradient(135deg,var(--gold-d),var(--gold-l))}.t4{background:linear-gradient(135deg,#3A3A3A,#888)}.t5{background:linear-gradient(135deg,#1a0533,#7B2FBE)}
      .wf{position:fixed;bottom:28px;right:28px;z-index:1500;width:58px;height:58px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(37,211,102,.45);cursor:pointer;transition:var(--tr);text-decoration:none}
      .wf:hover{transform:scale(1.12);box-shadow:0 12px 40px rgba(37,211,102,.55)}
      .tt{width:48px;height:26px;background:var(--ib);border:1px solid var(--br);border-radius:50px;cursor:pointer;position:relative;transition:var(--tr);flex-shrink:0}
      .tt.dark{background:rgba(201,168,76,.2);border-color:var(--gold)}.tt-th{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--gold);transition:transform .3s cubic-bezier(.4,0,.2,1)}.tt.dark .tt-th{transform:translateX(22px)}
      .vf{background:var(--bs);border-top:1px solid var(--br);padding:60px 0 30px}
      .sl{font-family:var(--fd);font-weight:300;letter-spacing:.02em;color:var(--tp)}
      .ll{font-family:var(--fb);font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}
      .vp{height:3px;background:var(--br);border-radius:10px;overflow:hidden}.vp-f{height:100%;background:linear-gradient(90deg,var(--gold-d),var(--gold-l));border-radius:10px;transition:width .5s ease}
      .mmo{position:fixed;inset:0;z-index:1900;background:var(--bgs);backdrop-filter:blur(32px);overflow-y:auto}
      @media(max-width:900px){.dn{display:none!important}}
      @media(max-width:768px){.mm{min-width:calc(100vw - 32px)}.vd{width:100vw}.vm>div{grid-template-columns:1fr!important}}
    `;
  document.head.appendChild(s);
})();

// No-op component — styles are already injected above
const GlobalStyles = () => null;

const IC = ({ n, sz=20, c="currentColor" }) => {
  const ic = {
    sun:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    moon:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    search:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    cart:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
    heart:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    hf:<svg width={sz} height={sz} fill={c} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    user:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    x:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    menu:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    cd:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
    cr:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
    star:<svg width={sz} height={sz} fill={c} viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    truck:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    check:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
    pkg:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    eye:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    plus:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    minus:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    award:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
    gift:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
    lock:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    shield:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    pin:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    cog:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    staff:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    tag:<svg width={sz} height={sz} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    wa:<svg width={sz} height={sz} fill={c} viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  };
  return <span style={{display:"inline-flex",alignItems:"center"}}>{ic[n]||null}</span>;
};

const ToastProvider = ({children}) => {
  const [ts,setTs] = useState([]);
  const show = useCallback((msg,_t="ok",icon="✦") => {
    const id = Date.now();
    setTs(t=>[...t,{id,msg,icon}]);
    setTimeout(()=>setTs(t=>t.filter(x=>x.id!==id)),3500);
  },[]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",gap:10,alignItems:"center",pointerEvents:"none"}}>
        <AnimatePresence>
          {ts.map(t=>(
            <motion.div key={t.id} className="vt" initial={{opacity:0,y:20,scale:.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10,scale:.95}}
              style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{color:"var(--gold)",fontSize:18}}>{t.icon}</span>
              <span style={{fontSize:14,fontWeight:500}}>{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};

const Stars = ({r=4.5,count,sz=14}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
    {[1,2,3,4,5].map(i=><IC key={i} n="star" sz={sz} c={i<=Math.floor(r)?"var(--gold)":"var(--tm)"}/>)}
    {count!==undefined&&<span style={{fontSize:12,color:"var(--tm)",marginLeft:4}}>({count})</span>}
  </span>
);

const Reveal = ({children,delay=0,y=30}) => {
  const ref=useRef(null);
  const iv=useInView(ref,{once:true,margin:"-60px"});
  return <motion.div ref={ref} initial={{opacity:0,y}} animate={iv?{opacity:1,y:0}:{}} transition={{duration:.7,delay,ease:[.4,0,.2,1]}}>{children}</motion.div>;
};

const SkCard = () => (
  <div style={{borderRadius:"var(--rxl)",overflow:"hidden",background:"var(--bc)",border:"1px solid var(--br)"}}>
    <div className="sk" style={{height:280}}/>
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
      <div className="sk" style={{height:14,width:"60%"}}/><div className="sk" style={{height:12,width:"40%"}}/><div className="sk" style={{height:18,width:"30%"}}/>
    </div>
  </div>
);

const ThemeToggle = () => {
  const {theme,toggleTheme}=useTheme();
  return (
    <motion.div className={`tt ${theme}`} onClick={toggleTheme} whileTap={{scale:.9}}
      title={`Switch to ${theme==="dark"?"light":"dark"} mode`} style={{cursor:"pointer"}}>
      <div className="tt-th"/>
    </motion.div>
  );
};

const Navbar = ({user,cart,wishlist,onLogin,onStaffLogin,onCartOpen,onSearchOpen,onWishlistOpen,onAccountOpen}) => {
  const {scrollY}=useScroll();
  const [sc,setSc]=useState(false);
  const [mg,setMg]=useState(null);
  const [mo,setMo]=useState(false);
  useEffect(()=>{const u=scrollY.onChange(v=>setSc(v>30));return u;},[scrollY]);
  const nl=[
    {l:"Women",s:["Dresses","Tops","Skirts","Pants","Knitwear","Blazers"]},
    {l:"Men",s:["Shirts","Trousers","Jackets","Suits","Casual","Formal"]},
    {l:"Accessories",s:["Bags","Shoes","Jewelry","Belts","Scarves","Sunglasses"]},
    {l:"Collections",s:["New Arrivals","Best Sellers","Wedding","Corporate","Luxury","Sale"]},
  ];
  const cartQty = cart.reduce((a,i)=>a+i.qty,0);
  return (
    <>
      <nav className={`vv-nav ${sc?"sc":""}`}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 20px",height:68,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <motion.button onClick={()=>setMo(true)} whileTap={{scale:.9}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--ts)",padding:6,display:"flex"}}><IC n="menu" sz={20}/></motion.button>
            <div className="dn" style={{display:"flex",gap:2}}>
              {nl.map(link=>(
                <div key={link.l} style={{position:"relative"}} onMouseEnter={()=>setMg(link.l)} onMouseLeave={()=>setMg(null)}>
                  <button style={{background:"none",border:"none",cursor:"pointer",color:mg===link.l?"var(--gold)":"var(--ts)",fontFamily:"var(--fb)",fontSize:13,fontWeight:500,letterSpacing:".04em",padding:"8px 12px",borderRadius:8,display:"flex",alignItems:"center",gap:4,transition:"color .2s"}}>
                    {link.l} <IC n="cd" sz={11}/>
                  </button>
                  <AnimatePresence>
                    {mg===link.l&&(
                      <motion.div className="mm" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.18}}>
                        <p className="ll" style={{marginBottom:14}}>{link.l}</p>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                          {link.s.map(s=>(
                            <a key={s} href={`/store?category=${s.toLowerCase().replace(/ /g,"-")}`}
                              style={{color:"var(--ts)",textDecoration:"none",fontSize:13,padding:"8px 12px",borderRadius:8,transition:"all .2s"}}
                              onMouseEnter={e=>{e.target.style.color="var(--gold)";e.target.style.background="rgba(201,168,76,.08)"}}
                              onMouseLeave={e=>{e.target.style.color="var(--ts)";e.target.style.background="transparent"}}>{s}</a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          <a href="/store" style={{textDecoration:"none",flexShrink:0}}>
            <motion.div whileHover={{scale:1.03}} style={{textAlign:"center"}}>
              <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:300,letterSpacing:".25em",color:"var(--tp)",lineHeight:1}}>VILLA VOGUE</div>
              <div style={{fontSize:8,letterSpacing:".35em",color:"var(--gold)",textTransform:"uppercase",fontFamily:"var(--fb)",fontWeight:600,marginTop:2}}>Luxury Fashion</div>
            </motion.div>
          </a>

          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <ThemeToggle/>
            {[{fn:onSearchOpen,ic:"search",b:0},{fn:onWishlistOpen,ic:"heart",b:wishlist.length},{fn:onCartOpen,ic:"cart",b:cartQty}].map(({fn,ic,b})=>(
              <motion.button key={ic} onClick={fn} whileTap={{scale:.9}}
                style={{background:"none",border:"none",cursor:"pointer",color:"var(--ts)",padding:7,display:"flex",position:"relative"}}>
                <IC n={ic} sz={18}/>
                {b>0&&<motion.span key={b} initial={{scale:0}} animate={{scale:1}}
                  style={{position:"absolute",top:1,right:1,background:"var(--gold)",color:"#000",fontSize:10,fontWeight:700,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{b}</motion.span>}
              </motion.button>
            ))}
            {user?(
              <motion.button onClick={onAccountOpen} whileTap={{scale:.9}} style={{background:"none",border:"none",cursor:"pointer",padding:0,marginLeft:2}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,var(--gold-d),var(--gold))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#000"}}>
                  {user.name?.[0]?.toUpperCase()||"U"}
                </div>
              </motion.button>
            ):(
              <motion.button className="bg" onClick={onLogin} whileTap={{scale:.96}}
                style={{padding:"7px 16px",fontSize:12,display:"flex",alignItems:"center",gap:5,marginLeft:2}}>
                <IC n="user" sz={12}/> Sign In
              </motion.button>
            )}
            <motion.button onClick={onStaffLogin} whileTap={{scale:.95}}
              style={{background:"transparent",border:"1px solid rgba(201,168,76,.4)",borderRadius:50,color:"var(--gold)",fontFamily:"var(--fb)",fontSize:11,fontWeight:600,letterSpacing:".06em",cursor:"pointer",padding:"6px 13px",display:"flex",alignItems:"center",gap:5,transition:"var(--tr)",marginLeft:2}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(201,168,76,.12)"}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}
              title="Staff Portal Login">
              <IC n="staff" sz={12}/> Staff
            </motion.button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mo&&(
          <motion.div className="mmo" initial={{x:"-100%"}} animate={{x:0}} exit={{x:"-100%"}} transition={{type:"spring",damping:26,stiffness:260}}>
            <div style={{padding:24}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
                <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:300,letterSpacing:".2em"}}>VILLA VOGUE</div>
                <button onClick={()=>setMo(false)} style={{background:"var(--ib)",border:"1px solid var(--br)",borderRadius:8,padding:8,cursor:"pointer",color:"var(--tp)"}}><IC n="x" sz={17}/></button>
              </div>
              {nl.map((link,i)=>(
                <motion.div key={link.l} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*.06}} style={{padding:"14px 0",borderBottom:"1px solid var(--br)"}}>
                  <div style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:300,marginBottom:8}}>{link.l}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                    {link.s.map(s=>(
                      <a key={s} href={`/store?category=${s.toLowerCase().replace(/ /g,"-")}`}
                        style={{color:"var(--tm)",textDecoration:"none",fontSize:12,padding:"4px 10px",borderRadius:50,background:"var(--ib)",border:"1px solid var(--br)"}}>{s}</a>
                    ))}
                  </div>
                </motion.div>
              ))}
              <div style={{marginTop:28,display:"flex",flexDirection:"column",gap:10}}>
                {!user?(
                  <>
                    <button className="bg" onClick={()=>{onLogin();setMo(false)}} style={{padding:"13px",fontSize:14,width:"100%",textAlign:"center"}}>Sign In</button>
                    <button className="bgh" onClick={()=>{onStaffLogin();setMo(false)}}
                      style={{padding:"13px",fontSize:13,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:7,color:"var(--gold)",borderColor:"rgba(201,168,76,.4)"}}>
                      <IC n="staff" sz={14}/> Staff Login
                    </button>
                  </>
                ):(
                  <button className="bgh" onClick={()=>{onAccountOpen();setMo(false)}}
                    style={{padding:"13px",fontSize:14,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                    <IC n="user" sz={14}/> My Account
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const SearchOverlay = ({open,onClose,products=[]}) => {
  const [q,setQ]=useState("");
  const [res,setRes]=useState([]);
  const ir=useRef(null);
  const db=useRef(null);
  // Normalize backend fields for search results
  const normProds=products.map(p=>({...p,
    image_url:p.image_url||(()=>{try{const a=JSON.parse(p.images||"[]");return a[0]||null;}catch{return null;}})(),
  }));
  useEffect(()=>{if(open)setTimeout(()=>ir.current?.focus(),100);else setQ("");},[open]);
  useEffect(()=>{
    clearTimeout(db.current);
    db.current=setTimeout(()=>{
      if(q.length>1)setRes(normProds.filter(p=>p.name?.toLowerCase().includes(q.toLowerCase())).slice(0,6));
      else setRes([]);
    },250);
  },[q,products]);
  const pop=["Luxury Dresses","Wedding Collection","Corporate Attire","Accessories","New Arrivals","Sale"];
  if(!open)return null;
  return (
    <motion.div className="mb" onClick={e=>e.target===e.currentTarget&&onClose()} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <motion.div initial={{opacity:0,y:-30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-30}}
        style={{width:"100%",maxWidth:640,background:"var(--bgs)",backdropFilter:"blur(32px)",border:"1px solid var(--br)",borderRadius:"var(--rxl)",padding:24,boxShadow:"var(--sl)"}}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
          <IC n="search" sz={19} c="var(--gold)"/>
          <input ref={ir} className="vi" value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search Villa Vogue…" style={{flex:1,padding:"11px 14px",fontSize:15,border:"none",background:"transparent"}}/>
          <button onClick={onClose} style={{background:"var(--ib)",border:"1px solid var(--br)",borderRadius:8,padding:8,cursor:"pointer",color:"var(--ts)"}}><IC n="x" sz={15}/></button>
        </div>
        {q.length===0&&(
          <div>
            <p className="ll" style={{marginBottom:12}}>Popular</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {pop.map(s=><button key={s} onClick={()=>setQ(s)} className="bgh" style={{padding:"6px 14px",fontSize:12}}>{s}</button>)}
            </div>
          </div>
        )}
        {res.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <p className="ll" style={{marginBottom:4}}>Results</p>
            {res.map(p=>(
              <a key={p.id} href={`/store/product/${p.id}`}
                style={{display:"flex",gap:14,alignItems:"center",padding:"10px 12px",borderRadius:12,background:"var(--bc)",border:"1px solid var(--br)",textDecoration:"none",transition:"all .2s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="var(--brg)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--br)"}>
                {p.image_url&&<img src={p.image_url} alt={p.name} style={{width:48,height:48,objectFit:"cover",borderRadius:8}}/>}
                <div>
                  <div style={{fontSize:14,fontWeight:500,color:"var(--tp)"}}>{p.name}</div>
                  <div style={{fontSize:12,color:"var(--gold)",fontWeight:600}}>UGX {Number(p.price).toLocaleString()}</div>
                </div>
              </a>
            ))}
          </div>
        )}
        {q.length>1&&res.length===0&&(
          <div style={{textAlign:"center",padding:"24px 0",color:"var(--tm)"}}>
            <p style={{fontFamily:"var(--fd)",fontSize:20}}>No results found</p>
            <p style={{fontSize:13,marginTop:6}}>Try different keywords</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const ProductCard = ({product:p,onAddToCart,onQuickView,onWishlistToggle,wishlisted}) => {
  const toast=useToast();
  const [ha,setHa]=useState(false);
  const wl=e=>{e.stopPropagation();setHa(true);setTimeout(()=>setHa(false),400);onWishlistToggle(p);toast(wishlisted?"Removed from wishlist":"Added to wishlist","i","♥");};
  const ac=e=>{e.stopPropagation();onAddToCart(p);toast(`${p.name} added to cart`,"ok","✦");};
  return (
    <div className="pc" onClick={()=>onQuickView(p)}>
      <div style={{position:"relative",overflow:"hidden",height:280,background:"var(--bt)"}}>
        {p.image_url
          ?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform .5s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.07)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
          :<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:"var(--fd)",fontSize:32,opacity:.2}}>VV</span></div>
        }
        <div className="co"/>
        <div style={{position:"absolute",top:12,left:12,display:"flex",flexDirection:"column",gap:5}}>
          {p.is_new&&<span className="lb">New</span>}
          {p.is_sale&&<span className="sb">Sale</span>}
          {p.stock_quantity>0&&p.stock_quantity<5&&<span style={{background:"rgba(255,100,50,.9)",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:50}}>Only {p.stock_quantity} left</span>}
        </div>
        <motion.button onClick={wl} className={ha?"hp":""} whileTap={{scale:.85}}
          style={{position:"absolute",top:12,right:12,width:34,height:34,borderRadius:"50%",background:"var(--bg)",backdropFilter:"blur(10px)",border:"1px solid var(--br)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:2}}>
          <IC n={wishlisted?"hf":"heart"} sz={15} c={wishlisted?"var(--gold)":"var(--ts)"}/>
        </motion.button>
        <div className="ca">
          <motion.button className="bg" onClick={ac} whileTap={{scale:.95}}
            style={{flex:1,padding:"9px",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <IC n="cart" sz={12}/> Add to Cart
          </motion.button>
          <motion.button onClick={e=>{e.stopPropagation();onQuickView(p)}} whileTap={{scale:.95}}
            style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <IC n="eye" sz={14} c="#fff"/>
          </motion.button>
        </div>
      </div>
      <div style={{padding:"14px 16px 18px"}}>
        <p style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--tm)",marginBottom:4,fontWeight:600}}>{p.category||"Fashion"}</p>
        <h3 style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:400,color:"var(--tp)",marginBottom:6,lineHeight:1.3}}>{p.name}</h3>
        <div style={{marginBottom:8}}><Stars r={p.rating||4.2} count={p.review_count}/></div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <span style={{fontSize:17,fontWeight:700,color:"var(--gold)"}}>UGX {Number(p.price).toLocaleString()}</span>
            {p.original_price&&<span style={{fontSize:12,color:"var(--tm)",textDecoration:"line-through",marginLeft:7}}>UGX {Number(p.original_price).toLocaleString()}</span>}
          </div>
          {p.stock_quantity===0&&<span style={{fontSize:11,color:"var(--tm)",fontStyle:"italic"}}>Out of Stock</span>}
        </div>
      </div>
    </div>
  );
};

const QuickViewModal = ({product:p,open,onClose,onAddToCart,onOrderOnline}) => {
  const toast=useToast();
  const [qty,setQty]=useState(1);
  const [size,setSize]=useState("");
  const [color,setColor]=useState("");
  const [ordering,setOrdering]=useState(false);
  const szs=["XS","S","M","L","XL","XXL"];
  const cls=["#1A1A1A","#F5F0E8","#8B5E3C","#C9A84C","#3A3A6A","#8B3A3A"];
  if(!p)return null;

  const waText = encodeURIComponent(
    `Hello Villa Vogue! 🛍️\n\nI'd like to order:\n• ${p.name}${size?` (Size: ${size})`:""}${color?` (Color: ${color})`:""}  x${qty} — UGX ${(Number(p.price)*qty).toLocaleString()}\n\n*Total: UGX ${(Number(p.price)*qty).toLocaleString()}*\n\nPlease confirm availability. Thank you!`
  );

  // Place a direct single-product online order without going through the cart
  const handleOrderOnline = async () => {
    setOrdering(true);
    try {
      onClose();
      // Pass product directly to checkout modal pre-filled
      onOrderOnline?.({...p, qty, selectedSize:size, selectedColor:color});
    } finally {
      setOrdering(false);
    }
  };

  return (
    <AnimatePresence>
      {open&&(
        <motion.div className="mb" onClick={e=>e.target===e.currentTarget&&onClose()} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
          <motion.div className="vm" initial={{opacity:0,scale:.94,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96,y:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",minHeight:460}}>
              <div style={{background:"var(--bt)",position:"relative",overflow:"hidden",borderRadius:"var(--rxl) 0 0 var(--rxl)"}}>
                {p.image_url?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  :<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:"var(--fd)",fontSize:48,opacity:.2}}>VV</span></div>}
                {p.is_new&&<span className="lb" style={{position:"absolute",top:14,left:14}}>New Arrival</span>}
              </div>
              <div style={{padding:"28px 24px",display:"flex",flexDirection:"column",position:"relative",overflowY:"auto"}}>
                <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"var(--ib)",border:"1px solid var(--br)",borderRadius:8,padding:7,cursor:"pointer",color:"var(--ts)"}}><IC n="x" sz={15}/></button>
                <p className="ll" style={{marginBottom:5}}>{p.category}</p>
                <h2 style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:400,lineHeight:1.2,marginBottom:8}}>{p.name}</h2>
                <Stars r={p.rating||4.2} count={p.review_count||0} sz={14}/>
                <div style={{margin:"10px 0"}}><span style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:500,color:"var(--gold)"}}>UGX {Number(p.price).toLocaleString()}</span></div>
                <p style={{fontSize:12,color:"var(--ts)",lineHeight:1.7,marginBottom:12}}>{p.description||"Premium quality fashion piece crafted with meticulous attention to detail. A timeless addition to your wardrobe."}</p>
                <div style={{marginBottom:12}}>
                  <p style={{fontSize:11,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"var(--tm)",marginBottom:7}}>Size</p>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {szs.map(s=><button key={s} onClick={()=>setSize(s)} style={{width:36,height:36,borderRadius:8,background:size===s?"var(--gold)":"var(--ib)",border:`1px solid ${size===s?"var(--gold)":"var(--br)"}`,color:size===s?"#000":"var(--tp)",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .2s"}}>{s}</button>)}
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <p style={{fontSize:11,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"var(--tm)",marginBottom:7}}>Color</p>
                  <div style={{display:"flex",gap:6}}>
                    {cls.map(c=><button key={c} onClick={()=>setColor(c)} style={{width:24,height:24,borderRadius:"50%",background:c,border:"2px solid transparent",cursor:"pointer",outline:color===c?"2px solid var(--gold)":"none",outlineOffset:2,transition:"all .2s"}}/>)}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:30,height:30,borderRadius:8,background:"var(--ib)",border:"1px solid var(--br)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IC n="minus" sz={12}/></button>
                  <span style={{fontSize:14,fontWeight:600,width:24,textAlign:"center"}}>{qty}</span>
                  <button onClick={()=>setQty(q=>q+1)} style={{width:30,height:30,borderRadius:8,background:"var(--ib)",border:"1px solid var(--br)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IC n="plus" sz={12}/></button>
                  <span style={{fontSize:11,color:"var(--tm)",marginLeft:4}}>
                    {p.stock_quantity>0?`${p.stock_quantity} in stock`:<span style={{color:"#e74c3c"}}>Out of stock</span>}
                  </span>
                </div>

                {/* Add to Cart */}
                <motion.button className="bgh" onClick={()=>{onAddToCart({...p,qty,selectedSize:size,selectedColor:color});toast(`${p.name} added to cart ✦`);onClose();}} whileTap={{scale:.97}}
                  style={{padding:"11px",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:8}}>
                  <IC n="cart" sz={13}/> Add to Cart
                </motion.button>

                {/* ORDER ONLINE — goes directly to orders + notification */}
                <motion.button className="bg" onClick={handleOrderOnline} disabled={ordering||p.stock_quantity===0} whileTap={{scale:.97}}
                  style={{padding:"12px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:8,fontWeight:700,opacity:p.stock_quantity===0?.5:1}}>
                  <IC n="lock" sz={14}/> Order Online — UGX {(Number(p.price)*qty).toLocaleString()}
                </motion.button>

                {/* ORDER VIA WHATSAPP */}
                <a href={`https://wa.me/256782860372?text=${waText}`} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                  <motion.button whileTap={{scale:.97}}
                    style={{width:"100%",padding:"11px",background:"#25D366",color:"#fff",border:"none",borderRadius:50,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontSize:13,fontWeight:600}}>
                    <IC n="wa" sz={14} c="#fff"/> Order via WhatsApp
                  </motion.button>
                </a>

                <p style={{fontSize:10,color:"var(--tm)",textAlign:"center",marginTop:10}}>
                  🔒 Online orders go directly to our system · WhatsApp for instant chat
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── WhatsApp cart share helper ───────────────────────────────────────────────
const buildWhatsAppCartMsg = (cart,total) => {
  const lines = cart.map(i=>`• ${i.name}${i.selectedSize?` (${i.selectedSize})`:""} x${i.qty} — UGX ${(Number(i.price)*i.qty).toLocaleString()}`).join("\n");
  return encodeURIComponent(`Hello Villa Vogue! 🛍️\n\nI'd like to place an order:\n\n${lines}\n\n*Total: UGX ${total.toLocaleString()}*\n\nPlease confirm availability and payment details. Thank you!`);
};

const CartDrawer = ({open,onClose,cart,onUpdateQty,onRemove,onCheckout}) => {
  const total=cart.reduce((a,i)=>a+Number(i.price)*i.qty,0);
  const waMsg=buildWhatsAppCartMsg(cart,total);
  return (
    <AnimatePresence>
      {open&&(
        <>
          <motion.div onClick={onClose} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:"fixed",inset:0,background:"var(--ov)",zIndex:1999}}/>
          <motion.div className="vd" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:26,stiffness:260}}>
            <div style={{padding:"22px 22px 18px",position:"sticky",top:0,background:"inherit",borderBottom:"1px solid var(--br)",zIndex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><p className="ll">Shopping Cart</p><h2 style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:300,marginTop:4}}>{cart.length} {cart.length===1?"item":"items"}</h2></div>
                <button onClick={onClose} style={{background:"var(--ib)",border:"1px solid var(--br)",borderRadius:8,padding:9,cursor:"pointer",color:"var(--ts)"}}><IC n="x" sz={17}/></button>
              </div>
            </div>
            <div style={{padding:"16px 22px"}}>
              {cart.length===0?(
                <div style={{textAlign:"center",padding:"56px 0"}}>
                  <div style={{fontSize:44,marginBottom:14,opacity:.3}}>🛍</div>
                  <p style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:300,marginBottom:7}}>Your cart is empty</p>
                  <p style={{color:"var(--tm)",fontSize:13}}>Discover our luxury collections</p>
                  <button className="bg" onClick={onClose} style={{marginTop:22,padding:"11px 26px",fontSize:13}}>Shop Now</button>
                </div>
              ):cart.map(item=>(
                <motion.div key={`${item.id}-${item.selectedSize||""}`} layout exit={{opacity:0,x:40}}
                  style={{display:"flex",gap:12,padding:13,background:"var(--bc)",border:"1px solid var(--br)",borderRadius:15,marginBottom:12}}>
                  <div style={{width:64,height:64,borderRadius:10,overflow:"hidden",background:"var(--bt)",flexShrink:0}}>
                    {item.image_url?<img src={item.image_url} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--fd)",fontSize:18,opacity:.2}}>VV</div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:500,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</p>
                    <p style={{fontSize:11,color:"var(--tm)",marginBottom:7}}>{item.selectedSize&&`Size: ${item.selectedSize}`}</p>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <button onClick={()=>onUpdateQty(item.id,item.qty-1)} style={{width:24,height:24,borderRadius:6,background:"var(--ib)",border:"1px solid var(--br)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IC n="minus" sz={10}/></button>
                        <span style={{fontSize:12,fontWeight:600,width:20,textAlign:"center"}}>{item.qty}</span>
                        <button onClick={()=>onUpdateQty(item.id,item.qty+1)} style={{width:24,height:24,borderRadius:6,background:"var(--ib)",border:"1px solid var(--br)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IC n="plus" sz={10}/></button>
                      </div>
                      <span style={{fontSize:13,fontWeight:700,color:"var(--gold)"}}>UGX {(Number(item.price)*item.qty).toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={()=>onRemove(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--tm)",padding:"0 2px",alignSelf:"flex-start"}}><IC n="trash" sz={14}/></button>
                </motion.div>
              ))}
            </div>
            {cart.length>0&&(
              <div style={{padding:"20px 22px",borderTop:"1px solid var(--br)",position:"sticky",bottom:0,background:"inherit"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <span style={{fontSize:13,color:"var(--ts)"}}>Subtotal ({cart.reduce((a,i)=>a+i.qty,0)} items)</span>
                  <span style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:500,color:"var(--gold)"}}>UGX {total.toLocaleString()}</span>
                </div>
                {/* Primary: Online Checkout */}
                <motion.button className="bg" onClick={()=>{onClose();onCheckout();}} whileTap={{scale:.97}}
                  style={{width:"100%",padding:"14px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:10}}>
                  <IC n="lock" sz={14}/> Place Order Online
                </motion.button>
                {/* Secondary: WhatsApp order */}
                <a href={`https://wa.me/256782860372?text=${waMsg}`} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",marginBottom:12}}>
                  <motion.button whileTap={{scale:.97}}
                    style={{width:"100%",padding:"12px",fontSize:13,background:"#25D366",color:"#fff",border:"none",borderRadius:50,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontWeight:600}}>
                    <IC n="wa" sz={15} c="#fff"/> Order via WhatsApp
                  </motion.button>
                </a>
                <div style={{display:"flex",justifyContent:"center",gap:16}}>
                  {["MTN MoMo","Airtel Money","Card"].map(m=>(
                    <span key={m} style={{fontSize:10,color:"var(--tm)",display:"flex",alignItems:"center",gap:3}}>
                      <IC n="shield" sz={10} c="var(--gold)"/> {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Checkout Modal — places real order to backend ────────────────────────────
const BASE_API = import.meta.env.VITE_API_URL || 'https://villa-vogue-bms.onrender.com/api';

const STEPS = ["Cart Review","Your Details","Payment","Confirm"];

const CheckoutModal = ({open,onClose,cart,user,onOrderPlaced,onUpdateQty,onRemove}) => {
  const toast = useToast();
  const [step,setStep] = useState(0);
  const [loading,setLoading] = useState(false);
  const [orderRef,setOrderRef] = useState(null);
  const [form,setForm] = useState({
    name: user?.name||user?.fullName||"",
    email: user?.email||"",
    phone: user?.phone||"",
    address: "",
    delivery: "pickup",   // pickup | delivery
    payment: "cash",      // cash | mtn_momo | airtel_money | card
    notes: "",
    momoNumber: "",
  });

  const total = cart.reduce((a,i)=>a+Number(i.price)*i.qty,0);
  const deliveryFee = form.delivery==="delivery" ? 10000 : 0;
  const grandTotal = total + deliveryFee;
  const waMsg = buildWhatsAppCartMsg(cart, grandTotal);

  // Reset when closed
  useEffect(()=>{ if(!open){setStep(0);setOrderRef(null);setLoading(false);} },[open]);
  // Pre-fill when user logs in
  useEffect(()=>{ if(user) setForm(f=>({...f,name:user.name||user.fullName||f.name,email:user.email||f.email,phone:user.phone||f.phone})); },[user]);

  const placeOrder = async () => {
    setLoading(true);
    try {
      const payload = {
        source: "online",
        customerId: user?.id || null,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        deliveryAddress: form.delivery==="delivery" ? form.address : "In-Store Pickup",
        deliveryType: form.delivery,
        paymentMethod: form.payment,
        momoNumber: form.momoNumber || undefined,
        notes: form.notes,
        deliveryFee,
        items: cart.map(i=>({
          productId: i.id,
          name: i.name,
          quantity: i.qty,
          price: Number(i.price),
          selectedSize: i.selectedSize||null,
          selectedColor: i.selectedColor||null,
        })),
        total: grandTotal,
      };
      // No Authorization header — backend optionalAuth allows unauthenticated online orders
      const res = await fetch(`${BASE_API}/orders`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||"Order failed");
      const ref = data.order?.orderNumber || data.orderNumber || data.id || `VV-${Date.now()}`;
      setOrderRef(ref);
      setStep(3);
      onOrderPlaced?.(data.order||data);
    } catch(e) {
      toast(e.message||"Could not place order. Try WhatsApp instead.","err","⚠");
    } finally {
      setLoading(false);
    }
  };

  if(!open) return null;

  const inp = (label,field,type="text",placeholder="",required=false) => (
    <div>
      <label style={{fontSize:11,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:"var(--tm)",display:"block",marginBottom:6}}>{label}{required&&<span style={{color:"var(--gold)"}}> *</span>}</label>
      <input className="vi" type={type} value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
        placeholder={placeholder} style={{width:"100%",padding:"11px 13px",fontSize:13}}/>
    </div>
  );

  return (
    <AnimatePresence>
      {open&&(
        <motion.div className="mb" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:2500,alignItems:"flex-start",paddingTop:20}}>
          <motion.div initial={{opacity:0,y:30,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:20,scale:.97}}
            style={{background:"var(--bgs)",border:"1px solid var(--br)",borderRadius:"var(--rxl)",width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"var(--sl)"}}>

            {/* Header */}
            <div style={{padding:"20px 24px 16px",borderBottom:"1px solid var(--br)",position:"sticky",top:0,background:"var(--bgs)",zIndex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <p className="ll">Villa Vogue · Online Order</p>
                  <h2 style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:300,marginTop:2}}>
                    {step===3 ? "Order Confirmed! 🎉" : "Complete Your Order"}
                  </h2>
                  {step<3&&<p style={{fontSize:11,color:"var(--tm)",marginTop:3}}>✅ No WhatsApp needed — order goes directly to our system</p>}
                </div>
                <button onClick={onClose} style={{background:"var(--ib)",border:"1px solid var(--br)",borderRadius:8,padding:8,cursor:"pointer",color:"var(--ts)"}}><IC n="x" sz={15}/></button>
              </div>
              {/* Progress bar */}
              {step<3&&(
                <div style={{display:"flex",gap:6}}>
                  {STEPS.slice(0,3).map((s,i)=>(
                    <div key={s} style={{flex:1}}>
                      <div style={{height:3,borderRadius:10,background:i<=step?"var(--gold)":"var(--br)",transition:"background .4s"}}/>
                      <p style={{fontSize:10,color:i<=step?"var(--gold)":"var(--tm)",marginTop:5,fontWeight:600}}>{s}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{padding:"20px 24px"}}>

              {/* ── Step 0: Cart Review ── */}
              {step===0&&(
                <div>
                  <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
                    {cart.map(item=>(
                      <div key={`${item.id}-${item.selectedSize||""}`} style={{display:"flex",gap:10,padding:12,background:"var(--bc)",border:"1px solid var(--br)",borderRadius:12}}>
                        <div style={{width:52,height:52,borderRadius:8,overflow:"hidden",background:"var(--bt)",flexShrink:0}}>
                          {item.image_url?<img src={item.image_url} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            :<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--fd)",opacity:.2}}>VV</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:13,fontWeight:500,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</p>
                          {item.selectedSize&&<p style={{fontSize:11,color:"var(--tm)",marginBottom:4}}>Size: {item.selectedSize}</p>}
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <button onClick={()=>onUpdateQty(item.id,item.qty-1)} style={{width:22,height:22,borderRadius:5,background:"var(--ib)",border:"1px solid var(--br)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IC n="minus" sz={9}/></button>
                            <span style={{fontSize:12,fontWeight:600,width:18,textAlign:"center"}}>{item.qty}</span>
                            <button onClick={()=>onUpdateQty(item.id,item.qty+1)} style={{width:22,height:22,borderRadius:5,background:"var(--ib)",border:"1px solid var(--br)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IC n="plus" sz={9}/></button>
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",justifyContent:"space-between"}}>
                          <button onClick={()=>onRemove(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--tm)"}}><IC n="trash" sz={13}/></button>
                          <span style={{fontSize:13,fontWeight:700,color:"var(--gold)"}}>UGX {(Number(item.price)*item.qty).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"var(--bc)",border:"1px solid var(--br)",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:"var(--ts)"}}>Subtotal</span><span style={{fontSize:13,fontWeight:600}}>UGX {total.toLocaleString()}</span></div>
                    <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid var(--br)"}}><span style={{fontWeight:700}}>Total</span><span style={{fontFamily:"var(--fd)",fontSize:18,color:"var(--gold)",fontWeight:500}}>UGX {total.toLocaleString()}</span></div>
                  </div>
                  <motion.button className="bg" onClick={()=>setStep(1)} whileTap={{scale:.97}} disabled={cart.length===0}
                    style={{width:"100%",padding:"13px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7,opacity:cart.length===0?.5:1}}>
                    Continue to Details <IC n="cr" sz={14}/>
                  </motion.button>
                </div>
              )}

              {/* ── Step 1: Customer Details ── */}
              {step===1&&(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {inp("Full Name","name","text","Jane Nakato",true)}
                  {inp("Phone Number","phone","tel","+256 7XX XXX XXX",true)}
                  {inp("Email Address","email","email","jane@example.com")}
                  <div>
                    <label style={{fontSize:11,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:"var(--tm)",display:"block",marginBottom:8}}>Delivery Option <span style={{color:"var(--gold)"}}>*</span></label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      {[{v:"pickup",l:"🏪 In-Store Pickup",d:"Free · Ready in 1hr"},{v:"delivery",l:"🚚 Home Delivery",d:"UGX 10,000 · 1-2 days"}].map(opt=>(
                        <button key={opt.v} onClick={()=>setForm(f=>({...f,delivery:opt.v}))}
                          style={{padding:"12px",borderRadius:12,background:form.delivery===opt.v?"rgba(201,168,76,.12)":"var(--ib)",border:`2px solid ${form.delivery===opt.v?"var(--gold)":"var(--br)"}`,cursor:"pointer",textAlign:"left",transition:"all .2s"}}>
                          <p style={{fontSize:13,fontWeight:600,color:"var(--tp)",marginBottom:3}}>{opt.l}</p>
                          <p style={{fontSize:11,color:"var(--tm)"}}>{opt.d}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.delivery==="delivery"&&inp("Delivery Address","address","text","Kampala, Uganda",true)}
                  <div>
                    <label style={{fontSize:11,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:"var(--tm)",display:"block",marginBottom:6}}>Order Notes</label>
                    <textarea className="vi" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                      placeholder="Any special requests or instructions…" rows={2}
                      style={{width:"100%",padding:"11px 13px",fontSize:13,resize:"vertical"}}/>
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <button className="bgh" onClick={()=>setStep(0)} style={{flex:1,padding:"12px",fontSize:13}}>← Back</button>
                    <motion.button className="bg" onClick={()=>{
                      if(!form.name||!form.phone||(form.delivery==="delivery"&&!form.address)){toast("Please fill required fields","err","⚠");return;}
                      setStep(2);
                    }} whileTap={{scale:.97}} style={{flex:2,padding:"12px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      Continue to Payment <IC n="cr" sz={14}/>
                    </motion.button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Payment ── */}
              {step===2&&(
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:"var(--tm)",display:"block",marginBottom:10}}>Payment Method</label>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {[
                        {v:"cash",l:"💵 Cash on Pickup/Delivery",d:"Pay when you receive your order"},
                        {v:"mtn_momo",l:"📱 MTN Mobile Money",d:"Send to our MoMo number"},
                        {v:"airtel_money",l:"📱 Airtel Money",d:"Send to our Airtel number"},
                        {v:"card",l:"💳 Card Payment",d:"Visa / Mastercard"},
                      ].map(opt=>(
                        <button key={opt.v} onClick={()=>setForm(f=>({...f,payment:opt.v}))}
                          style={{padding:"13px 16px",borderRadius:12,background:form.payment===opt.v?"rgba(201,168,76,.12)":"var(--ib)",border:`2px solid ${form.payment===opt.v?"var(--gold)":"var(--br)"}`,cursor:"pointer",textAlign:"left",transition:"all .2s",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div><p style={{fontSize:13,fontWeight:600,color:"var(--tp)",marginBottom:2}}>{opt.l}</p><p style={{fontSize:11,color:"var(--tm)"}}>{opt.d}</p></div>
                          {form.payment===opt.v&&<IC n="check" sz={16} c="var(--gold)"/>}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(form.payment==="mtn_momo"||form.payment==="airtel_money")&&(
                    <div style={{background:"rgba(201,168,76,.08)",border:"1px solid rgba(201,168,76,.3)",borderRadius:12,padding:"14px 16px"}}>
                      <p style={{fontSize:12,color:"var(--gold)",fontWeight:600,marginBottom:6}}>📲 Payment Instructions</p>
                      <p style={{fontSize:12,color:"var(--ts)",lineHeight:1.7}}>
                        {form.payment==="mtn_momo"
                          ? "Send UGX "+grandTotal.toLocaleString()+" to MTN MoMo: 0782860372 (Villa Vogue)"
                          : "Send UGX "+grandTotal.toLocaleString()+" to Airtel: 0782860372 (Villa Vogue)"}
                        <br/>Use your name + order number as reference after placing.
                      </p>
                      {inp("Your MoMo/Airtel Number","momoNumber","tel","07XX XXX XXX")}
                    </div>
                  )}
                  {/* Order summary */}
                  <div style={{background:"var(--bc)",border:"1px solid var(--br)",borderRadius:12,padding:"14px 16px"}}>
                    <p style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--tm)",marginBottom:10}}>Order Summary</p>
                    {cart.map(i=><div key={i.id} style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}><span style={{color:"var(--ts)"}}>{i.name} x{i.qty}</span><span style={{fontWeight:600}}>UGX {(Number(i.price)*i.qty).toLocaleString()}</span></div>)}
                    {deliveryFee>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}><span style={{color:"var(--ts)"}}>Delivery</span><span>UGX {deliveryFee.toLocaleString()}</span></div>}
                    <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid var(--br)"}}><span style={{fontWeight:700}}>Total</span><span style={{fontFamily:"var(--fd)",fontSize:17,color:"var(--gold)",fontWeight:500}}>UGX {grandTotal.toLocaleString()}</span></div>
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <button className="bgh" onClick={()=>setStep(1)} style={{flex:1,padding:"12px",fontSize:13}}>← Back</button>
                    <motion.button className="bg" onClick={placeOrder} disabled={loading} whileTap={{scale:.97}}
                      style={{flex:2,padding:"13px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7,opacity:loading?.7:1}}>
                      {loading?<><span style={{width:14,height:14,border:"2px solid rgba(0,0,0,.3)",borderTopColor:"#000",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite"}}/> Placing Order…</>
                        :<><IC n="check" sz={14}/> Place Order — UGX {grandTotal.toLocaleString()}</>}
                    </motion.button>
                  </div>
                  {/* WhatsApp fallback */}
                  <div style={{textAlign:"center"}}>
                    <p style={{fontSize:11,color:"var(--tm)",marginBottom:8}}>Prefer WhatsApp?</p>
                    <a href={`https://wa.me/256782860372?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:6,color:"#25D366",fontSize:12,fontWeight:600,textDecoration:"none"}}>
                      <IC n="wa" sz={13} c="#25D366"/> Send order via WhatsApp instead
                    </a>
                  </div>
                </div>
              )}

              {/* ── Step 3: Confirmation ── */}
              {step===3&&(
                <div style={{textAlign:"center",padding:"10px 0 20px"}}>
                  <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",delay:.1}}
                    style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,var(--gold-d),var(--gold))",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
                    <IC n="check" sz={32} c="#000"/>
                  </motion.div>
                  <h3 style={{fontFamily:"var(--fd)",fontSize:26,fontWeight:300,marginBottom:8}}>Order Placed!</h3>
                  <p style={{color:"var(--ts)",fontSize:14,marginBottom:4}}>Your order reference is:</p>
                  <div style={{fontFamily:"var(--fd)",fontSize:22,color:"var(--gold)",fontWeight:500,marginBottom:20,letterSpacing:".06em"}}>{orderRef}</div>
                  <div style={{background:"var(--bc)",border:"1px solid var(--br)",borderRadius:14,padding:"16px",marginBottom:20,textAlign:"left"}}>
                    <p style={{fontSize:12,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"var(--tm)",marginBottom:10}}>What happens next</p>
                    {[
                      {e:"📞",t:"We'll call/WhatsApp you within 30 minutes to confirm"},
                      {e:"💳",t:form.payment!=="cash"?"Complete your MoMo/Airtel payment using the reference above":"Have cash ready for "+( form.delivery==="delivery"?"delivery":"pickup")},
                      {e:form.delivery==="delivery"?"🚚":"🏪",t:form.delivery==="delivery"?"We'll deliver to "+form.address+" within 1-2 days":"Your order will be ready for pickup in about 1 hour"},
                    ].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
                        <span style={{fontSize:18,flexShrink:0}}>{s.e}</span>
                        <p style={{fontSize:13,color:"var(--ts)",lineHeight:1.6}}>{s.t}</p>
                      </div>
                    ))}
                  </div>
                  <a href={`https://wa.me/256782860372?text=${encodeURIComponent(`Hi Villa Vogue! My order reference is ${orderRef}. I'd like to confirm my order.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,background:"#25D366",color:"#fff",padding:"12px",borderRadius:50,textDecoration:"none",fontWeight:600,fontSize:13,marginBottom:12}}>
                    <IC n="wa" sz={15} c="#fff"/> Confirm on WhatsApp
                  </a>
                  <button className="bgh" onClick={onClose} style={{width:"100%",padding:"11px",fontSize:13}}>Continue Shopping</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const WishlistDrawer = ({open,onClose,wishlist,onRemove,onAddToCart}) => {
  const toast=useToast();
  return (
    <AnimatePresence>
      {open&&(
        <>
          <motion.div onClick={onClose} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:"fixed",inset:0,background:"var(--ov)",zIndex:1999}}/>
          <motion.div className="vd" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:26,stiffness:260}}>
            <div style={{padding:"22px 22px 18px",borderBottom:"1px solid var(--br)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><p className="ll">Wishlist</p><h2 style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:300,marginTop:4}}>{wishlist.length} saved {wishlist.length===1?"item":"items"}</h2></div>
                <button onClick={onClose} style={{background:"var(--ib)",border:"1px solid var(--br)",borderRadius:8,padding:9,cursor:"pointer",color:"var(--ts)"}}><IC n="x" sz={17}/></button>
              </div>
            </div>
            <div style={{padding:"18px 22px"}}>
              {wishlist.length===0?(
                <div style={{textAlign:"center",padding:"56px 0"}}>
                  <div style={{fontSize:44,marginBottom:14,opacity:.3}}>♡</div>
                  <p style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:300}}>No saved items yet</p>
                  <p style={{color:"var(--tm)",fontSize:13,marginTop:7}}>Heart items you love to save them here</p>
                </div>
              ):wishlist.map(item=>(
                <div key={item.id} style={{display:"flex",gap:12,padding:13,background:"var(--bc)",border:"1px solid var(--br)",borderRadius:15,marginBottom:12}}>
                  <div style={{width:64,height:64,borderRadius:10,overflow:"hidden",background:"var(--bt)",flexShrink:0}}>
                    {item.image_url&&<img src={item.image_url} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:500,marginBottom:3}}>{item.name}</p>
                    <p style={{fontSize:13,color:"var(--gold)",fontWeight:700,marginBottom:10}}>UGX {Number(item.price).toLocaleString()}</p>
                    <button className="bg" onClick={()=>{onAddToCart(item);toast(`${item.name} added to cart`);}}
                      style={{padding:"6px 14px",fontSize:11,display:"flex",alignItems:"center",gap:5}}>
                      <IC n="cart" sz={11}/> Move to Cart
                    </button>
                  </div>
                  <button onClick={()=>onRemove(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--tm)",padding:"0 2px",alignSelf:"flex-start"}}><IC n="x" sz={14}/></button>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Hero slideshow images (real Villa Vogue products) ────────────────────────
const HERO_SLIDES = [
  {
    img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
    label: "New Collection",
    title: "Luxury Fashion\nfor the Modern\nLifestyle",
    sub: "Discover curated collections blending timeless elegance with contemporary sophistication.",
  },
  {
    img: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
    label: "Women's Wear",
    title: "Elegance in\nEvery\nThread",
    sub: "From casual chic to red-carpet ready — find your perfect look at Villa Vogue.",
  },
  {
    img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
    label: "Men's Collection",
    title: "Dress to\nImpress,\nEvery Day",
    sub: "Sharp tailoring meets modern style. Look your best for every occasion.",
  },
  {
    img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80",
    label: "Trending Now",
    title: "The Latest\nArrivals\nAre Here",
    sub: "Fresh drops every week. Be the first to wear what everyone will be talking about.",
  },
];

const HeroSection = ({onShopNow}) => {
  const [current,setCurrent]=useState(0);
  const [prev,setPrev]=useState(null);

  useEffect(()=>{
    const t=setInterval(()=>{
      setPrev(current);
      setCurrent(c=>(c+1)%HERO_SLIDES.length);
    },4500);
    return ()=>clearInterval(t);
  },[current]);

  const slide=HERO_SLIDES[current];
  const prevSlide=prev!==null?HERO_SLIDES[prev]:null;

  return (
    <div style={{position:"relative",height:"100vh",minHeight:520,overflow:"hidden",background:"#0a0a0a"}}>
      {/* Slide images */}
      <AnimatePresence>
        {prevSlide&&(
          <motion.div key={`prev-${prev}`} initial={{opacity:1}} animate={{opacity:0}} exit={{opacity:0}} transition={{duration:.9}}
            style={{position:"absolute",inset:0,zIndex:1}}>
            <img src={prevSlide.img} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:.55,filter:"brightness(.7)"}}/>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div key={`curr-${current}`} initial={{opacity:0,scale:1.06}} animate={{opacity:1,scale:1}} transition={{duration:1.1,ease:"easeOut"}}
        style={{position:"absolute",inset:0,zIndex:2}}>
        <img src={slide.img} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:.55,filter:"brightness(.7)"}}/>
      </motion.div>
      {/* Dark gradient overlay */}
      <div style={{position:"absolute",inset:0,zIndex:3,background:"linear-gradient(to right, rgba(0,0,0,.75) 40%, rgba(0,0,0,.2) 100%)"}}/>

      {/* Content */}
      <div style={{position:"absolute",inset:0,zIndex:4,display:"flex",alignItems:"center",padding:"0 6vw",paddingTop:80}}>
        <div style={{maxWidth:580}}>
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{opacity:0,y:28}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} transition={{duration:.6}}>
              <span style={{fontSize:11,letterSpacing:".2em",textTransform:"uppercase",color:"var(--gold)",fontWeight:600,display:"block",marginBottom:16}}>
                ✦ {slide.label}
              </span>
              <h1 style={{fontFamily:"var(--fd)",fontSize:"clamp(38px,6.5vw,80px)",fontWeight:300,lineHeight:1.08,color:"#fff",marginBottom:20,whiteSpace:"pre-line"}}>
                {slide.title.split('\n').map((line,i)=>
                  i===1?<span key={i} style={{fontStyle:"italic",color:"var(--gold)"}}>{line}<br/></span>:<span key={i}>{line}<br/></span>
                )}
              </h1>
              <p style={{fontSize:15,color:"rgba(255,255,255,.75)",lineHeight:1.8,marginBottom:32,maxWidth:420}}>{slide.sub}</p>
            </motion.div>
          </AnimatePresence>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <motion.button className="bg" onClick={onShopNow} whileHover={{scale:1.04}} whileTap={{scale:.97}}
              style={{padding:"14px 30px",fontSize:13,letterSpacing:".06em"}}>Shop Collection</motion.button>
            <motion.button className="bgh" onClick={onShopNow} whileHover={{scale:1.04}} whileTap={{scale:.97}}
              style={{padding:"14px 30px",fontSize:13,letterSpacing:".06em",color:"#fff",borderColor:"rgba(255,255,255,.35)"}}>View All</motion.button>
          </div>
          {/* Stats */}
          <div style={{display:"flex",gap:28,marginTop:44,paddingTop:28,borderTop:"1px solid rgba(255,255,255,.15)"}}>
            {[{n:"500+",l:"Products"},{n:"10K+",l:"Customers"},{n:"4.9★",l:"Rating"}].map(s=>(
              <div key={s.n}>
                <div style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:300,color:"var(--gold)"}}>{s.n}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.55)",letterSpacing:".08em",textTransform:"uppercase",marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slide dots */}
      <div style={{position:"absolute",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:5,display:"flex",gap:8}}>
        {HERO_SLIDES.map((_,i)=>(
          <button key={i} onClick={()=>{setPrev(current);setCurrent(i);}}
            style={{width:i===current?24:7,height:7,borderRadius:10,background:i===current?"var(--gold)":"rgba(255,255,255,.35)",border:"none",cursor:"pointer",transition:"all .4s",padding:0}}/>
        ))}
      </div>

      {/* Scroll hint */}
      <div style={{position:"absolute",bottom:28,right:32,zIndex:5,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
        <span style={{fontSize:9,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(255,255,255,.4)"}}>Scroll</span>
        <motion.div style={{width:1,height:32,background:"rgba(255,255,255,.3)"}} animate={{scaleY:[0,1,0]}} transition={{duration:1.8,repeat:Infinity}}/>
      </div>
    </div>
  );
};

// ── About / Founder Section ──────────────────────────────────────────────────
const AboutSection = () => (
  <section style={{padding:"80px 0",background:"var(--bp)"}}>
    <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px"}}>
      <Reveal>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:56,alignItems:"center",flexWrap:"wrap"}}>
          {/* Founder photo */}
          <div style={{position:"relative"}}>
            <div style={{borderRadius:24,overflow:"hidden",aspectRatio:"3/4",background:"var(--bt)",maxHeight:520}}>
              <img
                src="https://i.postimg.cc/ZWrF3t86/me-now.jpg"
                onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}
                alt="Kayanja Wilfred — Founder, Villa Vogue"
                style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}
              />
              {/* Fallback initials */}
              <div style={{display:"none",width:"100%",height:"100%",background:"linear-gradient(135deg,#1a1a1a,#2d2d2d)",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
                <div style={{fontFamily:"var(--fd)",fontSize:64,color:"var(--gold)",fontWeight:300}}>KW</div>
                <p style={{fontSize:12,color:"rgba(255,255,255,.4)",letterSpacing:".15em"}}>KAYANJA WILFRED</p>
              </div>
            </div>
            {/* Gold accent */}
            <div style={{position:"absolute",top:-12,left:-12,width:"100%",height:"100%",border:"2px solid var(--gold)",borderRadius:24,opacity:.2,zIndex:-1}}/>
            {/* Founder badge */}
            <div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.8)",backdropFilter:"blur(12px)",border:"1px solid var(--brg)",borderRadius:50,padding:"10px 20px",whiteSpace:"nowrap",textAlign:"center"}}>
              <p style={{fontFamily:"var(--fd)",fontSize:14,color:"var(--gold)",fontWeight:400,letterSpacing:".08em"}}>Kayanja Wilfred</p>
              <p style={{fontSize:10,color:"rgba(255,255,255,.5)",letterSpacing:".1em",textTransform:"uppercase",marginTop:2}}>Founder & Creative Director</p>
            </div>
          </div>
          {/* Story */}
          <div>
            <span className="ll" style={{display:"block",marginBottom:16}}>Our Story</span>
            <h2 style={{fontFamily:"var(--fd)",fontSize:"clamp(28px,4vw,44px)",fontWeight:300,lineHeight:1.2,marginBottom:20}}>
              Fashion that tells<br/><em style={{fontStyle:"italic",color:"var(--gold)"}}>your story</em>
            </h2>
            <p style={{fontSize:14,color:"var(--ts)",lineHeight:1.9,marginBottom:16}}>
              Villa Vogue was born from a vision to bring world-class fashion to Uganda — a place where every piece tells a story of elegance, quality, and confidence. What started as a passion for style has grown into Kampala's most trusted fashion destination.
            </p>
            <p style={{fontSize:14,color:"var(--ts)",lineHeight:1.9,marginBottom:28}}>
              We believe that great fashion should be accessible to everyone. From working professionals to brides, from students to executives — Villa Vogue has a piece for every chapter of your life.
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:28}}>
              {[
                {n:"2020",l:"Founded in Kampala"},
                {n:"500+",l:"Premium products"},
                {n:"10K+",l:"Happy customers"},
                {n:"⭐ 4.9",l:"Customer rating"},
              ].map(s=>(
                <div key={s.n} style={{background:"var(--bc)",border:"1px solid var(--br)",borderRadius:14,padding:"16px"}}>
                  <div style={{fontFamily:"var(--fd)",fontSize:22,color:"var(--gold)",fontWeight:300,marginBottom:4}}>{s.n}</div>
                  <div style={{fontSize:11,color:"var(--tm)",textTransform:"uppercase",letterSpacing:".06em"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <a href={`https://wa.me/256782860372?text=Hello Villa Vogue! I'd like to learn more about your brand.`} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                <button style={{display:"flex",alignItems:"center",gap:7,padding:"11px 22px",background:"#25D366",color:"#fff",border:"none",borderRadius:50,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  <IC n="wa" sz={14} c="#fff"/> Chat with Us
                </button>
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

const CollectionsSection = () => {
  const cs=[
    {n:"New Arrivals",e:"✨",h:"/store?collection=new"},{n:"Wedding",e:"💍",h:"/store?collection=wedding"},
    {n:"Corporate",e:"👔",h:"/store?collection=corporate"},{n:"Luxury",e:"👑",h:"/store?collection=luxury"},
    {n:"Casual",e:"🌿",h:"/store?collection=casual"},{n:"Sale",e:"🏷",h:"/store?collection=sale"},
    {n:"Accessories",e:"👜",h:"/store?collection=accessories"},{n:"Trending",e:"🔥",h:"/store?collection=trending"},
  ];
  return (
    <section style={{padding:"90px 0",background:"var(--bp)"}}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"0 24px"}}>
        <Reveal><div style={{textAlign:"center",marginBottom:50}}><span className="ll">Curated for You</span><h2 className="sl" style={{fontSize:"clamp(30px,4vw,48px)",marginTop:10}}>Our Collections</h2></div></Reveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(146px,1fr))",gap:14}}>
          {cs.map((c,i)=>(
            <Reveal key={c.n} delay={i*.05}>
              <a href={c.h} style={{textDecoration:"none"}}>
                <motion.div whileHover={{y:-5,scale:1.03}} whileTap={{scale:.97}}
                  style={{background:"var(--bc)",border:"1px solid var(--br)",borderRadius:18,padding:"26px 14px",textAlign:"center",cursor:"pointer",transition:"border-color .3s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--brg)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--br)"}>
                  <div style={{fontSize:30,marginBottom:10}}>{c.e}</div>
                  <p style={{fontSize:12,fontWeight:600,color:"var(--tp)",letterSpacing:".04em"}}>{c.n}</p>
                </motion.div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

// Normalize backend product fields → portal field names
// Backend sends: stock (number), images (JSON string "[url,...]"),
//   category (object {id,name} or string), brand (object or string)
// Portal expects: stock_quantity, image_url, category (string), brand (string)
const normalizeProduct = (p) => ({
  ...p,
  stock_quantity: p.stock_quantity ?? p.stock ?? 0,
  image_url: p.image_url || (() => {
    try { const a = JSON.parse(p.images || "[]"); return a[0] || null; } catch { return null; }
  })(),
  category: typeof p.category === "object" && p.category !== null ? p.category.name || "" : (p.category || ""),
  brand:    typeof p.brand    === "object" && p.brand    !== null ? p.brand.name    || "" : (p.brand    || ""),
});

const PRODUCTS_PER_PAGE = 8;

const FeaturedProducts = ({products,wishlist,onAddToCart,onQuickView,onWishlistToggle,loading}) => {
  const [visible, setVisible] = useState(PRODUCTS_PER_PAGE);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const dp = (products || []).map(normalizeProduct);

  // Build category list from real products
  const categories = ["All", ...Array.from(new Set(dp.map(p => p.category).filter(Boolean)))];

  // Filter by search + category
  const filtered = dp.filter(p => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <section style={{padding:"60px 0",background:"var(--bs)"}}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"0 24px"}}>
        <Reveal>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32,flexWrap:"wrap",gap:16}}>
            <div>
              <span className="ll">Our Collection</span>
              <h2 className="sl" style={{fontSize:"clamp(24px,3.5vw,40px)",marginTop:8}}>
                {activeCategory === "All" ? "All Products" : activeCategory}
                {!loading && dp.length > 0 && <span style={{fontSize:14,fontWeight:400,color:"var(--tm)",marginLeft:10}}>({filtered.length} items)</span>}
              </h2>
            </div>
          </div>
        </Reveal>

        {/* Search + category filters */}
        {!loading && dp.length > 0 && (
          <div style={{marginBottom:28,display:"flex",flexDirection:"column",gap:14}}>
            {/* Search bar */}
            <div style={{position:"relative",maxWidth:360}}>
              <input
                value={search} onChange={e=>{setSearch(e.target.value);setVisible(PRODUCTS_PER_PAGE);}}
                placeholder="Search products…" className="vi"
                style={{width:"100%",padding:"10px 14px 10px 38px",fontSize:13,borderRadius:50}}
              />
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",opacity:.4}}>
                <IC n="search" sz={14}/>
              </span>
              {search && <button onClick={()=>{setSearch("");setVisible(PRODUCTS_PER_PAGE);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--tm)"}}><IC n="x" sz={13}/></button>}
            </div>
            {/* Category pills */}
            {categories.length > 1 && (
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {categories.map(cat=>(
                  <button key={cat} onClick={()=>{setActiveCategory(cat);setVisible(PRODUCTS_PER_PAGE);}}
                    style={{padding:"6px 16px",borderRadius:50,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .2s",border:"1.5px solid",
                      borderColor:activeCategory===cat?"var(--gold)":"var(--br)",
                      background:activeCategory===cat?"linear-gradient(135deg,var(--gold-d),var(--gold))":"var(--ib)",
                      color:activeCategory===cat?"#000":"var(--ts)"}}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(246px,1fr))",gap:22,marginBottom:32}}>
          {loading
            ? Array(PRODUCTS_PER_PAGE).fill(null).map((_,i)=><SkCard key={i}/>)
            : shown.length > 0
              ? shown.map((p,i)=>(
                  <Reveal key={p.id} delay={i*.04}>
                    <ProductCard product={p} onAddToCart={onAddToCart} onQuickView={onQuickView}
                      onWishlistToggle={onWishlistToggle} wishlisted={wishlist.some(w=>w.id===p.id)}/>
                  </Reveal>
                ))
              : (
                <div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 0"}}>
                  {search || activeCategory !== "All" ? (
                    <>
                      <p style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:300,color:"var(--ts)",marginBottom:8}}>No products found</p>
                      <p style={{fontSize:13,color:"var(--tm)",marginBottom:20}}>Try a different search or category</p>
                      <button className="bgh" onClick={()=>{setSearch("");setActiveCategory("All");}} style={{padding:"9px 22px",fontSize:13}}>Clear filters</button>
                    </>
                  ) : (
                    <>
                      <div style={{fontFamily:"var(--fd)",fontSize:32,opacity:.15,marginBottom:16}}>VV</div>
                      <p style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:300,color:"var(--ts)"}}>New arrivals coming soon</p>
                      <p style={{fontSize:13,color:"var(--tm)",marginTop:8}}>Our collection is being curated. Check back shortly.</p>
                    </>
                  )}
                </div>
              )
          }
        </div>

        {/* Load More button */}
        {hasMore && (
          <div style={{textAlign:"center"}}>
            <motion.button className="bgh" onClick={()=>setVisible(v=>v+PRODUCTS_PER_PAGE)} whileTap={{scale:.97}}
              style={{padding:"12px 36px",fontSize:13,display:"inline-flex",alignItems:"center",gap:8}}>
              Show More Products
              <span style={{fontSize:11,color:"var(--tm)"}}>({filtered.length - visible} remaining)</span>
              <IC n="cd" sz={14}/>
            </motion.button>
          </div>
        )}
        {!hasMore && shown.length > PRODUCTS_PER_PAGE && (
          <div style={{textAlign:"center"}}>
            <p style={{fontSize:12,color:"var(--tm)"}}>All {filtered.length} products shown</p>
            <button className="bgh" onClick={()=>setVisible(PRODUCTS_PER_PAGE)} style={{marginTop:8,padding:"7px 20px",fontSize:12}}>Show Less ↑</button>
          </div>
        )}
      </div>
    </section>
  );
};

const OrderTracking = ({orders=[]}) => {
  const steps=[
    {k:"received",l:"Order Received",i:"pkg"},{k:"confirmed",l:"Confirmed",i:"check"},
    {k:"preparing",l:"Preparing",i:"tag"},{k:"packed",l:"Packed",i:"pkg"},
    {k:"shipped",l:"Shipped",i:"truck"},{k:"out_for_delivery",l:"Out for Delivery",i:"pin"},
    {k:"delivered",l:"Delivered",i:"check"},
  ];
  const act=orders[0];
  const ai=act?steps.findIndex(s=>s.k===act.status):1;
  return (
    <section style={{padding:"80px 0",background:"var(--bp)"}}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"0 24px"}}>
        <Reveal><div style={{textAlign:"center",marginBottom:50}}><span className="ll">Track Your Order</span><h2 className="sl" style={{fontSize:"clamp(26px,3.5vw,44px)",marginTop:10}}>Live Order Status</h2></div></Reveal>
        <Reveal delay={.1}>
          <div className="gc" style={{maxWidth:620,margin:"0 auto",padding:32}}>
            {act?(
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}>
                <div><p className="ll">Order #{act.id}</p><p style={{fontFamily:"var(--fd)",fontSize:18,marginTop:4}}>{act.item||"Your Recent Order"}</p></div>
                <span className="lb" style={{alignSelf:"flex-start"}}>{act.status?.replace("_"," ")}</span>
              </div>
            ):(
              <div style={{marginBottom:20}}><p className="ll" style={{marginBottom:6}}>Example Tracking</p><p style={{color:"var(--tm)",fontSize:13}}>This is how your order progress appears</p></div>
            )}
            <div style={{display:"flex",flexDirection:"column"}}>
              {steps.map((step,i)=>(
                <div key={step.k} className="ts">
                  <div className={`td ${i<=ai?"on":""}`}>{i<=ai&&<IC n={step.i} sz={9} c="#000"/>}</div>
                  <div style={{paddingBottom:i<steps.length-1?18:0}}>
                    <p style={{fontSize:13,fontWeight:i<=ai?600:400,color:i<=ai?"var(--tp)":"var(--tm)"}}>{step.l}</p>
                    {i===ai&&<p style={{fontSize:11,color:"var(--gold)",marginTop:2}}>Current Status</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const LoyaltySection = ({user}) => {
  const trs=[
    {n:"Bronze",p:"0–999",c:"t1",pk:["5% cashback","Birthday reward"]},
    {n:"Silver",p:"1K–4.9K",c:"t2",pk:["8% cashback","Free shipping","Early access"]},
    {n:"Gold",p:"5K–19.9K",c:"t3",pk:["12% cashback","Priority service","Exclusive events"]},
    {n:"Platinum",p:"20K–49.9K",c:"t4",pk:["15% cashback","Personal stylist","VIP lounges"]},
    {n:"VIP",p:"50K+",c:"t5",pk:["20% cashback","Concierge","Bespoke tailoring"]},
  ];
  return (
    <section style={{padding:"80px 0",background:"var(--bs)"}}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"0 24px"}}>
        <Reveal><div style={{textAlign:"center",marginBottom:50}}>
          <span className="ll">Rewards Program</span>
          <h2 className="sl" style={{fontSize:"clamp(26px,3.5vw,44px)",marginTop:10}}>Villa Vogue Rewards</h2>
          <p style={{fontSize:15,color:"var(--ts)",maxWidth:420,margin:"14px auto 0"}}>Earn points with every purchase. Unlock exclusive privileges and rewards.</p>
        </div></Reveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(186px,1fr))",gap:18}}>
          {trs.map((t,i)=>(
            <Reveal key={t.n} delay={i*.07}>
              <div style={{borderRadius:18,overflow:"hidden",border:"1px solid var(--br)",background:"var(--bc)",transition:"transform .3s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-5px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                <div className={t.c} style={{padding:"18px 18px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><IC n="award" sz={18} c="rgba(255,255,255,.9)"/><span style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:400,color:"#fff",letterSpacing:".05em"}}>{t.n}</span></div>
                  <p style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:5}}>{t.p} points</p>
                </div>
                <div style={{padding:"14px 18px 18px"}}>
                  {t.pk.map(p=>(
                    <div key={p} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                      <span style={{color:"var(--gold)",fontSize:11}}>✦</span>
                      <span style={{fontSize:12,color:"var(--ts)"}}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        {!user&&<Reveal delay={.3}><div style={{textAlign:"center",marginTop:44}}>
          <a href="/register"><motion.button className="bg" whileHover={{scale:1.03}} whileTap={{scale:.97}} style={{padding:"14px 36px",fontSize:13,display:"inline-flex",alignItems:"center",gap:7}}><IC n="gift" sz={15}/> Join Rewards — It's Free</motion.button></a>
        </div></Reveal>}
      </div>
    </section>
  );
};

const Testimonials = () => {
  const rs=[
    {n:"Amara K.",l:"Kampala",r:5,t:"Absolutely stunning quality. The silk dress arrived beautifully packaged and fits like it was made for me.",a:"A"},
    {n:"David M.",l:"Entebbe",r:5,t:"Villa Vogue transformed my wardrobe. The corporate collection is exceptional — professional yet stylish.",a:"D"},
    {n:"Grace N.",l:"Jinja",r:5,t:"The wedding collection is breathtaking. My bridesmaids looked incredible. Quality exceeds international brands!",a:"G"},
  ];
  return (
    <section style={{padding:"80px 0",background:"var(--bp)"}}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"0 24px"}}>
        <Reveal><div style={{textAlign:"center",marginBottom:50}}>
          <span className="ll">Customer Love</span>
          <h2 className="sl" style={{fontSize:"clamp(26px,3.5vw,44px)",marginTop:10}}>What Our Clients Say</h2>
          <p style={{fontSize:13,color:"var(--tm)",marginTop:10,letterSpacing:".06em"}}>✦ Trusted by Thousands of Customers Across Uganda</p>
        </div></Reveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(286px,1fr))",gap:22}}>
          {rs.map((r,i)=>(
            <Reveal key={r.n} delay={i*.1}>
              <div className="gc" style={{padding:26}}>
                <Stars r={r.r} sz={15}/>
                <p style={{fontSize:14,color:"var(--ts)",lineHeight:1.8,margin:"14px 0 18px",fontStyle:"italic",fontFamily:"var(--fe)"}}>"{r.t}"</p>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,var(--gold-d),var(--gold))",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#000",flexShrink:0,fontSize:14}}>{r.a}</div>
                  <div><p style={{fontSize:13,fontWeight:600}}>{r.n}</p><p style={{fontSize:11,color:"var(--tm)"}}>{r.l}</p></div>
                  <span style={{marginLeft:"auto",fontSize:11,color:"var(--gold)",display:"flex",alignItems:"center",gap:4}}><IC n="check" sz={10} c="var(--gold)"/> Verified</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const Newsletter = () => {
  const [em,setEm]=useState("");
  const [done,setDone]=useState(false);
  const toast=useToast();
  return (
    <section style={{padding:"80px 0",background:"var(--bs)"}}>
      <div style={{maxWidth:540,margin:"0 auto",padding:"0 24px",textAlign:"center"}}>
        <Reveal>
          <span className="ll">Stay In The Loop</span>
          <h2 className="sl" style={{fontSize:"clamp(26px,3.5vw,42px)",marginTop:10,marginBottom:14}}>Join the Inner Circle</h2>
          <p style={{fontSize:14,color:"var(--ts)",lineHeight:1.8,marginBottom:30}}>Be the first to know about new arrivals and exclusive offers. Get 10% off your first order.</p>
          {done?(
            <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}}
              style={{padding:"20px 28px",background:"var(--bc)",border:"1px solid var(--brg)",borderRadius:16}}>
              <IC n="check" sz={22} c="var(--gold)"/>
              <p style={{fontFamily:"var(--fd)",fontSize:20,marginTop:10}}>You are on the list!</p>
              <p style={{fontSize:13,color:"var(--tm)",marginTop:5}}>Check your inbox for your welcome gift.</p>
            </motion.div>
          ):(
            <div style={{display:"flex",gap:10,maxWidth:400,margin:"0 auto"}}>
              <input className="vi" value={em} onChange={e=>setEm(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&em.includes("@")&&(setDone(true),toast("Welcome to Villa Vogue! ✦"))}
                placeholder="your@email.com" style={{flex:1,padding:"13px 16px",fontSize:13}}/>
              <motion.button className="bg" whileTap={{scale:.96}}
                onClick={()=>{if(em.includes("@")){setDone(true);toast("Welcome to Villa Vogue! ✦");}}}
                style={{padding:"13px 22px",fontSize:13,flexShrink:0}}>Subscribe</motion.button>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="vf">
    <div style={{maxWidth:1400,margin:"0 auto",padding:"0 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(183px,1fr))",gap:44,marginBottom:44}}>
        <div>
          <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:300,letterSpacing:".2em",marginBottom:5}}>VILLA VOGUE</div>
          <div style={{fontSize:9,letterSpacing:".3em",color:"var(--gold)",textTransform:"uppercase",marginBottom:18}}>Luxury Fashion Uganda</div>
          <p style={{fontSize:13,color:"var(--tm)",lineHeight:1.8}}>Premium fashion for the modern Ugandan lifestyle. Crafted with elegance, delivered with care.</p>
          <a href="https://wa.me/256782860372" target="_blank" rel="noopener noreferrer"
            style={{display:"inline-flex",alignItems:"center",gap:7,marginTop:18,padding:"9px 16px",background:"#25D366",color:"#fff",borderRadius:50,textDecoration:"none",fontSize:12,fontWeight:600}}>
            <IC n="wa" sz={14} c="#fff"/> Chat on WhatsApp
          </a>
        </div>
        {[
          {t:"Shop",l:["New Arrivals","Best Sellers","Wedding","Corporate","Accessories","Sale"]},
          {t:"Account",l:["Sign In","Register","My Orders","Wishlist","Loyalty Rewards","Gift Cards"]},
          {t:"Support",l:["Contact Us","Size Guide","Returns","Shipping Info","FAQs","Track Order"]},
        ].map(col=>(
          <div key={col.t}>
            <p className="ll" style={{marginBottom:16}}>{col.t}</p>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {col.l.map(lk=>(
                <a key={lk} href="#" style={{fontSize:13,color:"var(--tm)",textDecoration:"none",transition:"color .2s"}}
                  onMouseEnter={e=>e.target.style.color="var(--gold)"}
                  onMouseLeave={e=>e.target.style.color="var(--tm)"}>{lk}</a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="gd" style={{marginBottom:26}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
        <p style={{fontSize:12,color:"var(--tm)"}}>© 2025 Villa Vogue Fashions. All rights reserved.</p>
        <div style={{display:"flex",gap:18}}>
          {["Privacy","Terms","Cookies"].map(lk=>(
            <a key={lk} href="#" style={{fontSize:12,color:"var(--tm)",textDecoration:"none"}}
              onMouseEnter={e=>e.target.style.color="var(--gold)"}
              onMouseLeave={e=>e.target.style.color="var(--tm)"}>{lk}</a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

const LoginModal = ({open,onClose,onLogin,onStaffLogin}) => {
  const [mode,setMode]=useState("login"); // login | register
  const [ld,setLd]=useState(false);
  const toast=useToast();
  const [form,setForm]=useState({name:"",email:"",phone:"",password:"",confirm:""});
  const fi=(f,v)=>setForm(p=>({...p,[f]:v}));

  const handleLogin=async()=>{
    if(!form.email||!form.password){toast("Please fill in all fields","e","!");return;}
    setLd(true);
    try{await onLogin({email:form.email,password:form.password,isStaff:false});onClose();}
    catch(e){toast(e.response?.data?.message||e.message||"Login failed. Check your email and password.","e","✗");}
    finally{setLd(false);}
  };

  const handleRegister=async()=>{
    if(!form.name||!form.email||!form.phone||!form.password){toast("Please fill in all required fields","e","!");return;}
    if(form.password!==form.confirm){toast("Passwords do not match","e","✗");return;}
    if(form.password.length<6){toast("Password must be at least 6 characters","e","!");return;}
    setLd(true);
    try{
      const res=await fetch(`${BASE_API}/customers/portal/register`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:form.name,email:form.email,phone:form.phone,password:form.password}),
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||data.message||"Registration failed");
      toast("Account created! Please sign in.","ok","✦");
      setMode("login");
      setForm(p=>({...p,name:"",phone:"",password:"",confirm:""}));
    }catch(e){toast(e.message||"Registration failed","e","✗");}
    finally{setLd(false);}
  };

  const inp=(label,field,type="text",placeholder="")=>(
    <div>
      <label style={{fontSize:11,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:"var(--tm)",display:"block",marginBottom:6}}>{label}</label>
      <input className="vi" type={type} value={form[field]} onChange={e=>fi(field,e.target.value)}
        placeholder={placeholder} onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():null)}
        style={{width:"100%",padding:"12px 14px",fontSize:13}}/>
    </div>
  );

  return (
    <AnimatePresence>
      {open&&(
        <motion.div className="mb" onClick={e=>e.target===e.currentTarget&&onClose()}
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{zIndex:2600}}>
          <motion.div initial={{opacity:0,scale:.94,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96}}
            style={{position:"relative",background:"var(--bgs)",backdropFilter:"blur(32px)",border:"1px solid var(--br)",
              borderRadius:"var(--rxl)",padding:"32px 30px",width:"100%",maxWidth:400,boxShadow:"var(--sl)"}}>
            <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"var(--ib)",border:"1px solid var(--br)",borderRadius:8,padding:7,cursor:"pointer",color:"var(--ts)"}}><IC n="x" sz={14}/></button>

            {/* Logo */}
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:300,letterSpacing:".2em",marginBottom:4}}>VILLA VOGUE</div>
              <p className="ll">{mode==="login"?"Welcome Back":"Create Account"}</p>
            </div>

            {/* Tab switcher */}
            <div style={{display:"flex",background:"var(--ib)",borderRadius:50,padding:3,marginBottom:24}}>
              {[{k:"login",l:"Sign In"},{k:"register",l:"Register"}].map(t=>(
                <button key={t.k} onClick={()=>{setMode(t.k);setForm({name:"",email:"",phone:"",password:"",confirm:""});}}
                  style={{flex:1,padding:"8px",borderRadius:50,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,transition:"all .2s",
                    background:mode===t.k?"linear-gradient(135deg,var(--gold-d),var(--gold))":"transparent",
                    color:mode===t.k?"#000":"var(--tm)"}}>
                  {t.l}
                </button>
              ))}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:13,marginBottom:20}}>
              {mode==="register"&&inp("Full Name *","name","text","Jane Nakato")}
              {inp("Email Address *","email","email","jane@example.com")}
              {mode==="register"&&inp("Phone Number *","phone","tel","+256 7XX XXX XXX")}
              {inp("Password *","password","password","••••••••")}
              {mode==="register"&&inp("Confirm Password *","confirm","password","••••••••")}
            </div>

            <motion.button className="bg" onClick={mode==="login"?handleLogin:handleRegister}
              disabled={ld} whileTap={{scale:.97}}
              style={{width:"100%",padding:"13px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:16,opacity:ld?.7:1}}>
              {ld
                ?<><span style={{width:14,height:14,border:"2px solid rgba(0,0,0,.3)",borderTopColor:"#000",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite"}}/>{mode==="login"?"Signing in…":"Creating account…"}</>
                :mode==="login"?<><IC n="user" sz={14}/> Sign In</>:<><IC n="check" sz={14}/> Create Account</>
              }
            </motion.button>

            {mode==="login"&&(
              <p style={{textAlign:"center",fontSize:12,color:"var(--tm)"}}>
                Forgot password? <a href="#" onClick={e=>{e.preventDefault();toast("Contact us on WhatsApp to reset your password","i","💬");}}
                  style={{color:"var(--gold)",textDecoration:"none"}}>Get help</a>
              </p>
            )}

            {/* Staff login separator */}
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid var(--br)",textAlign:"center"}}>
              <p style={{fontSize:11,color:"var(--tm)",marginBottom:8}}>Are you a Villa Vogue staff member?</p>
              <button onClick={()=>{onClose();onStaffLogin?.();}} className="bgh"
                style={{fontSize:12,padding:"7px 18px",display:"inline-flex",alignItems:"center",gap:6}}>
                <IC n="staff" sz={13}/> Staff Login
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AccountDrawer = ({open,onClose,user,orders=[],onLogout}) => {
  const [tab,setTab]=useState("overview");
  const tabs=[
    {k:"overview",l:"Overview",i:"user"},{k:"orders",l:"Orders",i:"pkg"},
    {k:"loyalty",l:"Rewards",i:"award"},{k:"settings",l:"Settings",i:"cog"},
  ];
  const pts=user?.loyalty_points||0;
  const tier=pts>=50000?"VIP":pts>=20000?"Platinum":pts>=5000?"Gold":pts>=1000?"Silver":"Bronze";
  return (
    <AnimatePresence>
      {open&&(
        <>
          <motion.div onClick={onClose} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:"fixed",inset:0,background:"var(--ov)",zIndex:1999}}/>
          <motion.div className="vd" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:26,stiffness:260}}>
            <div style={{padding:"22px 22px 18px",borderBottom:"1px solid var(--br)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,var(--gold-d),var(--gold))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#000"}}>
                    {user?.name?.[0]?.toUpperCase()||"U"}
                  </div>
                  <div>
                    <p style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:400}}>{user?.name||"Guest"}</p>
                    <p style={{fontSize:11,color:"var(--tm)"}}>{user?.email}</p>
                    <span className="lb" style={{marginTop:4,display:"inline-block"}}>{tier}</span>
                  </div>
                </div>
                <button onClick={onClose} style={{background:"var(--ib)",border:"1px solid var(--br)",borderRadius:8,padding:8,cursor:"pointer",color:"var(--ts)"}}><IC n="x" sz={15}/></button>
              </div>
              <div style={{background:"var(--bc)",borderRadius:11,padding:"11px 14px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <span style={{fontSize:11,color:"var(--tm)"}}>Loyalty Points</span>
                  <span style={{fontSize:12,fontWeight:700,color:"var(--gold)"}}>{pts.toLocaleString()} pts</span>
                </div>
                <div className="vp"><div className="vp-f" style={{width:`${Math.min((pts/5000)*100,100)}%`}}/></div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {tabs.map(t=>(
                  <button key={t.k} onClick={()=>setTab(t.k)}
                    style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${tab===t.k?"var(--brg)":"var(--br)"}`,background:tab===t.k?"rgba(201,168,76,.12)":"transparent",color:tab===t.k?"var(--gold)":"var(--tm)",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    <IC n={t.i} sz={11}/> {t.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{padding:"22px"}}>
              {tab==="overview"&&(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {[{l:"Total Orders",v:orders.length||0,i:"pkg"},{l:"Loyalty Tier",v:tier,i:"award"}].map(s=>(
                    <div key={s.l} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:"var(--bc)",border:"1px solid var(--br)",borderRadius:13}}>
                      <div style={{width:38,height:38,borderRadius:"50%",background:"var(--ib)",display:"flex",alignItems:"center",justifyContent:"center"}}><IC n={s.i} sz={17} c="var(--gold)"/></div>
                      <div><p style={{fontSize:11,color:"var(--tm)"}}>{s.l}</p><p style={{fontSize:16,fontWeight:700,color:"var(--gold)"}}>{s.v}</p></div>
                    </div>
                  ))}
                  <button onClick={onLogout} className="bgh" style={{padding:"12px",fontSize:13,color:"rgba(255,80,80,.8)",borderColor:"rgba(255,80,80,.3)",marginTop:6}}>Sign Out</button>
                </div>
              )}
              {tab==="orders"&&(
                <div>
                  <p className="ll" style={{marginBottom:14}}>Order History</p>
                  {orders.length===0?(
                    <div style={{textAlign:"center",padding:"36px 0"}}>
                      <div style={{fontSize:34,marginBottom:10,opacity:.3}}>📦</div>
                      <p style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:300}}>No orders yet</p>
                      <a href="/store" onClick={onClose} style={{display:"inline-block",marginTop:14}}>
                        <button className="bg" style={{padding:"10px 24px",fontSize:13}}>Start Shopping</button>
                      </a>
                    </div>
                  ):orders.map(o=>(
                    <div key={o.id} style={{padding:13,background:"var(--bc)",border:"1px solid var(--br)",borderRadius:13,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:13,fontWeight:600}}>Order #{o.id}</span>
                        <span className="lb">{o.status}</span>
                      </div>
                      <p style={{fontSize:11,color:"var(--tm)"}}>{new Date(o.created_at).toLocaleDateString()}</p>
                      <p style={{fontSize:14,color:"var(--gold)",fontWeight:700,marginTop:4}}>UGX {Number(o.total_amount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
              {tab==="loyalty"&&(
                <div>
                  <p className="ll" style={{marginBottom:14}}>Your Rewards</p>
                  <div style={{background:"linear-gradient(135deg,var(--gold-d),var(--gold))",borderRadius:16,padding:"20px",marginBottom:18,color:"#000"}}>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",marginBottom:6,opacity:.7}}>Current Tier</div>
                    <div style={{fontFamily:"var(--fd)",fontSize:28,fontWeight:400}}>{tier}</div>
                    <div style={{fontSize:14,fontWeight:700,marginTop:6}}>{pts.toLocaleString()} points</div>
                  </div>
                  <p style={{fontSize:13,color:"var(--ts)",lineHeight:1.7}}>Earn 1 point for every UGX 1,000 spent. Redeem for discounts, free shipping, and exclusive perks.</p>
                  <a href="/store" onClick={onClose} style={{display:"block",marginTop:14,textDecoration:"none"}}>
                    <button className="bg" style={{width:"100%",padding:"13px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}><IC n="gift" sz={14}/> Earn More Points</button>
                  </a>
                </div>
              )}
              {tab==="settings"&&(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <p className="ll">Profile Settings</p>
                  {["Full Name","Email Address","Phone Number"].map(f=>(
                    <div key={f}>
                      <label style={{fontSize:11,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:"var(--tm)",display:"block",marginBottom:6}}>{f}</label>
                      <input className="vi" defaultValue={f==="Full Name"?user?.name:f==="Email Address"?user?.email:user?.phone||""} placeholder={f} style={{width:"100%",padding:"11px 13px",fontSize:13}}/>
                    </div>
                  ))}
                  <button className="bg" style={{padding:"12px",fontSize:13,marginTop:4}}>Save Changes</button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const WhatsAppFloat = () => (
  <motion.a href="https://wa.me/256782860372?text=Hello! I need help with a Villa Vogue order."
    target="_blank" rel="noopener noreferrer" className="wf"
    initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}}
    transition={{delay:2,type:"spring"}} whileHover={{scale:1.12}}
    title="Chat on WhatsApp" aria-label="WhatsApp support">
    <IC n="wa" sz={27} c="#fff"/>
  </motion.a>
);

const PortalShell = ({
  user,products=[],orders=[],
  onLogin,onLogout,onStaffLogin,
  onAddToCart:extAdd,
  onRemoveFromCart:extRemove,
  onUpdateCartQty:extUpdate,
  loading=false,
}) => {
  const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem("vv_cart")||"[]");}catch{return [];}});
  const [wl,setWl]=useState(()=>{try{return JSON.parse(localStorage.getItem("vv_wishlist")||"[]");}catch{return [];}});
  const [cartOpen,setCartOpen]=useState(false);
  const [wlOpen,setWlOpen]=useState(false);
  const [srchOpen,setSrchOpen]=useState(false);
  const [loginOpen,setLoginOpen]=useState(false);
  const [staffMode,setStaffMode]=useState(false);
  const [acctOpen,setAcctOpen]=useState(false);
  const [qvProd,setQvProd]=useState(null);
  const [checkoutOpen,setCheckoutOpen]=useState(false);

  useEffect(()=>{localStorage.setItem("vv_cart",JSON.stringify(cart));},[cart]);
  useEffect(()=>{localStorage.setItem("vv_wishlist",JSON.stringify(wl));},[wl]);

  const addToCart=useCallback((p)=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.id===p.id&&i.selectedSize===p.selectedSize);
      if(ex)return prev.map(i=>i.id===p.id&&i.selectedSize===p.selectedSize?{...i,qty:i.qty+(p.qty||1)}:i);
      return [...prev,{...p,qty:p.qty||1}];
    });
    extAdd?.(p);
  },[extAdd]);

  const removeFromCart=useCallback((id)=>{setCart(p=>p.filter(i=>i.id!==id));extRemove?.(id);},[extRemove]);
  const updateQty=useCallback((id,qty)=>{if(qty<1)return removeFromCart(id);setCart(p=>p.map(i=>i.id===id?{...i,qty}:i));extUpdate?.(id,qty);},[removeFromCart,extUpdate]);
  const toggleWl=useCallback((p)=>{setWl(prev=>prev.some(i=>i.id===p.id)?prev.filter(i=>i.id!==p.id):[...prev,p]);},[]);

  const handleLogin=useCallback(async(creds)=>{
    if(onLogin)return onLogin(creds);
    window.location.href=creds.isStaff?"/staff/login":"/login";
  },[onLogin]);

  const handleStaffLogin=useCallback(()=>{
    if(onStaffLogin){onStaffLogin();return;}
    setStaffMode(true);setLoginOpen(true);
  },[onStaffLogin]);

  return (
    <div className="vv-portal">
      <Navbar user={user} cart={cart} wishlist={wl}
        onLogin={()=>{setStaffMode(false);setLoginOpen(true);}}
        onStaffLogin={handleStaffLogin}
        onCartOpen={()=>setCartOpen(true)}
        onWishlistOpen={()=>setWlOpen(true)}
        onSearchOpen={()=>setSrchOpen(true)}
        onAccountOpen={()=>setAcctOpen(true)}/>
      <main>
        <HeroSection onShopNow={()=>document.getElementById("featured")?.scrollIntoView({behavior:"smooth"})}/>
        <CollectionsSection/>
        <div id="featured"><FeaturedProducts products={products} wishlist={wl} onAddToCart={addToCart} onQuickView={setQvProd} onWishlistToggle={toggleWl} loading={loading}/></div>
        <AboutSection/>
        <OrderTracking orders={orders}/>
        <LoyaltySection user={user}/>
        <Testimonials/>
        <Newsletter/>
      </main>
      <Footer/>
      <AnimatePresence>{srchOpen&&<SearchOverlay open={srchOpen} onClose={()=>setSrchOpen(false)} products={products}/>}</AnimatePresence>
      <CartDrawer open={cartOpen} onClose={()=>setCartOpen(false)} cart={cart} onUpdateQty={updateQty} onRemove={removeFromCart} onCheckout={()=>setCheckoutOpen(true)}/>
      <WishlistDrawer open={wlOpen} onClose={()=>setWlOpen(false)} wishlist={wl} onRemove={id=>setWl(p=>p.filter(i=>i.id!==id))} onAddToCart={addToCart}/>
      <AccountDrawer open={acctOpen} onClose={()=>setAcctOpen(false)} user={user} orders={orders} onLogout={onLogout}/>
      <QuickViewModal product={qvProd} open={!!qvProd} onClose={()=>setQvProd(null)} onAddToCart={addToCart}
        onOrderOnline={(item)=>{ addToCart(item); setCheckoutOpen(true); }}/>
      <LoginModal open={loginOpen} onClose={()=>setLoginOpen(false)} onLogin={handleLogin} onStaffLogin={handleStaffLogin}/>
      <CheckoutModal open={checkoutOpen} onClose={()=>setCheckoutOpen(false)} cart={cart} user={user} onUpdateQty={updateQty} onRemove={removeFromCart}
        onOrderPlaced={()=>{ setCart([]); localStorage.removeItem("vv_cart"); }}/>
      <WhatsAppFloat/>
    </div>
  );
};

const CustomerPortal = (props) => {
  const [theme,setTheme]=useState(()=>{
    try{
      const s=localStorage.getItem("vv_theme");
      if(s){
        // Apply immediately — before first paint — so CSS vars are available instantly
        document.body.classList.remove("vv-dark","vv-light");
        document.body.classList.add(`vv-${s}`);
        return s;
      }
      const preferred = window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light";
      document.body.classList.remove("vv-dark","vv-light");
      document.body.classList.add(`vv-${preferred}`);
      return preferred;
    }catch{
      document.body.classList.add("vv-dark");
      return "dark";
    }
  });
  useEffect(()=>{
    document.body.classList.remove("vv-dark","vv-light");
    document.body.classList.add(`vv-${theme}`);
    try{localStorage.setItem("vv_theme",theme);}catch{}
  },[theme]);
  const toggleTheme=useCallback(()=>setTheme(t=>t==="dark"?"light":"dark"),[]);
  return (
    <ThemeContext.Provider value={{theme,toggleTheme}}>
      <GlobalStyles/>
      <ToastProvider>
        <PortalShell {...props}/>
      </ToastProvider>
    </ThemeContext.Provider>
  );
};

export default CustomerPortal;
export { PortalShell, ProductCard, CartDrawer, WishlistDrawer, QuickViewModal, SearchOverlay, AccountDrawer, LoginModal, Navbar, IC as Icon, Stars as StarRating, Reveal, SkCard as SkeletonCard, ThemeToggle, useTheme, useToast };
