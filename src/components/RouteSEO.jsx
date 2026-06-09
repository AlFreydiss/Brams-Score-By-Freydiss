// Titre + meta description par route (SEO côté client). Aucun rendu.
// Monté une fois dans App. Les crawlers modernes exécutent le JS → ils voient
// ces titres ; les balises Open Graph de base restent dans index.html.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SUFFIX = ' — Brams Community'
const DEFAULT = {
  title: 'Brams Community — Anime streaming, scans manga, tier list & tournois One Piece',
  desc: "Anime en streaming VOSTFR, scans manga, tier list, Akinator anime, tournois d'openings et Blind Test. La communauté Discord One Piece ultime.",
}

// Clés = préfixe de path. La plus longue correspondance gagne.
const SEO = {
  '/animes-scan':    { title: 'Anime en streaming VOSTFR' + SUFFIX,            desc: 'Regarde tes animes préférés en streaming VOSTFR gratuitement : One Piece, et bien plus. Lecteur HD, sous-titres FR.' },
  '/tier-list':      { title: 'Tier List Anime & One Piece' + SUFFIX,          desc: 'Crée et partage ta tier list anime et One Piece. Classe personnages, openings, arcs et compare avec la communauté.' },
  '/tournoi':        { title: 'Tournoi Anime & Openings' + SUFFIX,             desc: 'Participe aux tournois d\'openings, endings et OST anime. Vote pour tes favoris et désigne le champion.' },
  '/akinator':       { title: 'Akinator Anime — devine ton personnage' + SUFFIX, desc: "Pense à un personnage d'anime, l'Akinator de Brams le devine. Spécial One Piece et animes populaires." },
  '/blind-test':     { title: 'Blind Test Anime & Openings' + SUFFIX,          desc: 'Teste tes connaissances : reconnais les openings anime en un temps record. Blind Test multijoueur.' },
  '/wiki':           { title: 'Wiki & Scans Manga One Piece' + SUFFIX,         desc: 'Wiki communautaire One Piece : scans manga, fiches personnages, arcs et lore détaillé.' },
  '/fruits-du-demon':{ title: 'Fruits du Démon One Piece' + SUFFIX,            desc: 'Encyclopédie des Fruits du Démon de One Piece : types, pouvoirs et possesseurs.' },
  '/theories':       { title: 'Théories One Piece' + SUFFIX,                   desc: 'Lis et partage les meilleures théories One Piece de la communauté Brams.' },
  '/boutique':       { title: 'Boutique — Fonds & Curseurs' + SUFFIX,          desc: 'Personnalise ton profil : fonds d\'opening animés et curseurs custom One Piece.' },
  '/fil':            { title: 'Le Fil — réseau anime' + SUFFIX,                desc: 'Le réseau social de la communauté anime Brams : publications, stories et discussions.' },
  '/equipage':       { title: 'Équipages' + SUFFIX,                            desc: 'Rejoins ou crée ton équipage pirate dans la communauté Brams.' },
  '/undercover':     { title: 'Undercover — jeu d\'imposteur' + SUFFIX,        desc: 'Joue à Undercover, le jeu d\'imposteur multijoueur de Brams Community.' },
}

export default function RouteSEO() {
  const { pathname } = useLocation()
  useEffect(() => {
    const key = Object.keys(SEO).filter(k => pathname.startsWith(k)).sort((a, b) => b.length - a.length)[0]
    const meta = key ? SEO[key] : DEFAULT
    document.title = meta.title
    let tag = document.querySelector('meta[name="description"]')
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute('name', 'description'); document.head.appendChild(tag) }
    tag.setAttribute('content', meta.desc)
    let canon = document.querySelector('link[rel="canonical"]')
    if (!canon) { canon = document.createElement('link'); canon.setAttribute('rel', 'canonical'); document.head.appendChild(canon) }
    canon.setAttribute('href', 'https://brams.community' + (pathname === '/' ? '/' : pathname))
  }, [pathname])
  return null
}
