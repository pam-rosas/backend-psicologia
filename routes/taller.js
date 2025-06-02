const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// Ruta para guardar un nuevo taller de duelo
router.post('/crear', async (req, res) => {
  try {
    const data = req.body;

    if (!data || !data.subtitulo || !data.fechaInicio || !data.valor || !data.facilitador || !data.descripcionDeServicio || !data.proximasSesiones || data.proximasSesiones.length === 0 || !data.politicaDeCancelacion || !data.datosDeContacto) {
      return res.status(400).json({ message: 'Datos incompletos.' });
    }

    const taller = {
      titulo: "Taller de Duelo",
      subtitulo: data.subtitulo,
      fechaInicio: data.fechaInicio,
      valor: data.valor,
      facilitador: data.facilitador,
      descripcionDeServicio: data.descripcionDeServicio.texto,
      proximasSesiones: data.proximasSesiones,
      politicaDeCancelacion: data.politicaDeCancelacion.texto,
      datosDeContacto: data.datosDeContacto.texto,
      creadoEn: new Date().toISOString()
    };

    const docRef = await db.collection('talleres').add(taller);
    res.status(200).json({ message: 'Taller de Duelo guardado con éxito', id: docRef.id });
  } catch (error) {
    console.error("Error al guardar taller:", error);
    res.status(500).json({ message: 'Error interno del servidor', error });
  }
});

// Ruta para obtener todos los talleres de duelo
// Ruta para obtener todos los talleres de duelo (ordenados por creación)
router.get('/lista', async (req, res) => {
  try {
    const snapshot = await db.collection('talleres').orderBy('creadoEn', 'desc').get(); // orden descendente por fecha

    const talleres = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(talleres);
  } catch (error) {
    console.error('Error al obtener talleres:', error);
    res.status(500).json({ message: 'Error interno del servidor', error });
  }
});


// Ruta para editar un taller existente
router.put('/editar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Verifica que el taller exista
    const tallerRef = db.collection('talleres').doc(id);
    const doc = await tallerRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Taller no encontrado.' });
    }

    // Validación básica de datos
    if (!data || !data.subtitulo || !data.fechaInicio || !data.valor || !data.facilitador || !data.descripcionDeServicio || !data.proximasSesiones || data.proximasSesiones.length === 0 || !data.politicaDeCancelacion || !data.datosDeContacto) {
      return res.status(400).json({ message: 'Datos incompletos para la edición.' });
    }

    const tallerActualizado = {
      titulo: "Taller de Duelo",
      subtitulo: data.subtitulo,
      fechaInicio: data.fechaInicio,
      valor: data.valor,
      facilitador: data.facilitador,
      descripcionDeServicio: data.descripcionDeServicio.texto,
      proximasSesiones: data.proximasSesiones,
      politicaDeCancelacion: data.politicaDeCancelacion.texto,
      datosDeContacto: data.datosDeContacto.texto,
      actualizadoEn: new Date().toISOString()
    };

    await tallerRef.update(tallerActualizado);

    res.status(200).json({ message: 'Taller actualizado con éxito' });
  } catch (error) {
    console.error("Error al editar taller:", error);
    res.status(500).json({ message: 'Error interno del servidor', error });
  }
});

// Ruta para eliminar un taller por ID
router.delete('/eliminar/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tallerRef = db.collection('talleres').doc(id);
    const doc = await tallerRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Taller no encontrado.' });
    }

    await tallerRef.delete();
    res.status(200).json({ message: 'Taller eliminado con éxito.' });
  } catch (error) {
    console.error('Error al eliminar taller:', error);
    res.status(500).json({ message: 'Error interno del servidor', error });
  }
});



module.exports = router;
