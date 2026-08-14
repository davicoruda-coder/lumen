import { Navigate } from 'react-router-dom';

/** Rota legada: bloqueios ficam em Configurações. */
export function Bloqueios() {
  return <Navigate to="/configuracoes?tab=bloqueios" replace />;
}
