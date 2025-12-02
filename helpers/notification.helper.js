// helpers/notification.helper.js
const emailService = require('../services/email.service');
const moment = require('moment-timezone');

/**
 * Helper para formatear datos de cita antes de enviar notificaciones
 */
class NotificationHelper {
  
  /**
   * Formatea una fecha para mostrar en emails
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {string} - Fecha formateada en español
   */
  static formatDate(fecha) {
    return moment(fecha).locale('es').format('dddd, D [de] MMMM [de] YYYY');
  }

  /**
   * Formatea una hora para mostrar en emails
   * @param {string} hora - Hora en formato HH:mm o HH:mm:ss
   * @returns {string} - Hora formateada
   */
  static formatTime(hora) {
    // Si la hora incluye segundos, los removemos
    return hora.substring(0, 5);
  }

  /**
   * Envía notificaciones de confirmación de cita después de una reserva
   * @param {Object} citaData - Datos de la cita
   * @param {Object} paqueteData - Datos del paquete/tratamiento
   * @param {string} paymentId - ID del pago (opcional)
   */
  static async notifyAppointmentConfirmation(citaData, paqueteData, paymentId = null) {
    try {
      console.log('📧 Enviando notificaciones de confirmación de cita...');

      const appointmentData = {
        patientEmail: citaData.email_paciente,
        patientName: citaData.nombre_paciente,
        patientPhone: citaData.telefono_paciente,
        date: this.formatDate(citaData.fecha),
        time: this.formatTime(citaData.hora),
        treatmentName: paqueteData.nombre,
        price: paqueteData.precio_nacional,
        paymentId: paymentId
      };

      // Enviar email al paciente
      try {
        await emailService.sendAppointmentConfirmation(appointmentData);
        console.log('✅ Email de confirmación enviado al paciente:', citaData.email_paciente);
      } catch (error) {
        console.error('❌ Error enviando email al paciente:', error);
        // No lanzamos error para no interrumpir el flujo
      }

      // Enviar email al admin
      try {
        await emailService.sendAppointmentConfirmationToAdmin(appointmentData);
        console.log('✅ Email de confirmación enviado al admin');
      } catch (error) {
        console.error('❌ Error enviando email al admin:', error);
        // No lanzamos error para no interrumpir el flujo
      }

      return { success: true, message: 'Notificaciones enviadas' };
    } catch (error) {
      console.error('❌ Error general en notifyAppointmentConfirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificaciones de reagendamiento de cita
   * @param {Object} citaAnterior - Datos de la cita anterior
   * @param {Object} citaNueva - Datos de la nueva cita
   * @param {Object} paqueteData - Datos del paquete/tratamiento
   */
  static async notifyReschedule(citaAnterior, citaNueva, paqueteData) {
    try {
      console.log('📧 Enviando notificaciones de reagendamiento...');

      const rescheduleData = {
        patientEmail: citaNueva.email_paciente,
        patientName: citaNueva.nombre_paciente,
        patientPhone: citaNueva.telefono_paciente,
        oldDate: this.formatDate(citaAnterior.fecha),
        oldTime: this.formatTime(citaAnterior.hora),
        newDate: this.formatDate(citaNueva.fecha),
        newTime: this.formatTime(citaNueva.hora),
        treatmentName: paqueteData.nombre
      };

      // Enviar email al paciente
      try {
        await emailService.sendRescheduleConfirmation(rescheduleData);
        console.log('✅ Email de reagendamiento enviado al paciente:', citaNueva.email_paciente);
      } catch (error) {
        console.error('❌ Error enviando email al paciente:', error);
      }

      // Enviar email al admin
      try {
        await emailService.sendRescheduleConfirmationToAdmin(rescheduleData);
        console.log('✅ Email de reagendamiento enviado al admin');
      } catch (error) {
        console.error('❌ Error enviando email al admin:', error);
      }

      return { success: true, message: 'Notificaciones de reagendamiento enviadas' };
    } catch (error) {
      console.error('❌ Error general en notifyReschedule:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificaciones de cancelación de cita
   * @param {Object} citaData - Datos de la cita cancelada
   * @param {Object} paqueteData - Datos del paquete/tratamiento
   * @param {string} reason - Motivo de cancelación (opcional)
   */
  static async notifyCancellation(citaData, paqueteData, reason = null) {
    try {
      console.log('📧 Enviando notificaciones de cancelación...');

      const cancellationData = {
        patientEmail: citaData.email_paciente,
        patientName: citaData.nombre_paciente,
        patientPhone: citaData.telefono_paciente,
        date: this.formatDate(citaData.fecha),
        time: this.formatTime(citaData.hora),
        treatmentName: paqueteData.nombre,
        reason: reason
      };

      // Enviar email al paciente
      try {
        await emailService.sendCancellationConfirmation(cancellationData);
        console.log('✅ Email de cancelación enviado al paciente:', citaData.email_paciente);
      } catch (error) {
        console.error('❌ Error enviando email al paciente:', error);
      }

      // Enviar email al admin
      try {
        await emailService.sendCancellationConfirmationToAdmin(cancellationData);
        console.log('✅ Email de cancelación enviado al admin');
      } catch (error) {
        console.error('❌ Error enviando email al admin:', error);
      }

      return { success: true, message: 'Notificaciones de cancelación enviadas' };
    } catch (error) {
      console.error('❌ Error general en notifyCancellation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificación cuando el admin crea una cita manualmente
   * Similar a notifyAppointmentConfirmation pero sin ID de pago
   */
  static async notifyManualAppointmentCreation(citaData, paqueteData) {
    return this.notifyAppointmentConfirmation(citaData, paqueteData, null);
  }

  /**
   * Envía notificación cuando el admin cambia el estado de una cita
   * (solo si es cancelación)
   */
  static async notifyStatusChange(citaData, paqueteData, newStatus, oldStatus) {
    // Solo enviamos notificación si la cita se está cancelando
    if (newStatus === 'cancelada' && oldStatus !== 'cancelada') {
      return this.notifyCancellation(citaData, paqueteData, 'Cancelada por el administrador');
    }
    
    return { success: true, message: 'No se requiere notificación para este cambio de estado' };
  }
}

module.exports = NotificationHelper;
