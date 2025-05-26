// Ejemplo en Dashboard.js
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, Timestamp, collection, setDoc } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { query, where, getDocs } from 'firebase/firestore';
import './Dashboard.css'; // Importar los estilos del modal
import ReactMarkdown from 'react-markdown';

function Dashboard() {
  const { currentUser } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    age: '',
    height: '',
    weight: ''
  });
  const [errors, setErrors] = useState({}); // Almacena los errores de validación
  const [weightData, setWeightData] = useState([]);
  const [weightDate, setWeightDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [completionMessage, setCompletionMessage] = useState('');
  
  // Estado inicial para el cuestionario
  const initialQuestionnaireData = {
    // 1. Objetivo principal
    objetivoPrincipal: '',
    objetivoOtro: '',

    // 2. Estado de Salud
    condicionMedica: '',
    condicionMedicaDetalle: '',
    lesion: '',
    lesionDetalle: '',

    // 3. Actividad Física y Estilo de Vida
    frecuenciaEjercicio: '',
    tiposEjercicio: [],
    tiposEjercicioOtro: '',
    tiempoEntrenamiento: '',
    lugarEntrenamiento: '',
    lugarEntrenamientoOtro: '',
    materialDisponible: [],
    materialDisponibleOtro: '',
    tipoTrabajo: '',
    pasosDiarios: '',

    // 4. Alimentación y Hábitos
    alimentacionActual: '',
    comidasDiarias: '',
    picaEntreHoras: '',
    comeFuera: '',
    restriccionesAlimentarias: '',
    restriccionesAlimentariasDetalle: '',
    alimentosEvitar: [],
    alimentosEvitarOtro: '',
    alimentosFavoritos: '',
    consumosHabituales: [],

    // 5. Preferencias y Expectativas
    horasSueno: '',
    expectativas: '',
    informacionAdicional: ''
  };
  
  // Nuevo estado para el cuestionario
  const [questionnaireData, setQuestionnaireData] = useState(initialQuestionnaireData);
  
  // Estado para errores de validación del cuestionario
  const [questionnaireErrors, setQuestionnaireErrors] = useState([]);
  
  // Listas de opciones
  const tiposEjercicioOpciones = ['cardio', 'fuerza', 'yoga', 'deportes_equipo', 'otro'];
  const materialDisponibleOpciones = ['ninguno', 'bandas', 'mancuernas', 'banco', 'bicicleta', 'otro'];
  const consumosHabitualesOpciones = ['alcohol', 'refrescos', 'ultraprocesados', 'no_consumo'];
  const alimentosEvitarOpciones = ['lactosa', 'gluten', 'frutos_secos', 'azucar', 'ninguno', 'otro'];

  // Calcula el IMC a partir de la altura y el peso
  const calculateBMI = (height, weight) => {
    if (height && weight) {
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(2);
    }
    return null;
  };

  // Obtiene los datos del usuario desde Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) {
        console.error('Usuario no autenticado');
        return;
      }
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUserData(userDoc.data());
      } else {
        console.log('Usuario no encontrado en Firestore');
      }
      setLoading(false);
    };

    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  // Obtiene el historial de peso del usuario
  const fetchWeightData = async () => {
    if (!currentUser) {
      console.error('Usuario no autenticado');
      return;
    }
    const weightQuery = query(collection(db, 'users', currentUser.uid, 'measurements'));
    const querySnapshot = await getDocs(weightQuery);
    const weights = querySnapshot.docs.map(doc => ({
      date: doc.data().timestamp.toDate(),
      weight: doc.data().weight
    }));

    // Ordena los datos por fecha en orden ascendente
    weights.sort((a, b) => a.date - b.date);
    setWeightData(weights);
  };

  useEffect(() => {
    if (currentUser) {
      fetchWeightData();
    }
  }, [currentUser]);

  // Inicializa el formulario con los datos del usuario
  useEffect(() => {
    if (userData) {
      setFormData(prevData => ({
        ...prevData,
        age: userData.age || '',
        height: userData.height || '',
        weight: userData.weight || ''
      }));
    }
  }, [userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  // Valida los valores cuando se pierde el foco en un campo
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const newErrors = { ...errors };

    if (name === 'age') {
      if (value < 10 || value > 120) {
        newErrors.age = 'La edad debe estar entre 10 y 120 años.';
      } else {
        delete newErrors.age;
      }
    }

    if (name === 'height') {
      if (value < 60 || value > 240) {
        newErrors.height = 'La altura debe estar entre 60 cm y 240 cm.';
      } else {
        delete newErrors.height;
      }
    }

    if (name === 'weight') {
      if (value < 20 || value > 650) {
        newErrors.weight = 'El peso debe estar entre 20 kg y 650 kg.';
      } else {
        delete newErrors.weight;
      }
    }

    setErrors(newErrors);
  };

  // Actualiza los datos del usuario y registra la medida en Firestore
  const handleUpdate = async (e) => {
    e.preventDefault();

    // Validación de los datos introducidos
    const newErrors = {};
    if (formData.age < 10 || formData.age > 120) {
      newErrors.age = 'La edad debe estar entre 10 y 120 años.';
    }
    if (formData.height < 60 || formData.height > 240) {
      newErrors.height = 'La altura debe estar entre 60 cm y 240 cm.';
    }
    if (formData.weight < 20 || formData.weight > 650) {
      newErrors.weight = 'El peso debe estar entre 20 kg y 650 kg.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const userDocRef = doc(db, 'users', currentUser.uid);
    const updatedData = {};

    // Actualiza solo los campos que tengan valor
    for (const key in formData) {
      if (formData[key]) {
        updatedData[key] = formData[key];
      }
    }

    try {
      await updateDoc(userDocRef, updatedData);

      // Registra la medida en la colección "measurements"
      const measurementLogRef = doc(collection(db, 'users', currentUser.uid, 'measurements'));
      await setDoc(measurementLogRef, {
        timestamp: weightDate ? Timestamp.fromDate(new Date(weightDate)) : Timestamp.now(),
        weight: formData.weight,
        height: formData.height
      });

      const updatedUserDoc = await getDoc(userDocRef);
      setUserData(updatedUserDoc.data());
      setUpdateMessage('¡Datos actualizados correctamente!');
      setTimeout(() => setUpdateMessage(''), 3000);
      fetchWeightData(); // Actualiza el historial de peso
      setIsModalOpen(false); // Cerrar modal después de guardar
    } catch (error) {
      console.error('Error al actualizar los datos:', error);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Maneja cambios en el cuestionario
  const handleQuestionnaireChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Para checkboxes (múltiples selecciones)
      setQuestionnaireData(prevData => {
        if (['tiposEjercicio', 'materialDisponible', 'consumosHabituales', 'alimentosEvitar'].includes(name)) {
          // Asegurar que el array existe
          let updatedValues = [...(prevData[name] || [])];
          
          if (checked) {
            updatedValues.push(value);
            
            // Si se marca "ninguno" o "no_consumo", desmarcar otras opciones
            if (value === 'ninguno' || value === 'no_consumo') {
              updatedValues = [value];
            } else {
              // Si se marca otra opción, quitar "ninguno" o "no_consumo"
              updatedValues = updatedValues.filter(item => 
                item !== 'ninguno' && item !== 'no_consumo'
              );
            }
          } else {
            // Si se desmarca, quitar de la lista
            updatedValues = updatedValues.filter(item => item !== value);
          }
          
          return {
            ...prevData,
            [name]: updatedValues
          };
        }
        return prevData;
      });
    } else {
      // Para inputs normales
      setQuestionnaireData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }
  };

  // Valida que todas las preguntas obligatorias estén respondidas
  const validateQuestionnaire = () => {
    const errors = [];
    const {
      objetivoPrincipal, condicionMedica, lesion, frecuenciaEjercicio,
      tiposEjercicio, tiempoEntrenamiento, lugarEntrenamiento,
      materialDisponible, tipoTrabajo, pasosDiarios, alimentacionActual,
      comidasDiarias, picaEntreHoras, comeFuera, restriccionesAlimentarias,
      alimentosEvitar, alimentosFavoritos, consumosHabituales,
      horasSueno, expectativas
    } = questionnaireData;

    // Validaciones de campos obligatorios
    if (!objetivoPrincipal) errors.push('Objetivo principal');
    if (!condicionMedica) errors.push('Condición médica');
    if (!lesion) errors.push('Lesiones o dolores');
    if (!frecuenciaEjercicio) errors.push('Frecuencia de ejercicio');
    
    // Validaciones condicionales para ejercicio
    if (frecuenciaEjercicio && frecuenciaEjercicio !== 'no_ejercicio') {
      if (!tiposEjercicio || tiposEjercicio.length === 0) {
        errors.push('Tipo de ejercicio');
      }
      if (!tiempoEntrenamiento) errors.push('Tiempo de entrenamiento');
    }
    
    if (!lugarEntrenamiento) errors.push('Lugar de entrenamiento');
    if (!materialDisponible || materialDisponible.length === 0) {
      errors.push('Material disponible');
    }
    if (!tipoTrabajo) errors.push('Tipo de trabajo');
    if (!pasosDiarios) errors.push('Pasos diarios');
    if (!alimentacionActual) errors.push('Alimentación actual');
    if (!comidasDiarias) errors.push('Comidas diarias');
    if (!picaEntreHoras) errors.push('Picar entre horas');
    if (!comeFuera) errors.push('Comer fuera de casa');
    if (!restriccionesAlimentarias) errors.push('Restricciones alimentarias');
    if (!alimentosEvitar || alimentosEvitar.length === 0) {
      errors.push('Alimentos a evitar');
    }
    if (!alimentosFavoritos.trim()) errors.push('Alimentos favoritos');
    if (!consumosHabituales || consumosHabituales.length === 0) {
      errors.push('Consumos habituales');
    }
    if (!horasSueno) errors.push('Horas de sueño');
    if (!expectativas.trim()) errors.push('Expectativas');

    return errors;
  };

  // Genera el prompt basado en el cuestionario
  const generatePrompt = () => {
    const {
      objetivoPrincipal, objetivoOtro,
      condicionMedica, condicionMedicaDetalle, lesion, lesionDetalle,
      frecuenciaEjercicio, tiposEjercicio = [], tiposEjercicioOtro, tiempoEntrenamiento,
      lugarEntrenamiento, lugarEntrenamientoOtro, materialDisponible = [], materialDisponibleOtro,
      tipoTrabajo, pasosDiarios, alimentacionActual, comidasDiarias,
      picaEntreHoras, comeFuera, restriccionesAlimentarias, restriccionesAlimentariasDetalle,
      alimentosEvitar = [], alimentosEvitarOtro, alimentosFavoritos, consumosHabituales = [],
      horasSueno, expectativas, informacionAdicional
    } = questionnaireData;
    
    // 1. Objetivo principal
    let objetivoTexto = '';
    switch(objetivoPrincipal) {
      case 'perder_peso': objetivoTexto = 'perder peso'; break;
      case 'ganar_musculo': objetivoTexto = 'ganar masa muscular'; break;
      case 'mejorar_salud': objetivoTexto = 'mejorar mi salud general'; break;
      case 'mejorar_rendimiento': objetivoTexto = 'mejorar mi rendimiento deportivo'; break;
      case 'mantenerme': objetivoTexto = 'mantenerme en forma'; break;
      case 'otro': objetivoTexto = objetivoOtro; break;
      default: objetivoTexto = 'mejorar mi condición física';
    }
    
    // 2. Estado de Salud
    let condicionMedicaTexto = condicionMedica === 'no' ? 
      'No tengo condiciones médicas relevantes' : 
      `Tengo las siguientes condiciones médicas: ${condicionMedicaDetalle}`;
    
    let lesionTexto = lesion === 'no' ? 
      'No tengo lesiones ni dolores habituales' : 
      `Tengo las siguientes lesiones o dolores: ${lesionDetalle}`;
    
    // 3. Actividad Física y Estilo de Vida
    let frecuenciaEjercicioTexto = '';
    switch(frecuenciaEjercicio) {
      case 'no_ejercicio': frecuenciaEjercicioTexto = 'Actualmente no hago ejercicio'; break;
      case '1-2': frecuenciaEjercicioTexto = 'Hago ejercicio 1-2 veces por semana'; break;
      case '3-4': frecuenciaEjercicioTexto = 'Hago ejercicio 3-4 veces por semana'; break;
      case '5+': frecuenciaEjercicioTexto = 'Hago ejercicio 5 o más veces por semana'; break;
      default: frecuenciaEjercicioTexto = 'Actualmente no hago ejercicio regular';
    }
    
    let tiposEjercicioTexto = '';
    if (tiposEjercicio && tiposEjercicio.length > 0) {
      const tiposEjercicioMapeados = tiposEjercicio.map(tipo => {
        switch(tipo) {
          case 'cardio': return 'cardio (correr, bici, nadar)';
          case 'fuerza': return 'fuerza/musculación';
          case 'yoga': return 'yoga/pilates';
          case 'deportes_equipo': return 'deportes de equipo';
          case 'otro': return tiposEjercicioOtro;
          default: return tipo;
        }
      });
      tiposEjercicioTexto = `Habitualmente realizo: ${tiposEjercicioMapeados.join(', ')}`;
    } else {
      tiposEjercicioTexto = 'No realizo ningún tipo específico de ejercicio';
    }
    
    let tiempoEntrenamientoTexto = `Puedo dedicar ${
      tiempoEntrenamiento === '15-30' ? '15-30' : 
      tiempoEntrenamiento === '30-45' ? '30-45' : 
      tiempoEntrenamiento === '45-60' ? '45-60' : 
      tiempoEntrenamiento === '60-75' ? '60-75' : 
      tiempoEntrenamiento === '75-90' ? '75-90' : 
      tiempoEntrenamiento === '90+' ? 'más de 90' : tiempoEntrenamiento
    } minutos a entrenar cada día`;
    
    let lugarEntrenamientoTexto = `Prefiero entrenar en ${
      lugarEntrenamiento === 'casa' ? 'casa' : 
      lugarEntrenamiento === 'gimnasio' ? 'gimnasio' : 
      lugarEntrenamiento === 'aire_libre' ? 'aire libre' : 
      lugarEntrenamientoOtro
    }`;
    
    let materialDisponibleTexto = '';
    if (materialDisponible && materialDisponible.includes('ninguno')) {
      materialDisponibleTexto = 'No dispongo de material para entrenar';
    } else if (materialDisponible && materialDisponible.length > 0) {
      const materialMapeado = materialDisponible.map(mat => {
        switch(mat) {
          case 'bandas': return 'bandas elásticas';
          case 'mancuernas': return 'mancuernas/pesas';
          case 'banco': return 'banco de pesas';
          case 'bicicleta': return 'bicicleta estática/elíptica';
          case 'otro': return materialDisponibleOtro;
          default: return mat;
        }
      });
      materialDisponibleTexto = `Dispongo del siguiente material: ${materialMapeado.join(', ')}`;
    } else {
      materialDisponibleTexto = 'No he especificado material disponible para entrenar';
    }
    
    let trabajoTexto = `Mi trabajo es principalmente ${
      tipoTrabajo === 'sedentario' ? 'sedentario (sentado)' : 
      tipoTrabajo === 'activo' ? 'activo (en movimiento)' : 'variado'
    }`;
    
    let pasosTexto = `Doy aproximadamente ${
      pasosDiarios === 'menos_5000' ? 'menos de 5.000' : 
      pasosDiarios === '5000-10000' ? 'entre 5.000 y 10.000' : 'más de 10.000'
    } pasos al día`;
    
    // 4. Alimentación y Hábitos
    let alimentacionTexto = `Considero que mi alimentación actual es ${
      alimentacionActual === 'muy_poco' ? 'muy poco saludable' : 
      alimentacionActual === 'poco' ? 'poco saludable' : 
      alimentacionActual === 'normal' ? 'normal' : 
      alimentacionActual === 'bastante' ? 'bastante saludable' : 'muy saludable'
    }`;
    
    let comidasTexto = `Hago ${comidasDiarias} comidas principales al día`;
    
    let picaTexto = `${picaEntreHoras === 'si' ? 'Suelo' : 'No suelo'} picar entre horas`;
    
    let comeFueraTexto = `${comeFuera === 'si' ? 'Suelo' : 'No suelo'} comer fuera de casa`;
    
    let restriccionesAlimentariasTexto = restriccionesAlimentarias === 'no' ? 
      'No tengo alergias, intolerancias o restricciones alimentarias' : 
      `Mis restricciones alimentarias son: ${restriccionesAlimentariasDetalle}`;
    
    let alimentosEvitarTexto = '';
    if (alimentosEvitar && alimentosEvitar.includes('ninguno')) {
      alimentosEvitarTexto = 'No hay alimentos específicos que prefiera evitar';
    } else if (alimentosEvitar && alimentosEvitar.length > 0) {
      const alimentosMapeados = alimentosEvitar.map(alimento => {
        switch(alimento) {
          case 'lactosa': return 'lactosa';
          case 'gluten': return 'gluten';
          case 'frutos_secos': return 'frutos secos';
          case 'azucar': return 'azúcar';
          case 'otro': return alimentosEvitarOtro;
          default: return alimento;
        }
      });
      alimentosEvitarTexto = `Prefiero evitar los siguientes alimentos: ${alimentosMapeados.join(', ')}`;
    } else {
      alimentosEvitarTexto = 'No he especificado alimentos a evitar';
    }
    
    let alimentosFavoritosTexto = alimentosFavoritos ? 
      `Mis alimentos favoritos son: ${alimentosFavoritos}` : 
      'No he especificado alimentos favoritos';
    
    let consumosTexto = '';
    if (consumosHabituales && consumosHabituales.includes('no_consumo')) {
      consumosTexto = 'No consumo alcohol, refrescos azucarados ni ultraprocesados con frecuencia';
    } else if (consumosHabituales && consumosHabituales.length > 0) {
      const consumosMapeados = consumosHabituales.map(consumo => {
        switch(consumo) {
          case 'alcohol': return 'alcohol';
          case 'refrescos': return 'refrescos azucarados';
          case 'ultraprocesados': return 'ultraprocesados/snacks';
          default: return consumo;
        }
      });
      consumosTexto = `Consumo con frecuencia: ${consumosMapeados.join(', ')}`;
    } else {
      consumosTexto = 'No he especificado consumos habituales';
    }
    
    // 5. Preferencias y Expectativas
    let suenoTexto = `Duermo normalmente ${
      horasSueno === 'menos_5' ? 'menos de 5 horas' : 
      horasSueno === '5-6' ? 'entre 5 y 6 horas' : 
      horasSueno === '7-8' ? 'entre 7 y 8 horas' : 'más de 8 horas'
    } por noche`;
    
    let expectativasTexto = expectativas ? 
      `Lo que espero conseguir con mi plan personalizado es: ${expectativas}` : 
      'No he especificado expectativas concretas para mi plan personalizado';
    
    let infoAdicionalTexto = informacionAdicional ? 
      `Información adicional importante: ${informacionAdicional}` : 
      '';

    // Calcular IMC y categoría
    const imc = calculateBMI(userData?.height, userData?.weight);
    const getIMCCategory = (imc) => {
      if (!imc) return 'No calculable';
      const imcNum = parseFloat(imc);
      if (imcNum < 18.5) return 'Bajo peso';
      if (imcNum < 25) return 'Peso normal';
      if (imcNum < 30) return 'Sobrepeso';
      return 'Obesidad';
    };

    // Mapear objetivos con más detalle
    const mapearObjetivo = (objetivo, otro = '') => {
      const mapa = {
        'perder_peso': 'perder peso y reducir grasa corporal',
        'ganar_musculo': 'aumentar masa muscular y fuerza',
        'mantener_peso': 'mantener mi peso actual',
        'mejorar_condicion': 'mejorar mi condición física general',
        'mejorar_salud': 'mejorar mi salud y bienestar general',
        'mejorar_rendimiento': 'mejorar mi rendimiento deportivo',
        'mantenerme': 'mantenerme en forma y activo',
        'otro': otro
      };
      return mapa[objetivo] || 'mejorar mi condición física';
    };

    // Crear prompt profesional estructurado
    return `# PERFIL COMPLETO DE CLIENTE PARA PLAN PERSONALIZADO DE FITNESS Y NUTRICIÓN

## INFORMACIÓN DEMOGRÁFICA Y ANTROPOMÉTRICA
- **Edad:** ${userData?.age || 'No especificada'} años
- **Sexo:** ${userData?.sex === 'hombre' ? 'Masculino' : userData?.sex === 'mujer' ? 'Femenino' : 'No especificado'}
- **Altura:** ${userData?.height || 'No especificada'} cm
- **Peso actual:** ${userData?.weight || 'No especificado'} kg
- **IMC:** ${imc || 'No calculable'} (${getIMCCategory(imc)})

## OBJETIVO PRINCIPAL Y EXPECTATIVAS
**Objetivo primario:** ${mapearObjetivo(objetivoPrincipal, objetivoOtro)}

**Expectativas específicas:** ${expectativas || 'El cliente no ha especificado expectativas particulares, busca orientación profesional.'}

## ESTADO DE SALUD Y LIMITACIONES
**Condiciones médicas:** ${condicionMedica === 'si' ? condicionMedicaDetalle : 'Sin condiciones médicas relevantes reportadas'}

**Lesiones o limitaciones físicas:** ${lesion === 'si' ? lesionDetalle : 'Sin lesiones o dolores habituales reportados'}

## PERFIL DE ACTIVIDAD FÍSICA ACTUAL
- **Nivel de actividad:** ${frecuenciaEjercicioTexto}
- **Tipos de ejercicio practicados:** ${tiposEjercicioTexto}
- **Tiempo disponible para entrenar:** ${tiempoEntrenamiento ? tiempoEntrenamiento.replace('-', ' a ') + ' minutos por sesión' : 'No especificado'}
- **Lugar preferido de entrenamiento:** ${lugarEntrenamientoTexto.replace('Prefiero entrenar en ', '')}
- **Equipamiento disponible:** ${materialDisponibleTexto.replace('Dispongo del siguiente material: ', '').replace('No dispongo de material para entrenar', 'Sin equipamiento específico')}

## ESTILO DE VIDA Y ACTIVIDAD DIARIA
- **Tipo de trabajo:** ${trabajoTexto.replace('Mi trabajo es principalmente ', '')}
- **Actividad diaria:** ${pasosTexto.replace('Doy aproximadamente ', '')}
- **Horas de sueño:** ${suenoTexto.replace('Duermo normalmente ', '')}

## PERFIL NUTRICIONAL Y HÁBITOS ALIMENTARIOS
- **Autoevaluación de alimentación actual:** ${alimentacionTexto.replace('Considero que mi alimentación actual es ', '')}
- **Estructura de comidas:** ${comidasTexto}
- **Picoteo entre comidas:** ${picaTexto}
- **Frecuencia de comidas fuera de casa:** ${comeFueraTexto}
- **Restricciones alimentarias:** ${restriccionesAlimentariasTexto}
- **Alimentos a evitar:** ${alimentosEvitarTexto}
- **Alimentos favoritos:** ${alimentosFavoritosTexto}
- **Hábitos de consumo:** ${consumosTexto}

## INFORMACIÓN ADICIONAL RELEVANTE
${infoAdicionalTexto || 'No se ha proporcionado información adicional específica.'}

## INSTRUCCIONES PARA EL PROFESIONAL/IA
Por favor, utiliza esta información para crear un plan integral que incluya:

1. **Plan de entrenamiento personalizado** adaptado al nivel actual, tiempo disponible y equipamiento
2. **Plan nutricional específico** que considere las restricciones, preferencias y objetivos
3. **Recomendaciones de estilo de vida** para optimizar resultados
4. **Progresión gradual y realista** basada en el perfil actual del cliente
5. **Consideraciones especiales** para cualquier limitación médica o física reportada

**Fecha de evaluación:** ${new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}

---
*Este perfil ha sido generado automáticamente a partir de un cuestionario estructurado completado por el cliente.*`;
  };

  // Envía el cuestionario y guarda el prompt en la base de datos
  const handleCompleteQuestionnaire = async () => {
    // Validar que todas las preguntas obligatorias estén respondidas
    const validationErrors = validateQuestionnaire();
    if (validationErrors.length > 0) {
      setQuestionnaireErrors(validationErrors);
      return;
    }
    
    // Limpiar errores si la validación es exitosa
    setQuestionnaireErrors([]);
    
    try {
      const prompt = generatePrompt();
      const now = new Date();
      
      // Formatear fecha y hora para España
      const formattedDateTime = now.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid'
      });
      
      // Para el campo createdAt, usar la hora de España
      const spainTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
      
      // Crear título con el objetivo principal y fecha/hora
      const getObjetivoTexto = (objetivo) => {
        switch(objetivo) {
          case 'perder_peso': return 'Perder peso';
          case 'ganar_musculo': return 'Ganar músculo';
          case 'mantener_peso': return 'Mantener peso actual';
          case 'mejorar_condicion': return 'Mejorar condición física';
          case 'mejorar_salud': return 'Mejorar salud general';
          case 'mejorar_rendimiento': return 'Mejorar rendimiento deportivo';
          case 'mantenerme': return 'Mantenerme en forma';
          case 'otro': return questionnaireData.objetivoOtro || 'Objetivo personalizado';
          default: return 'Objetivo no especificado';
        }
      };
      
      const objetivoTexto = getObjetivoTexto(questionnaireData.objetivoPrincipal);
      const documentTitle = `${objetivoTexto} - ${formattedDateTime}`;

      // Mostrar el prompt en la consola
      console.log('='.repeat(80));
      console.log('CUESTIONARIO GUARDADO:', documentTitle);
      console.log('='.repeat(80));
      console.log(prompt);
      console.log('='.repeat(80));

      // Guardar en Firestore
      const promptDocRef = doc(collection(db, 'users', currentUser.uid, 'questionnaires'));
      await setDoc(promptDocRef, {
        title: documentTitle,
        prompt: prompt,
        questionnaireData: questionnaireData,
        timestamp: Timestamp.now(),
        createdAt: spainTime.toISOString()
      });

      // Mostrar mensaje de confirmación
      setCompletionMessage('¡Cuestionario guardado correctamente en la base de datos!');
      setTimeout(() => setCompletionMessage(''), 5000);

      // Resetear el cuestionario a valores por defecto
      setQuestionnaireData(initialQuestionnaireData);

    } catch (error) {
      console.error('Error al guardar el cuestionario:', error);
      setCompletionMessage('Error al guardar el cuestionario en la base de datos');
      setTimeout(() => setCompletionMessage(''), 5000);
    }
  };

  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  return (
    <div className="dashboard">
          <div className="dashboard-header">
        <h1>¡Hola, {userData?.name}!</h1>
        <p className="welcome-message">
          ¿Quieres hacer un cambio real en tu vida? Estás a solo un cuestionario de conseguir tu plan personalizado de fitness y nutrición.
        </p>
          </div>

          <div className="dashboard-content">
            <div className="user-section">
              <div className="user-stats-card">
            <h3>Tus datos actuales</h3>
            {userData && (
                <div className="user-metrics">
                  <div className="metric-item">
                    <span className="metric-label">Edad:</span>
                    <span className="metric-value">{userData.age || 'No especificada'}</span>
                  </div>
                <div className="metric-item">
                  <span className="metric-label">Sexo:</span>
                  <span className="metric-value">
                    {userData.sex === 'hombre' ? 'Hombre' : userData?.sex === 'mujer' ? 'Mujer' : 'No especificado'}
                  </span>
                </div>
                  <div className="metric-item">
                    <span className="metric-label">Altura:</span>
                  <span className="metric-value">{userData.height ? `${userData.height} cm` : 'No especificada'}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Peso:</span>
                  <span className="metric-value">{userData.weight ? `${userData.weight} kg` : 'No especificado'}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">IMC:</span>
                  <span className="metric-value">
                    {calculateBMI(userData.height, userData.weight) || 'No calculable'}
                  </span>
                  </div>
                </div>
            )}
            <button onClick={handleOpenModal} className="update-data-btn">
              Actualizar Datos
            </button>
            {updateMessage && <p className="success-message">{updateMessage}</p>}
              </div>
            </div>

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-modern">
              <div className="modal-header">
                <h3>Actualizar mis datos</h3>
                <button className="close-button-modern" onClick={handleCloseModal}>
                  <span>✕</span>
                </button>
              </div>
              <form onSubmit={handleUpdate} noValidate className="modal-form">
                <div className="form-row">
                  <div className="input-group">
                    <label htmlFor="age">Edad</label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      min="10"
                      max="120"
                      placeholder="Ej: 25"
                    />
                    {errors.age && <p className="error-text">{errors.age}</p>}
                  </div>
                  <div className="input-group">
                    <label htmlFor="height">Altura (cm)</label>
                    <input
                      type="number"
                      id="height"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      min="60"
                      max="240"
                      placeholder="Ej: 170"
                    />
                    {errors.height && <p className="error-text">{errors.height}</p>}
                  </div>
                  </div>
                <div className="form-row">
                  <div className="input-group">
                    <label htmlFor="weight">Peso (kg)</label>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      min="20"
                      max="650"
                      placeholder="Ej: 70"
                    />
                    {errors.weight && <p className="error-text">{errors.weight}</p>}
                  </div>
                  <div className="input-group">
                    <label htmlFor="weightDate">Fecha del registro</label>
                    <input
                      type="date" 
                      id="weightDate" 
                      name="weightDate" 
                      value={weightDate} 
                      onChange={(e) => setWeightDate(e.target.value)} 
                    />
                  </div>
                  </div>
                <button type="submit" className="save-button">
                  Guardar Cambios
                </button>
              </form>
                  </div>
          </div>
        )}

        <div className="questionnaire-section">
          <div className="questionnaire-header">
            <h2>Tu cuestionario personalizado</h2>
            <p className="questionnaire-subtitle">
              Responde estas preguntas para que sepamos un poco más sobre ti y podamos ayudarte a conseguir tus objetivos.
            </p>
          </div>
          
          <div className="questionnaire-form">
            <div className="form-group">
              <label htmlFor="objetivoPrincipal">¿Cuál es tu objetivo principal? *</label>
              <select 
                id="objetivoPrincipal" 
                      name="objetivoPrincipal"
                value={questionnaireData.objetivoPrincipal}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="perder_peso">Perder peso</option>
                <option value="ganar_musculo">Ganar músculo</option>
                <option value="mantener_peso">Mantener peso actual</option>
                <option value="mejorar_condicion">Mejorar condición física</option>
                <option value="mejorar_salud">Mejorar salud general</option>
                <option value="mejorar_rendimiento">Mejorar rendimiento deportivo</option>
                <option value="mantenerme">Mantenerme en forma</option>
                <option value="otro">Otro</option>
              </select>
              
                    {questionnaireData.objetivoPrincipal === 'otro' && (
                <div className="conditional-field">
                  <label htmlFor="objetivoOtro">Por favor, especifica:</label>
                      <input
                        type="text"
                    id="objetivoOtro"
                        name="objetivoOtro"
                        value={questionnaireData.objetivoOtro}
                        onChange={handleQuestionnaireChange}
                    placeholder="Describe tu objetivo"
                      />
                </div>
                    )}
                  </div>
            
                <div className="form-group">
              <label htmlFor="condicionMedica">¿Tienes alguna condición médica relevante? *</label>
              <div className="description-text">(Diabetes, hipertensión, colesterol, tiroides, asma, etc.)</div>
              <select 
                id="condicionMedica" 
                      name="condicionMedica"
                value={questionnaireData.condicionMedica}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
              
                  {questionnaireData.condicionMedica === 'si' && (
                    <div className="conditional-field">
                  <label htmlFor="condicionMedicaDetalle">Por favor, especifica:</label>
                      <input
                        type="text"
                    id="condicionMedicaDetalle"
                        name="condicionMedicaDetalle"
                        value={questionnaireData.condicionMedicaDetalle}
                        onChange={handleQuestionnaireChange}
                    placeholder="Describe tu condición médica"
                      />
                    </div>
                  )}
                </div>
            
                <div className="form-group">
              <label htmlFor="lesion">¿Tienes alguna lesión o dolor habitual? *</label>
              <select 
                id="lesion" 
                      name="lesion"
                value={questionnaireData.lesion}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
              
                  {questionnaireData.lesion === 'si' && (
                    <div className="conditional-field">
                  <label htmlFor="lesionDetalle">Por favor, especifica:</label>
                      <input
                        type="text"
                    id="lesionDetalle"
                        name="lesionDetalle"
                        value={questionnaireData.lesionDetalle}
                        onChange={handleQuestionnaireChange}
                    placeholder="Describe tu lesión o dolor"
                      />
                    </div>
                  )}
                </div>
            
                <div className="form-group">
              <label htmlFor="frecuenciaEjercicio">¿Cuántas veces a la semana haces ejercicio? *</label>
              <select 
                id="frecuenciaEjercicio" 
                      name="frecuenciaEjercicio"
                value={questionnaireData.frecuenciaEjercicio}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="no_ejercicio">No hago ejercicio</option>
                <option value="1-2">1-2 veces</option>
                <option value="3-4">3-4 veces</option>
                <option value="5+">5 o más veces</option>
              </select>
                  </div>
            
            {questionnaireData.frecuenciaEjercicio !== 'no_ejercicio' && (
              <>
                <div className="form-group">
                  <label htmlFor="tiposEjercicio">¿Qué tipo de ejercicio haces? *</label>
                  <div className="checkbox-group">
                    {tiposEjercicioOpciones.map(opcion => (
                      <div key={opcion} className="checkbox-item">
                        <input
                          type="checkbox"
                          id={`tiposEjercicio-${opcion}`} 
                          name="tiposEjercicio"
                          value={opcion}
                          checked={questionnaireData.tiposEjercicio && questionnaireData.tiposEjercicio.includes(opcion)}
                          onChange={handleQuestionnaireChange}
                        />
                        <label htmlFor={`tiposEjercicio-${opcion}`}>
                          {opcion === 'cardio' ? 'Cardio' : 
                           opcion === 'fuerza' ? 'Entrenamiento de fuerza' : 
                           opcion === 'yoga' ? 'Yoga' : 
                           opcion === 'deportes_equipo' ? 'Deportes de equipo' : 
                           opcion === 'otro' ? 'Otro' : opcion}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {questionnaireData.tiposEjercicio && 
                   questionnaireData.tiposEjercicio.includes('otro') && (
                    <div className="conditional-field">
                      <label htmlFor="tiposEjercicioOtro">Por favor, especifica:</label>
                        <input
                          type="text"
                        id="tiposEjercicioOtro"
                          name="tiposEjercicioOtro"
                          value={questionnaireData.tiposEjercicioOtro}
                          onChange={handleQuestionnaireChange}
                        placeholder="Describe el tipo de ejercicio"
                        />
                    </div>
                      )}
                    </div>

                <div className="form-group">
                  <label htmlFor="tiempoEntrenamiento">¿Cuánto tiempo puedes dedicar a entrenar cada día? *</label>
                  <select 
                    id="tiempoEntrenamiento" 
                      name="tiempoEntrenamiento"
                    value={questionnaireData.tiempoEntrenamiento}
                      onChange={handleQuestionnaireChange}
                  >
                    <option value="">Selecciona una opción...</option>
                    <option value="15-30">15-30 minutos</option>
                    <option value="30-45">30-45 minutos</option>
                    <option value="45-60">45-60 minutos</option>
                    <option value="60-75">60-75 minutos</option>
                    <option value="75-90">75-90 minutos</option>
                    <option value="90+">+90 minutos</option>
                  </select>
                  </div>
              </>
            )}
            
                <div className="form-group">
              <label htmlFor="lugarEntrenamiento">¿Dónde prefieres entrenar? *</label>
              <select 
                id="lugarEntrenamiento" 
                      name="lugarEntrenamiento"
                value={questionnaireData.lugarEntrenamiento}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="casa">En casa</option>
                <option value="gimnasio">En gimnasio</option>
                <option value="aire_libre">En aire libre</option>
                <option value="otro">Otro</option>
              </select>
              
              {questionnaireData.lugarEntrenamiento === 'otro' && (
                  <div className="conditional-field">
                  <label htmlFor="lugarEntrenamientoOtro">Por favor, especifica:</label>
                      <input
                        type="text"
                    id="lugarEntrenamientoOtro"
                        name="lugarEntrenamientoOtro"
                        value={questionnaireData.lugarEntrenamientoOtro}
                        onChange={handleQuestionnaireChange}
                    placeholder="Describe el lugar"
                      />
                </div>
                    )}
                  </div>
            
                <div className="form-group">
              <label htmlFor="materialDisponible">¿Qué material tienes disponible para entrenar? *</label>
                  <div className="checkbox-group">
                    {materialDisponibleOpciones.map(opcion => (
                  <div key={opcion} className="checkbox-item">
                        <input
                          type="checkbox"
                      id={`materialDisponible-${opcion}`} 
                          name="materialDisponible"
                          value={opcion}
                      checked={questionnaireData.materialDisponible && questionnaireData.materialDisponible.includes(opcion)}
                          onChange={handleQuestionnaireChange}
                        />
                    <label htmlFor={`materialDisponible-${opcion}`}>
                      {opcion === 'ninguno' ? 'Ninguno' : 
                       opcion === 'bandas' ? 'Bandas elásticas' : 
                       opcion === 'mancuernas' ? 'Mancuernas/pesas' : 
                       opcion === 'banco' ? 'Banco de pesas' : 
                       opcion === 'bicicleta' ? 'Bicicleta estática/elíptica' : 
                       opcion === 'otro' ? 'Otro' : opcion}
                    </label>
                      </div>
                    ))}
              </div>
              
              {questionnaireData.materialDisponible && 
               questionnaireData.materialDisponible.includes('otro') && (
                <div className="conditional-field">
                  <label htmlFor="materialDisponibleOtro">Por favor, especifica:</label>
                        <input
                          type="text"
                    id="materialDisponibleOtro"
                          name="materialDisponibleOtro"
                          value={questionnaireData.materialDisponibleOtro}
                          onChange={handleQuestionnaireChange}
                    placeholder="Describe el material"
                        />
                </div>
                      )}
                    </div>
            
                <div className="form-group">
              <label htmlFor="tipoTrabajo">¿Qué tipo de trabajo realizas? *</label>
              <select 
                id="tipoTrabajo" 
                      name="tipoTrabajo"
                value={questionnaireData.tipoTrabajo}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="sedentario">Sedentario (sentado)</option>
                <option value="activo">Activo (en movimiento)</option>
                <option value="variado">Variado</option>
              </select>
                  </div>
            
                <div className="form-group">
              <label htmlFor="pasosDiarios">¿Cuántos pasos das al día? *</label>
              <select 
                id="pasosDiarios" 
                      name="pasosDiarios"
                value={questionnaireData.pasosDiarios}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="menos_5000">Menos de 5.000</option>
                <option value="5000-10000">Entre 5.000 y 10.000</option>
                <option value="mas_10000">Más de 10.000</option>
              </select>
                  </div>
            
                <div className="form-group">
              <label htmlFor="alimentacionActual">¿Cómo consideras tu alimentación actual? *</label>
              <select 
                id="alimentacionActual" 
                      name="alimentacionActual"
                value={questionnaireData.alimentacionActual}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="muy_poco">Muy poco saludable</option>
                <option value="poco">Poco saludable</option>
                <option value="normal">Normal</option>
                <option value="bastante">Bastante saludable</option>
                <option value="muy_saludable">Muy saludable</option>
              </select>
                  </div>
            
                <div className="form-group">
              <label htmlFor="comidasDiarias">¿Cuántas comidas principales haces al día? *</label>
              <select 
                id="comidasDiarias" 
                      name="comidasDiarias"
                value={questionnaireData.comidasDiarias}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="2">2 comidas</option>
                <option value="3">3 comidas</option>
                <option value="4">4 comidas</option>
                <option value="5">5 comidas</option>
                <option value="6">6 comidas</option>
              </select>
                  </div>
            
                <div className="form-group">
              <label htmlFor="picaEntreHoras">¿Sueles picar entre horas? *</label>
              <select 
                id="picaEntreHoras" 
                      name="picaEntreHoras"
                value={questionnaireData.picaEntreHoras}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
                  </div>
            
                <div className="form-group">
              <label htmlFor="comeFuera">¿Sueles comer fuera de casa? *</label>
              <select 
                id="comeFuera" 
                      name="comeFuera"
                value={questionnaireData.comeFuera}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
                  </div>
            
                <div className="form-group">
              <label htmlFor="restriccionesAlimentarias">¿Tienes alergias, intolerancias o restricciones alimentarias? *</label>
              <div className="description-text">(Alergias, vegetarianismo, veganismo, alimentos prohibidos por religión, etc.)</div>
              <select 
                id="restriccionesAlimentarias" 
                      name="restriccionesAlimentarias"
                value={questionnaireData.restriccionesAlimentarias}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
              
                  {questionnaireData.restriccionesAlimentarias === 'si' && (
                    <div className="conditional-field">
                  <label htmlFor="restriccionesAlimentariasDetalle">Por favor, especifica:</label>
                      <input
                        type="text"
                    id="restriccionesAlimentariasDetalle"
                        name="restriccionesAlimentariasDetalle"
                        value={questionnaireData.restriccionesAlimentariasDetalle}
                        onChange={handleQuestionnaireChange}
                    placeholder="Describe tus restricciones alimentarias"
                      />
                    </div>
                  )}
                </div>
            
                <div className="form-group">
              <label htmlFor="alimentosEvitar">¿Qué alimentos o grupos prefieres evitar? *</label>
                  <div className="checkbox-group">
                    {alimentosEvitarOpciones.map(opcion => (
                  <div key={opcion} className="checkbox-item">
                        <input
                          type="checkbox"
                      id={`alimentosEvitar-${opcion}`} 
                          name="alimentosEvitar"
                          value={opcion}
                      checked={questionnaireData.alimentosEvitar && questionnaireData.alimentosEvitar.includes(opcion)}
                          onChange={handleQuestionnaireChange}
                        />
                    <label htmlFor={`alimentosEvitar-${opcion}`}>
                      {opcion === 'lactosa' ? 'Lactosa' : 
                       opcion === 'gluten' ? 'Gluten' : 
                       opcion === 'frutos_secos' ? 'Frutos secos' : 
                       opcion === 'azucar' ? 'Azúcar' : 
                       opcion === 'ninguno' ? 'Ninguno' : 
                       opcion === 'otro' ? 'Otro' : opcion}
                    </label>
                      </div>
                    ))}
              </div>
              
              {questionnaireData.alimentosEvitar && 
               questionnaireData.alimentosEvitar.includes('otro') && (
                <div className="conditional-field">
                  <label htmlFor="alimentosEvitarOtro">Por favor, especifica:</label>
                        <input
                          type="text"
                    id="alimentosEvitarOtro"
                          name="alimentosEvitarOtro"
                          value={questionnaireData.alimentosEvitarOtro}
                          onChange={handleQuestionnaireChange}
                    placeholder="Describe los alimentos que prefieres evitar"
                        />
                </div>
                      )}
                    </div>
            
                <div className="form-group">
              <label htmlFor="alimentosFavoritos">¿Qué alimentos te gustan especialmente? *</label>
              <textarea
                id="alimentosFavoritos" 
                      name="alimentosFavoritos"
                      value={questionnaireData.alimentosFavoritos}
                      onChange={handleQuestionnaireChange}
                placeholder="Por favor, describe tus alimentos favoritos"
              ></textarea>
                  </div>
            
                <div className="form-group">
              <label htmlFor="consumosHabituales">¿Consumes alcohol, refrescos o ultraprocesados con frecuencia? *</label>
                  <div className="checkbox-group">
                    {consumosHabitualesOpciones.map(opcion => (
                  <div key={opcion} className="checkbox-item">
                        <input
                          type="checkbox"
                      id={`consumosHabituales-${opcion}`} 
                          name="consumosHabituales"
                          value={opcion}
                      checked={questionnaireData.consumosHabituales && questionnaireData.consumosHabituales.includes(opcion)}
                          onChange={handleQuestionnaireChange}
                        />
                    <label htmlFor={`consumosHabituales-${opcion}`}>
                      {opcion === 'alcohol' ? 'Alcohol' : 
                       opcion === 'refrescos' ? 'Refrescos azucarados' : 
                       opcion === 'ultraprocesados' ? 'Ultraprocesados/snacks' : 
                       opcion === 'no_consumo' ? 'No consumo' : opcion}
                    </label>
                      </div>
                    ))}
                  </div>
                </div>
            
                <div className="form-group">
              <label htmlFor="horasSueno">¿Cuántas horas duermes por noche? *</label>
              <select 
                id="horasSueno" 
                      name="horasSueno"
                value={questionnaireData.horasSueno}
                      onChange={handleQuestionnaireChange}
              >
                <option value="">Selecciona una opción...</option>
                <option value="menos_5">Menos de 5 horas</option>
                <option value="5-6">Entre 5 y 6 horas</option>
                <option value="7-8">Entre 7 y 8 horas</option>
                <option value="mas_8">Más de 8 horas</option>
              </select>
                  </div>
            
                <div className="form-group">
              <label htmlFor="expectativas">¿Qué esperas conseguir con tu plan personalizado? *</label>
                    <textarea
                id="expectativas" 
                      name="expectativas"
                      value={questionnaireData.expectativas}
                      onChange={handleQuestionnaireChange}
                placeholder="Por favor, describe tus expectativas para tu plan personalizado"
              ></textarea>
                  </div>
            
                <div className="form-group">
              <label htmlFor="informacionAdicional">¿Tienes alguna información adicional importante para tu plan personalizado?</label>
                    <textarea
                id="informacionAdicional" 
                      name="informacionAdicional"
                      value={questionnaireData.informacionAdicional}
                      onChange={handleQuestionnaireChange}
                placeholder="Por favor, escribe cualquier información adicional importante para tu plan personalizado"
              ></textarea>
                  </div>
            
                <div className="submit-section">
              <button 
                type="button" 
                onClick={handleCompleteQuestionnaire} 
                className="submit-questionnaire"
              >
                Guardar Cuestionario
                  </button>
              
              {questionnaireErrors.length > 0 && (
                <div className="validation-errors">
                  <p><strong>⚠️ Faltan por responder las siguientes preguntas obligatorias:</strong></p>
                  <ul>
                    {questionnaireErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {completionMessage && (
                <div className="completion-message">
                  {completionMessage}
                </div>
              )}
            </div>
          </div>
                </div>
                    </div>
    </div>
  );
}

export default Dashboard;