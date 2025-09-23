const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = require('../firebase/config');
const FieldValue = admin.firestore.FieldValue;

// Crear o actualizar el horario
router.post('/guardar', async (req, res) => {
  try {
    const { horarioSemanal, excepciones } = req.body;

    if (!horarioSemanal) {
      return res.status(400).json({ message: 'El horario semanal es requerido.' });
    }

    const horarioData = {
      horarioSemanal,
      excepciones: excepciones || {},
      actualizadoEn: new Date().toISOString()
    };

    await db.collection('horarios').doc('horario-general').set(horarioData);
    res.status(200).json({ message: 'Horario guardado correctamente' });
  } catch (error) {
    console.error('Error al guardar horario:', error);
    res.status(500).json({ message: 'Error interno del servidor', error });
  }
});

router.get('/obtener', async (req, res) => {
  try {
    const doc = await db.collection('horarios').doc('horario-general').get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'No se encontró el horario' });
    }

    res.status(200).json(doc.data());
  } catch (error) {
    console.error('Error al obtener el horario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PATCH /api/horario/editar-dia/:dia
router.patch('/editar-dia/:dia', async (req, res) => {
  const dia = req.params.dia; // ej: lunes
  const { horas } = req.body; // ej: [{"inicio": "15:00", "fin": "16:00"}]

  if (!horas || !Array.isArray(horas)) {
    return res.status(400).json({ message: 'Debe enviar un array de horas.' });
  }

  try {
    const docRef = db.collection('horarios').doc('horario-general');
    
    // Si el array está vacío, eliminar la propiedad del día
    if (horas.length === 0) {
      await docRef.update({
        [`horarioSemanal.${dia}`]: FieldValue.delete()
      });
    } else {
      // Validar que cada hora tenga inicio y fin
      const horasValidas = horas.every(hora => 
        hora && typeof hora === 'object' && hora.inicio && hora.fin
      );
      
      if (!horasValidas) {
        return res.status(400).json({ 
          message: 'Cada hora debe tener formato: {"inicio": "HH:MM", "fin": "HH:MM"}' 
        });
      }

      await docRef.update({
        [`horarioSemanal.${dia}`]: horas
      });
    }
    
    res.status(200).json({ message: `Horario del ${dia} actualizado.` });
  } catch (error) {
    console.error('Error al actualizar el horario:', error);
    res.status(500).json({ message: 'Error al actualizar el horario.', error });
  }
});

// PATCH /api/horario/editar-excepcion/:fecha
router.patch('/editar-excepcion/:fecha', async (req, res) => {
  const fecha = req.params.fecha; // ej: 2025-06-17
  const { horas } = req.body;     // ej: [{"inicio": "10:00", "fin": "11:00"}]

  if (!horas || !Array.isArray(horas)) {
    return res.status(400).json({ message: 'Debe enviar un array de horas.' });
  }

  try {
    const docRef = db.collection('horarios').doc('horario-general');
    
    // Si el array está vacío, mantener array vacío (no eliminar la excepción)
    if (horas.length === 0) {
      await docRef.update({
        [`excepciones.${fecha}`]: []
      });
    } else {
      // Validar que cada hora tenga inicio y fin
      const horasValidas = horas.every(hora => 
        hora && typeof hora === 'object' && hora.inicio && hora.fin
      );
      
      if (!horasValidas) {
        return res.status(400).json({ 
          message: 'Cada hora debe tener formato: {"inicio": "HH:MM", "fin": "HH:MM"}' 
        });
      }

      await docRef.update({
        [`excepciones.${fecha}`]: horas
      });
    }
    
    res.status(200).json({ message: `Excepción del ${fecha} actualizada.` });
  } catch (error) {
    console.error('Error al actualizar excepción:', error);
    res.status(500).json({ message: 'Error al actualizar excepción.', error });
  }
});

router.delete('/eliminar-excepcion/:fecha', async (req, res) => {
  const fecha = req.params.fecha; // ej: 2025-06-17

  try {
    const docRef = db.collection('horarios').doc('horario-general');
    // Borra la propiedad de esa fecha en el objeto excepciones
    await docRef.update({
      [`excepciones.${fecha}`]: FieldValue.delete()
    });
    res.status(200).json({ message: `Excepción del ${fecha} eliminada.` });
  } catch (error) {
    console.error('Error al eliminar excepción:', error);
    res.status(500).json({ message: 'Error al eliminar excepción.', error });
  }
});

module.exports = router;
