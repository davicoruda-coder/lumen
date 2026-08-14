/** Nome padrão na UI quando a clínica ainda não foi personalizada. */
export const DEFAULT_CLINIC_NAME = 'Minha Clínica';

/** Título da aba enquanto a clínica está no estado padrão (marca do produto). */
export const FALLBACK_DOCUMENT_TITLE = 'Lumen';

/** Nomes reservados do produto / placeholders — não contam como marca da clínica. */
const UNBRANDED_CLINIC_NAMES = new Set([
  'minha clínica',
  'minha clinica',
  'lumen',
]);

const FAVICON_BG = '#1e3a5f';
const FAVICON_FG = '#ffffff';
const FAVICON_SIZE = 64;

export function isDefaultClinicName(name?: string | null): boolean {
  const normalized = name?.trim().toLowerCase() || '';
  if (!normalized) return true;
  return UNBRANDED_CLINIC_NAMES.has(normalized);
}

/** Nome exibido no app: genérico até a clínica personalizar. */
export function resolveClinicDisplayName(name?: string | null): string {
  const trimmed = name?.trim() || '';
  return isDefaultClinicName(trimmed) ? DEFAULT_CLINIC_NAME : trimmed;
}

/** Logo só aparece depois que a clínica tem nome próprio. */
export function resolveClinicDisplayLogo(
  name?: string | null,
  logoUrl?: string | null
): string | null {
  if (isDefaultClinicName(name)) return null;
  const logo = logoUrl?.trim() || '';
  return logo || null;
}

/** SVG da aba: inicial circular da clínica em fundo azul-escuro neutro. */
export function buildClinicLetterFaviconSvg(letter: string): string {
  const char = (letter?.trim().charAt(0) || 'C').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${FAVICON_BG}"/><text x="16" y="21.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${FAVICON_FG}">${char}</text></svg>`;
}

function clinicInitial(clinicName: string): string {
  if (isDefaultClinicName(clinicName)) return 'L';
  return resolveClinicDisplayName(clinicName).charAt(0).toUpperCase();
}

function setLetterFavicon(clinicName: string) {
  const svg = buildClinicLetterFaviconSvg(clinicInitial(clinicName));
  setFaviconHref(`data:image/svg+xml,${encodeURIComponent(svg)}`, 'image/svg+xml');
}

function setFaviconHref(href: string, type?: string) {
  const selector = 'link[rel="icon"], link[rel="shortcut icon"]';
  const links = document.querySelectorAll<HTMLLinkElement>(selector);

  if (links.length === 0) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = href;
    if (type) link.type = type;
    document.head.appendChild(link);
    return;
  }

  links.forEach((link) => {
    link.href = href;
    if (type) link.type = type;
    else link.removeAttribute('type');
  });
}

/** Desenha a logo em círculo para a aba (evita favicon quadrado). */
function applyCircularLogoFavicon(logoUrl: string, clinicName: string) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = FAVICON_SIZE;
    canvas.height = FAVICON_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setLetterFavicon(clinicName);
      return;
    }

    ctx.beginPath();
    ctx.arc(FAVICON_SIZE / 2, FAVICON_SIZE / 2, FAVICON_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const scale = Math.max(FAVICON_SIZE / img.width, FAVICON_SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (FAVICON_SIZE - w) / 2;
    const y = (FAVICON_SIZE - h) / 2;
    ctx.drawImage(img, x, y, w, h);

    setFaviconHref(canvas.toDataURL('image/png'), 'image/png');
  };
  img.onerror = () => setLetterFavicon(clinicName);
  img.src = logoUrl;
}

/** Favicon dinâmico: logo circular da clínica ou inicial no padrão neutro. */
export function applyClinicFavicon(clinicName: string, clinicLogo?: string | null) {
  const logo = resolveClinicDisplayLogo(clinicName, clinicLogo);
  if (logo) {
    applyCircularLogoFavicon(logo, clinicName);
    return;
  }

  setLetterFavicon(clinicName);
}

/** Atualiza título da aba, meta description e favicon conforme a clínica (white-label). */
export function applyClinicBranding(clinicName: string, clinicLogo?: string | null) {
  const displayName = resolveClinicDisplayName(clinicName);
  const unbranded = isDefaultClinicName(clinicName);

  document.title = unbranded ? FALLBACK_DOCUMENT_TITLE : displayName;

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      'content',
      unbranded
        ? 'Gestão integrada para clínicas de estética e saúde.'
        : `Painel de gestão — ${displayName}.`
    );
  }

  applyClinicFavicon(clinicName, clinicLogo);
}
