import React, { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { differenceInMinutes, parseISO } from 'date-fns';

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Áudio não suportado ou bloqueado pelo navegador
  }
}

export function AppointmentNotifier() {
  const { role } = useAuth();
  const hasNotifiedDailyRef = useRef(false);
  const notifiedAppointmentsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Apenas especialistas devem receber essa notificação
    if (role !== 'especialista') return;

    const requestPermission = async () => {
      if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          await Notification.requestPermission();
        }
      }
    };
    requestPermission();

    const checkAppointments = async () => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      
      // 1. Resumo Diário (08:00)
      if (now.getHours() === 8 && now.getMinutes() === 0 && !hasNotifiedDailyRef.current) {
        try {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);

          const { count, error } = await supabase
            .from('agendamentos_estetica')
            .select('*', { count: 'exact', head: true })
            .gte('data_hora_inicio', startOfDay.toISOString())
            .lte('data_hora_inicio', endOfDay.toISOString())
            .neq('status', 'cancelado');

          if (!error && count !== null) {
            playNotificationSound();
            new Notification('Bom dia! ☀️', {
              body: `Temos ${count} consultas agendadas para hoje. Vamos com tudo!`,
              icon: '/icon-192.png'
            });
            hasNotifiedDailyRef.current = true;
          }
        } catch {
          // Falha ao buscar resumo diário — ignorada
        }
      }

      // Reset resumo diário se já não for mais 8 da manhã (ex: virou o dia)
      if (now.getHours() !== 8) {
        hasNotifiedDailyRef.current = false;
      }

      // 2. Aviso de Prontidão (15 minutos antes)
      try {
        const startCheck = new Date(now.getTime() - 60000).toISOString();
        const endCheck = new Date(now.getTime() + 30 * 60000).toISOString();

        const { data: agendamentos, error } = await supabase
          .from('agendamentos_estetica')
          .select('id, nome_lead, data_hora_inicio, procedimento_nome')
          .gte('data_hora_inicio', startCheck)
          .lte('data_hora_inicio', endCheck)
          .neq('status', 'cancelado')
          .neq('status', 'concluido');

        if (error || !agendamentos) return;

        agendamentos.forEach(agendamento => {
          const appointmentTime = parseISO(agendamento.data_hora_inicio);
          const diff = differenceInMinutes(appointmentTime, now);

          if ((diff === 15 || diff === 14) && !notifiedAppointmentsRef.current.has(agendamento.id)) {
            const timeStr = appointmentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            playNotificationSound();

            new Notification(`Próximo Paciente em 15 min ⏰`, {
              body: `A paciente ${agendamento.nome_lead || 'Sem Nome'} tem consulta às ${timeStr} (${agendamento.procedimento_nome || 'Procedimento'}). Ficha aberta para conferência.`,
              icon: '/icon-192.png',
              requireInteraction: true
            });
            
            notifiedAppointmentsRef.current.add(agendamento.id);
          }
        });

      } catch {
        // Falha ao verificar agendamentos — nova tentativa no próximo ciclo
      }
    };

    // Executar imediatamente e depois a cada 1 minuto (60000ms)
    checkAppointments();
    const intervalId = setInterval(checkAppointments, 60000);

    return () => clearInterval(intervalId);
  }, [role]);

  return null; // Componente "invisível"
}
