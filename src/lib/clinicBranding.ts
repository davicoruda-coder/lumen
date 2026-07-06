/** Nome padrão antes do clinic_config carregar ou em banco novo. */
export const DEFAULT_CLINIC_NAME = 'Minha Clínica';

/** Título da aba quando o nome da clínica ainda não foi personalizado. */
export const FALLBACK_DOCUMENT_TITLE = 'Sistema de Gestão Clínica';

/** Atualiza título da aba e meta description conforme a clínica (white-label). */
export function applyClinicBranding(clinicName: string) {
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
}
