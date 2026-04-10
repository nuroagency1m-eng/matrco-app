'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NotificationBell from './NotificationBell'

const serviceItems = [
  { href: '/dashboard/services/ads',           iconClass: 'fa-solid fa-bullhorn',     label: 'Ads' },
  { href: '/dashboard/services/whatsapp',      iconClass: 'fa-brands fa-whatsapp',    label: 'Agentes de AI' },
  { href: '/dashboard/services/social',        iconClass: 'fa-solid fa-share-nodes',  label: 'Social' },
  { href: '/dashboard/services/landing-pages', iconClass: 'fa-solid fa-file',         label: 'Landing' },
  { href: '/dashboard/services/virtual-store', iconClass: 'fa-solid fa-shop',         label: 'Tienda' },
  { href: '/dashboard/services/clipping',      iconClass: 'fa-solid fa-newspaper',    label: 'Clipping' },
]

const academyItems = [
  { href: '/dashboard/courses',  iconClass: 'fa-solid fa-book-open',  label: 'Cursos' },
  { href: '/dashboard/podcasts', iconClass: 'fa-solid fa-microphone', label: 'Podcasts' },
]

const mainItemsBottom = [
  { href: '/dashboard/store',  iconClass: 'fa-solid fa-bag-shopping', label: 'Shop' },
  { href: '/dashboard/wallet', iconClass: 'fa-solid fa-wallet',       label: 'Créditos AI' },
]

const mobileNavItems = [
  { href: '/dashboard',         iconClass: 'fa-solid fa-house',        label: 'Inicio' },
  { href: '/dashboard/services',iconClass: 'fa-solid fa-th-large',     label: 'Servicios' },
  { href: '/dashboard/academy', iconClass: 'fa-solid fa-graduation-cap', label: 'Academy' },
  { href: '/dashboard/store',   iconClass: 'fa-solid fa-bag-shopping', label: 'Shop' },
  { href: '/dashboard/wallet',  iconClass: 'fa-solid fa-wallet',       label: 'Créditos AI' },
]

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}

export default function Navbar() {
  const pathname = usePathname()
  const isInServices = pathname.startsWith('/dashboard/services')
  const isInAcademy  = pathname.startsWith('/dashboard/courses') || pathname.startsWith('/dashboard/podcasts') || pathname === '/dashboard/academy'

  const [servicesOpen, setServicesOpen] = useState(isInServices)
  const [academyOpen,  setAcademyOpen]  = useState(isInAcademy)

  return (
    <>
      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="sidebar hidden lg:flex" aria-label="Barra lateral">
        <Link href="/dashboard" className="sidebar__logo">
          <div className="sidebar__logo-ring">
            <img src="/logo.png" alt="MY DIAMOND" />
          </div>
          <div className="sidebar__logo-info">
            <span className="sidebar__logo-jd">MY</span>
            <span className="sidebar__logo-intl">DIAMOND</span>
            <span className="sidebar__logo-badge"><span className="u-live-dot"></span>&nbsp;Premium</span>
          </div>
        </Link>

        <nav className="sidebar__nav" aria-label="Menú">

          {/* Inicio */}
          <Link href="/dashboard" className={`nav-item ${pathname === '/dashboard' ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon"><i className="fa-solid fa-house"></i></span>
            <span className="nav-item__label">Inicio</span>
            <span className="nav-item__dot"></span>
          </Link>

          {/* Servicios colapsable */}
          <button
            onClick={() => setServicesOpen(o => !o)}
            className={`nav-item ${isInServices ? 'nav-item--active' : ''}`}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="nav-item__icon"><i className="fa-solid fa-th-large"></i></span>
            <span className="nav-item__label">Servicios</span>
            <i className="fa-solid fa-chevron-down" style={{
              fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto',
              transition: 'transform 0.2s ease',
              transform: servicesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}></i>
          </button>
          {servicesOpen && (
            <div style={{ paddingLeft: 10 }}>
              {serviceItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'nav-item--active' : ''}`} style={{ fontSize: '0.78rem', padding: '8px 10px' }}>
                    <span className="nav-item__icon" style={{ width: 26, height: 26, fontSize: '0.72rem' }}><i className={item.iconClass}></i></span>
                    <span className="nav-item__label">{item.label}</span>
                    <span className="nav-item__dot"></span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Academy colapsable */}
          <button
            onClick={() => setAcademyOpen(o => !o)}
            className={`nav-item ${isInAcademy ? 'nav-item--active' : ''}`}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="nav-item__icon"><i className="fa-solid fa-graduation-cap"></i></span>
            <span className="nav-item__label">Academy</span>
            <i className="fa-solid fa-chevron-down" style={{
              fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto',
              transition: 'transform 0.2s ease',
              transform: academyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}></i>
          </button>
          {academyOpen && (
            <div style={{ paddingLeft: 10 }}>
              {academyItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'nav-item--active' : ''}`} style={{ fontSize: '0.78rem', padding: '8px 10px' }}>
                    <span className="nav-item__icon" style={{ width: 26, height: 26, fontSize: '0.72rem' }}><i className={item.iconClass}></i></span>
                    <span className="nav-item__label">{item.label}</span>
                    <span className="nav-item__dot"></span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Shop / Wallet */}
          {mainItemsBottom.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'nav-item--active' : ''}`}>
                <span className="nav-item__icon"><i className={item.iconClass}></i></span>
                <span className="nav-item__label">{item.label}</span>
                <span className="nav-item__dot"></span>
              </Link>
            )
          })}

          <div className="sidebar__nav-sep"></div>
          <Link href="/dashboard/settings" className={`nav-item ${pathname === '/dashboard/settings' ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon"><i className="fa-solid fa-gear"></i></span>
            <span className="nav-item__label">Configuración</span>
            <span className="nav-item__dot"></span>
          </Link>
          <button onClick={logout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,0.8)' }}>
            <span className="nav-item__icon"><i className="fa-solid fa-right-from-bracket"></i></span>
            <span className="nav-item__label">Salir</span>
          </button>
        </nav>

        <div className="sidebar__user">
          <NotificationBell />
          <div className="sidebar__user-av" id="dAvatar"><i className="fa-solid fa-user"></i></div>
          <div>
            <p className="sidebar__user-name">Usuario</p>
            <p className="sidebar__user-role">@user · <span style={{ color: 'var(--clr-accent-lt)' }}>Activo</span></p>
          </div>
        </div>
      </aside>

      {/* ── BARRA MÓVIL ── */}
      <nav className="bottom-nav lg:hidden" aria-label="Navegación principal">
        {mobileNavItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className={`bnav__item ${isActive ? 'bnav__item--active' : ''}`}>
              <i className={item.iconClass}></i>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
