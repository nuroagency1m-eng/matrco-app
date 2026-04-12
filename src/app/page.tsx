'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, TrendingUp, Megaphone, Store, Layers, ArrowRight, Globe, Users, BarChart3, Star, Quote, GraduationCap, Share2, Zap, MessageCircle } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE CANVAS
// ─────────────────────────────────────────────────────────────────────────────
function ParticleCanvas({ mouseRef }: { mouseRef: React.MutableRefObject<{x:number,y:number}> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let animId: number
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize(); window.addEventListener('resize', resize)
    type P = { x:number; y:number; vx:number; vy:number; r:number; alpha:number }
    const pts: P[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random()-.5)*.28, vy: (Math.random()-.5)*.28,
      r: Math.random()*1.4+.4, alpha: Math.random()*.35+.08,
    }))
    const frame = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      const mx = mouseRef.current.x, my = mouseRef.current.y
      for (const p of pts) {
        const dx=p.x-mx, dy=p.y-my, d2=dx*dx+dy*dy
        if (d2<10000) { const d=Math.sqrt(d2),f=(100-d)/100; p.vx+=(dx/d)*f*.2; p.vy+=(dy/d)*f*.2 }
        p.vx*=.986; p.vy*=.986; p.x+=p.vx; p.y+=p.vy
        if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0
        if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle=`rgba(210,3,221,${p.alpha})`; ctx.fill()
      }
      for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) {
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy)
        if (d<120) { ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.strokeStyle=`rgba(210,3,221,${(1-d/120)*.08})`; ctx.lineWidth=.5; ctx.stroke() }
      }
      animId = requestAnimationFrame(frame)
    }
    frame()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize',resize) }
  }, [mouseRef])
  return <canvas ref={canvasRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0 }} />
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────────────────────────────────────
function Counter({ target, suffix, visible }: { target:number; suffix:string; visible:boolean }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!visible) return
    let cur=0; const step=Math.max(1,Math.floor(target/80))
    const t=setInterval(()=>{ cur=Math.min(cur+step,target); setVal(cur); if(cur>=target)clearInterval(t) },14)
    return ()=>clearInterval(t)
  },[visible,target])
  return <>{val.toLocaleString()}{suffix}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE CHAT SIMULATION
// ─────────────────────────────────────────────────────────────────────────────
const CHAT_SCRIPT = [
  { from:'user',  text:'Hola, ¿tienen productos de skincare?' },
  { from:'bot',   text:'¡Hola! 👋 Claro que sí. Tenemos la línea completa. ¿Buscas hidratación, anti-age o limpieza?' },
  { from:'user',  text:'Anti-age, para piel mixta' },
  { from:'bot',   text:'Perfecto ✨ Te recomiendo el Sérum Retinol Pro + Crema Day Repair. Pack completo: $47 USD con envío incluido 📦' },
  { from:'user',  text:'¿Hacen envíos a México?' },
  { from:'bot',   text:'¡Sí! 🇲🇽 Enviamos a todo México en 3-5 días hábiles. ¿Te lo mando al carrito?' },
  { from:'user',  text:'Sí, agrégalo por favor' },
  { from:'bot',   text:'¡Listo! 🛒 Carrito actualizado. Puedes pagar por transferencia o cripto. ¿Alguna otra consulta?' },
]

function LiveChatSim() {
  const [messages, setMessages] = useState<typeof CHAT_SCRIPT>([])
  const [typing, setTyping] = useState(false)
  const [step, setStep] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step >= CHAT_SCRIPT.length) {
      // restart after pause
      const t = setTimeout(() => { setMessages([]); setStep(0) }, 3000)
      return () => clearTimeout(t)
    }
    const msg = CHAT_SCRIPT[step]
    const delay = step === 0 ? 800 : msg.from === 'bot' ? 1200 : 700

    const t1 = setTimeout(() => {
      if (msg.from === 'bot') {
        setTyping(true)
        const t2 = setTimeout(() => {
          setTyping(false)
          setMessages(prev => [...prev, msg])
          setStep(s => s + 1)
        }, 1400)
        return () => clearTimeout(t2)
      } else {
        setMessages(prev => [...prev, msg])
        setStep(s => s + 1)
      }
    }, delay)
    return () => clearTimeout(t1)
  }, [step])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  return (
    <div style={{ width: '100%', maxWidth: 340, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#0D0B1A', boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 40px rgba(210,3,221,0.08)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a0d2e, #0D0B1A)', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #D203DD, #9B00FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot size={18} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>Asistente MY DIAMOND</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF88' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>En línea · responde al instante</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ height: 280, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8, scrollbarWidth: 'none' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '8px 12px', borderRadius: m.from === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.from === 'user' ? 'linear-gradient(135deg, #D203DD, #9B00FF)' : 'rgba(255,255,255,0.07)',
              border: m.from === 'bot' ? '1px solid rgba(255,255,255,0.08)' : 'none',
              fontSize: 12, color: '#fff', lineHeight: 1.5,
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#D203DD', animation: `typing-dot 1.2s ${i*0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, background: '#0D0B1A' }}>
        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          Escribe un mensaje...
        </div>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #D203DD, #9B00FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowRight size={13} color="#fff" />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW CARDS
// ─────────────────────────────────────────────────────────────────────────────
const REVIEWS = [
  { name:'María González',  country:'México',    flag:'🇲🇽', avatar:'MG', color:'#00FF88', role:'Emprendedora digital',   text:'Antes perdía clientes por no responder a tiempo. Ahora mi bot atiende 24/7 y mis ventas crecieron un 280% en 60 días.' },
  { name:'Carlos Mendoza',  country:'Colombia',  flag:'🇨🇴', avatar:'CM', color:'#D203DD', role:'Marketing Digital',       text:'Lancé mi primera campaña de Meta Ads con IA y en una semana ya tenía leads. La plataforma hace el trabajo duro por ti.' },
  { name:'Ana Paula Silva', country:'Brasil',    flag:'🇧🇷', avatar:'AP', color:'#9B00FF', role:'Empresária',              text:'Automatizei meu negócio completo: bot, loja e anúncios. Hoje ganho enquanto viajo. MY DIAMOND mudou minha vida!' },
  { name:'James Rivera',    country:'USA',       flag:'🇺🇸', avatar:'JR', color:'#D203DD', role:'Online Business Owner',   text:'The AI bots are incredible. My store sells automatically while I sleep. Best investment I made for my business this year.' },
  { name:'Luisa Fernández', country:'Venezuela', flag:'🇻🇪', avatar:'LF', color:'#00FF88', role:'Vendedora online',        text:'Configuré mi tienda en una tarde. Al día siguiente ya tenía mis primeras ventas. Simple, potente y rentable.' },
  { name:'Diego Sánchez',   country:'Argentina', flag:'🇦🇷', avatar:'DS', color:'#9B00FF', role:'Empresario',              text:'Lo que más me sorprendió fue la velocidad. En 2 días tenía bot, landing y campaña activos. Resultados desde el primer mes.' },
  { name:'Sofía Lagos',     country:'Chile',     flag:'🇨🇱', avatar:'SL', color:'#D203DD', role:'Emprendedora',            text:'Sin experiencia técnica armé todo en un fin de semana. El soporte siempre responde y las herramientas son realmente buenas.' },
  { name:'Roberto Castillo',country:'Perú',      flag:'🇵🇪', avatar:'RC', color:'#00FF88', role:'Networker',               text:'Mis referidos crecen solos gracias al sistema. Los retiros llegan puntuales y el panel de comisiones es muy transparente.' },
  { name:'Valentina Moreno',country:'Ecuador',   flag:'🇪🇨', avatar:'VM', color:'#9B00FF', role:'Coach de negocios',       text:'Mi landing page convierte el triple que antes. Los textos los genera la IA y el diseño es profesional desde el primer intento.' },
  { name:'Felipe Aguirre',  country:'España',    flag:'🇪🇸', avatar:'FA', color:'#D203DD', role:'Consultor digital',       text:'Desde España manejo clientes en LATAM con los bots. La diferencia horaria ya no es problema. Mis ventas no paran.' },
  { name:'Isabella Costa',  country:'Brasil',    flag:'🇧🇷', avatar:'IC', color:'#00FF88', role:'Influencer de negócios',  text:'Em 3 meses recuperei o investimento e hoje lucro consistentemente. As ferramentas de IA são de outro nível mesmo.' },
  { name:'Andrés Torres',   country:'Bolivia',   flag:'🇧🇴', avatar:'AT', color:'#9B00FF', role:'Comerciante',             text:'Tenía miedo de la tecnología pero MY DIAMOND es muy intuitivo. Ahora mi negocio opera solo mientras yo construyo mi equipo.' },
]
const ROW1 = REVIEWS.slice(0,6), ROW2 = REVIEWS.slice(6,12)

function ReviewCard({ r }: { r: typeof REVIEWS[0] }) {
  return (
    <div style={{ flexShrink:0, width:290, background:`linear-gradient(135deg, ${r.color}08, rgba(255,255,255,0.012))`, border:`1px solid ${r.color}18`, borderRadius:20, padding:'18px 20px', position:'relative', overflow:'hidden', marginRight:14, cursor:'default' }}>
      <div style={{ position:'absolute', top:0, left:20, right:20, height:1, background:`linear-gradient(90deg, transparent, ${r.color}50, transparent)` }} />
      <div style={{ position:'absolute', top:12, right:14, opacity:.06 }}><Quote size={26} style={{ color:r.color }} /></div>
      <div style={{ display:'flex', gap:3, marginBottom:10 }}>
        {[0,1,2,3,4].map(i => <Star key={i} size={11} style={{ color:'#FFD700', fill:'#FFD700' }} />)}
      </div>
      <p style={{ fontSize:11.5, lineHeight:1.75, color:'rgba(255,255,255,0.55)', marginBottom:14, minHeight:72 }}>"{r.text}"</p>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg, ${r.color}25, ${r.color}08)`, border:`1px solid ${r.color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:9, fontWeight:800, color:r.color }}>{r.avatar}</span>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{r.name}</span>
            <span style={{ fontSize:13 }}>{r.flag}</span>
          </div>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{r.role} · {r.country}</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon:Bot,           title:'Bot de Ventas IA',          desc:'Responde, asesora y cierra ventas en WhatsApp las 24 horas. Personalizado con tu marca, tono y productos. Nunca pierdas un cliente.',     color:'#00FF88', glow:'rgba(0,255,136,0.15)' },
  { icon:Megaphone,     title:'Campañas con IA',            desc:'Crea anuncios en Meta, Google y TikTok en minutos. La IA genera los textos, imágenes y segmentación. Tú solo defines el presupuesto.',    color:'#D203DD', glow:'rgba(210,3,221,0.15)' },
  { icon:Store,         title:'Tienda Virtual Propia',      desc:'Tu catálogo online con tu branding. Conectada a WhatsApp para cerrar ventas al instante. Sin comisiones, todo tuyo.',                      color:'#9B00FF', glow:'rgba(155,0,255,0.15)' },
  { icon:Layers,        title:'Landing Pages Inteligentes', desc:'Páginas de alta conversión generadas con IA. Captura leads, muestra tu oferta y vende — listas en segundos sin escribir código.',         color:'#00FF88', glow:'rgba(0,255,136,0.15)' },
  { icon:GraduationCap, title:'Academia Exclusiva',         desc:'Cursos de ventas, marketing digital y negocios online. Aprende de los mejores y aplica desde el primer día con soporte en vivo.',         color:'#D203DD', glow:'rgba(210,3,221,0.15)' },
  { icon:TrendingUp,    title:'Ingresos Pasivos',           desc:'Construye tu red y cobra comisiones automáticas. Cada miembro activo suma a tu ingreso mensual. Transparente, en tiempo real.',            color:'#9B00FF', glow:'rgba(155,0,255,0.15)' },
  { icon:Share2,        title:'Clipping y Contenido',       desc:'Publica clips en múltiples redes y gana por cada mil vistas. Tu contenido trabaja por ti generando visibilidad e ingresos.',              color:'#00FF88', glow:'rgba(0,255,136,0.15)' },
  { icon:Globe,         title:'Red Internacional',          desc:'Opera desde cualquier país de Latinoamérica. Tus clientes, tu equipo y tus ganancias sin fronteras. La oportunidad no tiene límites.',     color:'#D203DD', glow:'rgba(210,3,221,0.15)' },
  { icon:Zap,           title:'Automatización Total',       desc:'Conecta tus herramientas, define tus flujos y deja que el sistema trabaje. Más tiempo para ti, más ingresos sin más esfuerzo.',            color:'#9B00FF', glow:'rgba(155,0,255,0.15)' },
]

const STATS = [
  { icon:Users,        value:5000, suffix:'+',   label:'Miembros activos' },
  { icon:MessageCircle,value:2000000, suffix:'+',label:'Mensajes enviados' },
  { icon:Globe,        value:18,   suffix:' países', label:'Presencia global' },
  { icon:BarChart3,    value:3,    suffix:' plataformas', label:'Publicidad digital' },
]


// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const mouseRef  = useRef({ x:-9999, y:-9999 })
  const heroRef   = useRef<HTMLElement>(null)
  const statsRef  = useRef<HTMLElement>(null)
  const featRef   = useRef<HTMLElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const [featVisible,  setFeatVisible]  = useState(false)

  useEffect(() => {
    const hero = heroRef.current; if (!hero) return
    const h = (e: MouseEvent) => { const r=hero.getBoundingClientRect(); mouseRef.current={x:e.clientX-r.left,y:e.clientY-r.top} }
    hero.addEventListener('mousemove',h)
    hero.addEventListener('mouseleave',()=>{ mouseRef.current={x:-9999,y:-9999} })
    return ()=>hero.removeEventListener('mousemove',h)
  },[])

  useEffect(() => {
    const ob=new IntersectionObserver(([e])=>{ if(e.isIntersecting){setStatsVisible(true);ob.disconnect()} },{threshold:.3})
    if(statsRef.current) ob.observe(statsRef.current)
    return ()=>ob.disconnect()
  },[])

  useEffect(() => {
    const ob=new IntersectionObserver(([e])=>{ if(e.isIntersecting){setFeatVisible(true);ob.disconnect()} },{threshold:.06})
    if(featRef.current) ob.observe(featRef.current)
    return ()=>ob.disconnect()
  },[])

  return (
    <div style={{ background:'#1C192C', fontFamily:"'Inter', system-ui, sans-serif", color:'#fff', minHeight:'100vh', overflowX:'hidden' }}>

      <style>{`
        @keyframes typing-dot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }
        @keyframes btn-grad { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .btn-primary {
          background: linear-gradient(135deg,#D203DD,#9B00FF,#00FF88,#D203DD) !important;
          background-size: 300% 300% !important;
          animation: btn-grad 4s ease infinite !important;
          color: #fff !important; font-weight: 800 !important;
          transition: transform .18s, box-shadow .18s !important;
        }
        .btn-primary:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 40px rgba(210,3,221,0.35) !important; }
        .btn-secondary { transition: all .2s !important; }
        .btn-secondary:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.3) !important; transform: translateY(-2px) !important; }
        @keyframes float-a { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes slide-up { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes reveal-card { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .feat-card { opacity:0; }
        .feat-card.visible { animation: reveal-card .5s cubic-bezier(.22,1,.36,1) both; }
        @keyframes mq-l { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes mq-r { 0%{transform:translateX(-50%)} 100%{transform:translateX(0)} }
        .mq-left  { display:flex; width:max-content; animation:mq-l 34s linear infinite; }
        .mq-right { display:flex; width:max-content; animation:mq-r 30s linear infinite; }
        .mq-left:hover,.mq-right:hover { animation-play-state:paused; }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.8);opacity:0} }
        .pulse-ring { animation: pulse-ring 2s ease-out infinite; }
        @keyframes glow-line { 0%,100%{opacity:.3} 50%{opacity:.8} }
        .plan-card { transition: transform .25s, border-color .25s, box-shadow .25s; }
        .plan-card:hover { transform: translateY(-6px); }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'rgba(28,25,44,0.88)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
              <img src="/logo.png" alt="MY DIAMOND" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            </div>
            <span style={{ fontSize:13, fontWeight:900, letterSpacing:'0.18em', color:'#fff' }}>MY DIAMOND</span>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Link href="/login" style={{ padding:'8px 18px', borderRadius:10, fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.6)', textDecoration:'none', border:'1px solid rgba(255,255,255,0.1)', transition:'all .2s' }}
              className="btn-secondary">
              Iniciar sesión
            </Link>
            <Link href="/register" style={{ padding:'8px 18px', borderRadius:10, fontSize:13, fontWeight:700, color:'#fff', textDecoration:'none', background:'linear-gradient(135deg,#D203DD,#9B00FF)' }}
              className="btn-primary">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', paddingTop:80, overflow:'hidden' }}>
        <ParticleCanvas mouseRef={mouseRef} />

        {/* Glows */}
        <div style={{ position:'absolute', top:'20%', left:'10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(210,3,221,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'10%', right:'5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,255,136,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{ maxWidth:1200, margin:'0 auto', padding:'60px 24px', display:'flex', alignItems:'center', gap:60, flexWrap:'wrap', position:'relative', zIndex:1 }}>

          {/* Left */}
          <div style={{ flex:1, minWidth:300, animation:'slide-up .8s cubic-bezier(.22,1,.36,1) both' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:99, background:'rgba(210,3,221,0.1)', border:'1px solid rgba(210,3,221,0.25)', marginBottom:24 }}>
              <div style={{ position:'relative', width:8, height:8 }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#00FF88' }} />
                <div className="pulse-ring" style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid #00FF88' }} />
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.7)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Plataforma de negocios digitales</span>
            </div>

            <h1 style={{ fontSize:'clamp(32px, 5vw, 58px)', fontWeight:900, lineHeight:1.08, letterSpacing:'-0.02em', marginBottom:20 }}>
              Tu negocio vende<br />
              <span style={{ background:'linear-gradient(135deg, #D203DD, #9B00FF, #00FF88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                mientras tú descansas
              </span>
            </h1>

            <p style={{ fontSize:16, lineHeight:1.7, color:'rgba(255,255,255,0.45)', marginBottom:36, maxWidth:480 }}>
              Bots de WhatsApp con IA, tiendas virtuales, campañas publicitarias y más — todo en una sola plataforma. Automatiza, vende y escala sin límites desde cualquier parte del mundo.
            </p>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:40 }}>
              <Link href="/register" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:14, fontSize:14, textDecoration:'none' }} className="btn-primary">
                Comenzar ahora <ArrowRight size={15} />
              </Link>
              <Link href="/login" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:14, fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.6)', textDecoration:'none', border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.03)' }} className="btn-secondary">
                Iniciar sesión
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
              {[
                { icon:'🌍', text:'18 países' },
                { icon:'🤖', text:'IA integrada' },
                { icon:'💳', text:'Sin tarjeta' },
              ].map(b => (
                <div key={b.text} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:14 }}>{b.icon}</span>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontWeight:600 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Chat sim */}
          <div style={{ flex:1, minWidth:300, display:'flex', justifyContent:'center', animation:'float-a 5s ease-in-out infinite' }}>
            <LiveChatSim />
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{ background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'48px 24px' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:32 }}>
          {STATS.map((s,i) => {
            const Icon = s.icon
            const colors = ['#D203DD','#00FF88','#9B00FF','#00BFFF']
            const c = colors[i % colors.length]
            return (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ width:44, height:44, borderRadius:12, background:`${c}12`, border:`1px solid ${c}25`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <Icon size={20} style={{ color:c }} />
                </div>
                <p style={{ fontSize:32, fontWeight:900, color:'#fff', lineHeight:1, marginBottom:4 }}>
                  <Counter target={s.value} suffix={s.suffix} visible={statsVisible} />
                </p>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section ref={featRef} style={{ padding:'96px 24px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'rgba(210,3,221,0.7)', textTransform:'uppercase', marginBottom:12 }}>Herramientas que generan resultados</p>
            <h2 style={{ fontSize:'clamp(26px, 4vw, 44px)', fontWeight:900, letterSpacing:'-0.02em', lineHeight:1.1 }}>
              Todo lo que necesitas<br />
              <span style={{ background:'linear-gradient(135deg,#D203DD,#9B00FF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>en un solo lugar</span>
            </h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
            {FEATURES.map((f,i) => {
              const Icon = f.icon
              return (
                <div key={i} className={`feat-card${featVisible ? ' visible' : ''}`}
                  style={{ animationDelay:`${i*0.06}s`, padding:'24px', borderRadius:20, background:`linear-gradient(135deg, ${f.color}06, rgba(255,255,255,0.015))`, border:`1px solid ${f.color}15`, position:'relative', overflow:'hidden', transition:'transform .25s, border-color .25s', cursor:'default' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.borderColor=f.color+'35' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(0)'; (e.currentTarget as HTMLDivElement).style.borderColor=f.color+'15' }}>
                  <div style={{ position:'absolute', top:0, left:16, right:16, height:1, background:`linear-gradient(90deg, transparent, ${f.color}50, transparent)` }} />
                  <div style={{ width:44, height:44, borderRadius:14, background:`${f.color}12`, border:`1px solid ${f.color}25`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                    <Icon size={20} style={{ color:f.color }} />
                  </div>
                  <p style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:8 }}>{f.title}</p>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.65 }}>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ──────────────────────────────────────────────────────── */}
      <section style={{ padding:'96px 0', background:'rgba(0,0,0,0.15)', overflow:'hidden' }}>
        <div style={{ textAlign:'center', marginBottom:48, padding:'0 24px' }}>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'rgba(0,255,136,0.7)', textTransform:'uppercase', marginBottom:12 }}>Lo que dicen nuestros miembros</p>
          <h2 style={{ fontSize:'clamp(26px, 4vw, 44px)', fontWeight:900, letterSpacing:'-0.02em' }}>
            Resultados reales de{' '}
            <span style={{ background:'linear-gradient(135deg,#00FF88,#00BFFF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>personas reales</span>
          </h2>
        </div>
        <div style={{ overflow:'hidden', marginBottom:14, maskImage:'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div className="mq-left">{[...ROW1,...ROW1].map((r,i)=><ReviewCard key={i} r={r} />)}</div>
        </div>
        <div style={{ overflow:'hidden', maskImage:'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div className="mq-right">{[...ROW2,...ROW2].map((r,i)=><ReviewCard key={i} r={r} />)}</div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding:'96px 24px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, rgba(210,3,221,0.07) 0%, transparent 65%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:680, margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:'linear-gradient(135deg,#D203DD,#9B00FF)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', boxShadow:'0 16px 48px rgba(210,3,221,0.3)' }}>
            <Zap size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize:'clamp(28px, 4vw, 48px)', fontWeight:900, letterSpacing:'-0.02em', marginBottom:16, lineHeight:1.1 }}>
            Tu momento es{' '}
            <span style={{ background:'linear-gradient(135deg,#D203DD,#9B00FF,#00FF88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ahora</span>
          </h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.4)', lineHeight:1.7, marginBottom:36 }}>
            Miles de emprendedores en Latinoamérica ya automatizaron sus negocios con MY DIAMOND. Únete hoy y empieza a generar ingresos desde el primer día.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/register" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'16px 36px', borderRadius:16, fontSize:15, textDecoration:'none', boxShadow:'0 8px 32px rgba(210,3,221,0.25)' }} className="btn-primary">
              Unirme a MY DIAMOND <ArrowRight size={16} />
            </Link>
          </div>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.2)', marginTop:20 }}>Sin tarjeta de crédito · Acceso inmediato · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.05)', padding:'32px 24px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
              <img src="/logo.png" alt="MY DIAMOND" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            </div>
            <span style={{ fontSize:12, fontWeight:800, letterSpacing:'0.15em', color:'rgba(255,255,255,0.5)' }}>MY DIAMOND</span>
          </div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>© {new Date().getFullYear()} MY DIAMOND · Todos los derechos reservados</p>
          <div style={{ display:'flex', gap:16 }}>
            <Link href="/login" style={{ fontSize:12, color:'rgba(255,255,255,0.3)', textDecoration:'none' }}>Iniciar sesión</Link>
            <Link href="/register" style={{ fontSize:12, color:'rgba(255,255,255,0.3)', textDecoration:'none' }}>Registrarse</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
