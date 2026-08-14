/** Nome padrão antes do clinic_config carregar ou em banco novo. */
export const DEFAULT_CLINIC_NAME = 'Minha Clínica';

/** Título da aba quando o nome da clínica ainda não foi personalizado. */
export const FALLBACK_DOCUMENT_TITLE = 'Lumen';

const FAVICON_BG = '#1e3a5f';
const FAVICON_FG = '#ffffff';

/** SVG da aba: inicial da clínica em fundo azul-escuro neutro. */
export function buildClinicLetterFaviconSvg(letter: string): string {
  const char = (letter?.trim().charAt(0) || 'C').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${FAVICON_BG}"/><text x="16" y="22" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="${FAVICON_FG}">${char}</text></svg>`;
}

function clinicInitial(clinicName: string): string {
  const name = clinicName?.trim() || DEFAULT_CLINIC_NAME;
  if (name === DEFAULT_CLINIC_NAME) return 'L';
  return name.charAt(0).toUpperCase();
}

function setFaviconHref(href: string, type?: string) {
  const selector = 'link[rel="icon"], link[rel="shortcut icon"]';
  let links = document.querySelectorAll<HTMLLinkElement>(selector);

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

/** Favicon dinâmico: logo da clínica ou inicial no padrão neutro. */
export function applyClinicFavicon(clinicName: string, clinicLogo?: string | null) {
  if (clinicLogo) {
    setFaviconHref(clinicLogo);
    return;
  }

  const svg = buildClinicLetterFaviconSvg(clinicInitial(clinicName));
  setFaviconHref(`data:image/svg+xml,${encodeURIComponent(svg)}`, 'image/svg+xml');
}

/** Atualiza título da aba, meta description e favicon conforme a clínica (white-label). */
export function applyClinicBranding(clinicName: string, clinicLogo?: string | null) {
  const name = clinicName?.trim() || DEFAULT_CLINIC_NAME;
  document.title =
    name === DEFAULT_CLINIC_NAME ? FALLBACK_DOCUMENT_TITLE : name;

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      'content',
      name === DEFAULT_CLINIC_NAME
        ? 'Gestão integrada para clínicas de estética e saúde.'
        : `Painel de gestão — ${name}.`
    );
  }

  applyClinicFavicon(clinicName, clinicLogo);
}
