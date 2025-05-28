// Servicio de Email para Fitness4All usando EmailJS
// Este archivo maneja el envío de correos electrónicos usando el servicio EmailJS

import emailjs from '@emailjs/browser';

// Configuración de EmailJS
const EMAILJS_CONFIG = {
  serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_default',
  exerciseTemplateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'template_default', // Template para ejercicios
  nutritionTemplateId: process.env.REACT_APP_EMAILJS_NUTRITION_TEMPLATE_ID || 'template_ecygxb4', // Template para nutrición
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'your_public_key'
};

// Función para procesar Markdown y convertirlo a HTML bonito
const processMarkdownToHTML = (markdownContent) => {
  let html = markdownContent;
  
  // Convertir encabezados ## -> <h2>, ### -> <h3>
  html = html.replace(/^## (.*$)/gim, '<h2 style="color: #2c3e50; font-size: 18px; font-weight: 600; margin: 20px 0 12px 0; padding: 8px 0; border-bottom: 2px solid #e9ecef;">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 style="color: #495057; font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; padding: 4px 0;">$1</h3>');
  
  // Convertir texto en negrita **texto** -> <strong>texto</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #2c3e50; font-weight: 600;">$1</strong>');
  
  // Procesar listas: convertir - item en <li>item</li>
  const lines = html.split('\n');
  let processedLines = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('- ')) {
      if (!inList) {
        processedLines.push('<ul style="margin: 8px 0; padding-left: 20px;">');
        inList = true;
      }
      // Procesar contenido de la lista con negrita
      let listContent = line.substring(2);
      listContent = listContent.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #2c3e50; font-weight: 600;">$1</strong>');
      processedLines.push(`<li style="margin: 4px 0; line-height: 1.5;">${listContent}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (line) {
        // Si la línea contiene :, darle formato especial
        if (line.includes(':') && !line.startsWith('<h')) {
          const [label, ...rest] = line.split(':');
          const content = rest.join(':').trim();
          if (content) {
            processedLines.push(`<p style="margin: 6px 0;"><strong style="color: #2c3e50; font-weight: 600;">${label}:</strong> ${content}</p>`);
          } else {
            processedLines.push(`<p style="margin: 6px 0;"><strong style="color: #2c3e50; font-weight: 600;">${label}:</strong></p>`);
          }
        } else if (!line.startsWith('<h')) {
          processedLines.push(`<p style="margin: 6px 0; line-height: 1.4;">${line}</p>`);
        } else {
          processedLines.push(line);
        }
      } else {
        processedLines.push('<br>');
      }
    }
  }
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines.join('\n');
};

// Función para generar contenido de texto plano
export const generateExercisePlanEmailText = (planContent, planTitle, userName) => {
  const timestamp = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid'
  });

  return `
FITNESS4ALL - TU PLAN DE ENTRENAMIENTO PERSONALIZADO
===================================================

¡Hola ${userName}!

Aquí tienes tu plan de entrenamiento personalizado generado especialmente para ti.

INFORMACIÓN DEL PLAN:
- Título: ${planTitle}
- Generado: ${timestamp}
- Para: ${userName}

CONTENIDO DEL PLAN:
${planContent}

CONSEJOS PARA SEGUIR TU PLAN:
• Realiza siempre el calentamiento antes de entrenar
• Mantén una hidratación adecuada durante el ejercicio
• Respeta los días de descanso para una buena recuperación
• Si sientes dolor, detén el ejercicio y consulta a un profesional
• Guarda este email para consultar tu plan cuando lo necesites

¡A por ello!

Equipo Fitness4All
Tu entrenador personal virtual

---
© 2024 Fitness4All. Todos los derechos reservados.
  `.trim();
};

// Función principal para enviar el email usando EmailJS
export const sendExercisePlanEmail = async (emailData) => {
  try {
    console.log('📧 Preparando envío de email con EmailJS...');
    console.log('Datos del email:', emailData);
    
    // Validar configuración de EmailJS
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.exerciseTemplateId || !EMAILJS_CONFIG.publicKey ||
        EMAILJS_CONFIG.serviceId === 'service_default' || 
        EMAILJS_CONFIG.exerciseTemplateId === 'template_default' ||
        EMAILJS_CONFIG.publicKey === 'your_public_key') {
      throw new Error('EmailJS no está configurado correctamente. Verifica las variables de entorno REACT_APP_EMAILJS_*');
    }
    
    // Generar contenido procesado para EmailJS template
    const planContentProcessed = processMarkdownToHTML(emailData.planContent);
    
    const textContent = generateExercisePlanEmailText(
      emailData.planContent, 
      emailData.planTitle, 
      emailData.userName
    );
    
    // Preparar datos para EmailJS
    const templateParams = {
      to_email: emailData.to,
      to_name: emailData.userName,
      subject: emailData.subject,
      plan_title: emailData.planTitle,
      plan_content_raw: emailData.planContent, // Markdown crudo como respaldo
      plan_content: planContentProcessed, // Contenido HTML procesado para mi template
      text_content: textContent,
      from_name: 'Fitness4All',
      timestamp: new Date().toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    
    console.log('📤 Enviando email con EmailJS...');
    console.log('📝 Contenido del plan procesado (primeros 300 caracteres):', planContentProcessed.substring(0, 300) + '...');
    
    // Enviar email usando EmailJS con el template de ejercicios
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.exerciseTemplateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );
    
    console.log('✅ Email enviado exitosamente con EmailJS:', result);
    
    return {
      success: true,
      messageId: result.text || result.status || 'emailjs_success',
      message: 'Email enviado exitosamente'
    };
    
  } catch (error) {
    console.error('Error al enviar el email con EmailJS:', error);
    
    // Mensajes de error específicos para EmailJS
    if (error.text) {
      // Error de EmailJS
      if (error.text.includes('Template')) {
        throw new Error('Error en la plantilla de EmailJS. Verifica que la plantilla esté configurada correctamente.');
      } else if (error.text.includes('Service')) {
        throw new Error('Error en el servicio de EmailJS. Verifica tu configuración de servicio de email.');
      } else if (error.text.includes('Invalid')) {
        throw new Error('Credenciales de EmailJS inválidas. Verifica tu Public Key y configuración.');
      }
      throw new Error(`Error de EmailJS: ${error.text}`);
    }
    
    throw error;
  }
};

// Función para generar contenido de texto plano para nutrición
export const generateNutritionPlanEmailText = (planContent, planTitle, userName) => {
  const timestamp = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid'
  });

  return `
FITNESS4ALL - TU PLAN DE ALIMENTACIÓN PERSONALIZADO
==================================================

¡Hola ${userName}!

Aquí tienes tu plan de alimentación personalizado generado especialmente para ti.

INFORMACIÓN DEL PLAN:
- Título: ${planTitle}
- Generado: ${timestamp}
- Para: ${userName}

CONTENIDO DEL PLAN:
${planContent}

CONSEJOS PARA SEGUIR TU PLAN:
• Planifica tus comidas con anticipación para asegurar el éxito
• Mantén una hidratación adecuada durante todo el día
• Respeta los horarios de comida para mantener tu metabolismo activo
• Adapta las porciones según tu nivel de actividad física
• Si tienes dudas nutricionales, consulta a un profesional
• Guarda este email para consultar tu plan cuando lo necesites

¡Disfruta de tu alimentación saludable!

Equipo Fitness4All
Tu nutricionista personal virtual

---
© 2024 Fitness4All. Todos los derechos reservados.
  `.trim();
};

// Función para procesar Markdown de nutrición y convertirlo a HTML bonito
const processNutritionMarkdownToHTML = (markdownContent) => {
  let html = markdownContent;
  
  // Convertir encabezados ## -> <h2>, ### -> <h3>
  html = html.replace(/^## (.*$)/gim, '<h2 style="color: #28a745; font-size: 18px; font-weight: 600; margin: 20px 0 12px 0; padding: 8px 0; border-bottom: 2px solid #e9ecef;">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 style="color: #fd7e14; font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; padding: 4px 0;">$1</h3>');
  
  // Convertir texto en negrita **texto** -> <strong>texto</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #28a745; font-weight: 600;">$1</strong>');
  
  // Procesar listas: convertir - item en <li>item</li> (exactamente igual que ejercicios)
  const lines = html.split('\n');
  let processedLines = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('- ')) {
      if (!inList) {
        processedLines.push('<ul style="margin: 8px 0; padding-left: 20px;">');
        inList = true;
      }
      // Procesar contenido de la lista
      let listContent = line.substring(2);
      listContent = listContent.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #28a745; font-weight: 600;">$1</strong>');
      processedLines.push(`<li style="margin: 4px 0; line-height: 1.5;">${listContent}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (line) {
        // Si la línea contiene :, darle formato especial
        if (line.includes(':') && !line.startsWith('<h')) {
          const [label, ...rest] = line.split(':');
          const content = rest.join(':').trim();
          if (content) {
            processedLines.push(`<p style="margin: 6px 0;"><strong style="color: #28a745; font-weight: 600;">${label}:</strong> ${content}</p>`);
          } else {
            processedLines.push(`<p style="margin: 6px 0;"><strong style="color: #28a745; font-weight: 600;">${label}:</strong></p>`);
          }
        } else if (!line.startsWith('<h')) {
          processedLines.push(`<p style="margin: 6px 0; line-height: 1.4;">${line}</p>`);
        } else {
          processedLines.push(line);
        }
      } else {
        processedLines.push('<br>');
      }
    }
  }
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines.join('\n');
};

// Función principal para enviar el email de plan de alimentación usando EmailJS
export const sendNutritionPlanEmail = async (emailData) => {
  try {
    console.log('Preparando envío de email de plan de alimentación con EmailJS...');
    console.log('Datos del email:', emailData);
    
    // Validar configuración de EmailJS para nutrición
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.nutritionTemplateId || !EMAILJS_CONFIG.publicKey ||
        EMAILJS_CONFIG.serviceId === 'service_default' || 
        EMAILJS_CONFIG.publicKey === 'your_public_key') {
      throw new Error('EmailJS no está configurado correctamente. Verifica las variables de entorno REACT_APP_EMAILJS_*');
    }
    
    // Generar contenido procesado más compacto para EmailJS template
    const planContentProcessed = processNutritionMarkdownToHTML(emailData.planContent);
    
    // Generar contenido de texto más corto
    const textContent = generateNutritionPlanEmailText(
      emailData.planContent, 
      emailData.planTitle, 
      emailData.userName
    );
    
    // Preparar datos para EmailJS - igual estructura que ejercicios
    const templateParams = {
      to_email: emailData.to,
      to_name: emailData.userName,
      subject: emailData.subject,
      plan_title: emailData.planTitle,
      plan_content_raw: emailData.planContent, // Markdown crudo como respaldo
      plan_content: planContentProcessed, // Contenido HTML procesado igual que ejercicios
      text_content: textContent,
      from_name: 'Fitness4All',
      timestamp: new Date().toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    
    console.log('Enviando email de plan de alimentación con EmailJS...');
    console.log('Tamaño del contenido procesado:', planContentProcessed.length, 'caracteres');
    
    // Enviar email usando EmailJS con el template específico de nutrición
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.nutritionTemplateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );
    
    console.log('✅ Email de plan de alimentación enviado exitosamente con EmailJS:', result);
    
    return {
      success: true,
      messageId: result.text || result.status || 'emailjs_nutrition_success',
      message: 'Email de plan de alimentación enviado exitosamente'
    };
    
  } catch (error) {
    console.error('Error al enviar el email de plan de alimentación con EmailJS:', error);
    
    // Mensajes de error específicos para EmailJS
    if (error.text) {
      // Error de EmailJS
      if (error.text.includes('Template')) {
        throw new Error('Error en la plantilla de EmailJS para nutrición. Verifica que la plantilla template_ecygxb4 esté configurada correctamente.');
      } else if (error.text.includes('Service')) {
        throw new Error('Error en el servicio de EmailJS. Verifica tu configuración de servicio de email.');
      } else if (error.text.includes('Invalid')) {
        throw new Error('Credenciales de EmailJS inválidas. Verifica tu Public Key y configuración.');
      } else if (error.text.includes('Variables size limit')) {
        throw new Error('El contenido del plan es demasiado grande. Intenta generar un plan más corto.');
      }
      throw new Error(`Error de EmailJS: ${error.text}`);
    }
    
    throw error;
  }
};

// Configuración de email actualizada
export const EMAIL_CONFIG = {
  templates: {
    exercisePlan: {
      subject: 'Tu Plan de Entrenamiento Personalizado - Fitness4All',
      from: 'Fitness4All <noreply@fitness4all.com>'
    },
    nutritionPlan: {
      subject: 'Tu Plan de Alimentación Personalizado - Fitness4All',
      from: 'Fitness4All Nutrición <noreply@fitness4all.com>'
    }
  }
}; 