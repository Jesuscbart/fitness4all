// Servicio de Email para Fitness4All usando EmailJS
// Este archivo maneja el envío de correos electrónicos usando el servicio EmailJS

import emailjs from '@emailjs/browser';

// Configuración de EmailJS
const EMAILJS_CONFIG = {
  // Cuenta original de EmailJS para ejercicios y nutrición
  serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID,
  exerciseTemplateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
  nutritionTemplateId: process.env.REACT_APP_EMAILJS_NUTRITION_TEMPLATE_ID,
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
  
  // Cuenta secundaria de EmailJS para listas de compra
  shoppingServiceId: process.env.REACT_APP_EMAILJS_SHOPPING_SERVICE_ID,
  shoppingTemplateId: process.env.REACT_APP_EMAILJS_SHOPPING_TEMPLATE_ID,
  shoppingPublicKey: process.env.REACT_APP_EMAILJS_SHOPPING_PUBLIC_KEY || process.env.REACT_APP_EMAILJS_PUBLIC_KEY
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

// Función principal para enviar el email usando EmailJS
export const sendExercisePlanEmail = async (emailData) => {
  try {
    console.log('📧 Preparando envío de email con EmailJS...');
    console.log('Datos del email:', emailData);
    
    // Validar configuración de EmailJS
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.exerciseTemplateId || !EMAILJS_CONFIG.publicKey) {
      const missingVars = [];
      if (!EMAILJS_CONFIG.serviceId) missingVars.push('REACT_APP_EMAILJS_SERVICE_ID');
      if (!EMAILJS_CONFIG.exerciseTemplateId) missingVars.push('REACT_APP_EMAILJS_TEMPLATE_ID');
      if (!EMAILJS_CONFIG.publicKey) missingVars.push('REACT_APP_EMAILJS_PUBLIC_KEY');
      
      throw new Error(`EmailJS no está configurado correctamente. Variables de entorno faltantes: ${missingVars.join(', ')}`);
    }
    
    // Generar contenido procesado para EmailJS template
    const planContentProcessed = processMarkdownToHTML(emailData.planContent);
    
    // Preparar datos para EmailJS
    const templateParams = {
      to_email: emailData.to,
      to_name: emailData.userName,
      subject: emailData.subject,
      plan_title: emailData.planTitle,
      plan_content: planContentProcessed,
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

// Función para procesar Markdown de nutrición y convertirlo a HTML bonito
const processNutritionMarkdownToHTML = (markdownContent) => {
  let html = markdownContent;
  
  // Convertir encabezados ## -> <h2>, ### -> <h3>
  html = html.replace(/^## (.*$)/gim, '<h2 style="color: #28a745; font-size: 18px; font-weight: 600; margin: 20px 0 12px 0; padding: 8px 0; border-bottom: 2px solid #e9ecef;">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 style="color: #fd7e14; font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; padding: 4px 0;">$1</h3>');
  
  // Convertir texto en negrita **texto** -> <strong>texto</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #28a745; font-weight: 600;">$1</strong>');
  
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
    console.log('📧 Preparando envío de email de plan de alimentación con EmailJS...');
    console.log('Datos del email:', emailData);
    
    // Validar configuración de EmailJS para nutrición
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.nutritionTemplateId || !EMAILJS_CONFIG.publicKey) {
      const missingVars = [];
      if (!EMAILJS_CONFIG.serviceId) missingVars.push('REACT_APP_EMAILJS_SERVICE_ID');
      if (!EMAILJS_CONFIG.nutritionTemplateId) missingVars.push('REACT_APP_EMAILJS_NUTRITION_TEMPLATE_ID');
      if (!EMAILJS_CONFIG.publicKey) missingVars.push('REACT_APP_EMAILJS_PUBLIC_KEY');
      
      throw new Error(`EmailJS para nutrición no está configurado correctamente. Variables de entorno faltantes: ${missingVars.join(', ')}`);
    }
    
    // Generar contenido procesado para EmailJS template
    const planContentProcessed = processNutritionMarkdownToHTML(emailData.planContent);
    
    // Preparar datos para EmailJS
    const templateParams = {
      to_email: emailData.to,
      to_name: emailData.userName,
      subject: emailData.subject,
      plan_title: emailData.planTitle,
      plan_content: planContentProcessed,
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
    
    console.log('📤 Enviando email de plan de alimentación con EmailJS...');
    console.log('📝 Tamaño del contenido procesado:', planContentProcessed.length, 'caracteres');
    
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

// Función para procesar Markdown de lista de compra y convertirlo a HTML bonito
const processShoppingListMarkdownToHTML = (markdownContent) => {
  let html = markdownContent;
  
  // Convertir encabezados con emojis ## 🥬 **VERDURAS Y HORTALIZAS** -> <h2>🥬 VERDURAS Y HORTALIZAS</h2>
  html = html.replace(/^##\s*([🥬🍎🥩🥛🍞🥫🧂❄️🧴])\s*\*\*(.*?)\*\*$/gim, '<h2 style="color: #ff6b35; font-size: 18px; font-weight: 600; margin: 25px 0 15px 0; padding: 10px 0; border-bottom: 2px solid #ff6b35; display: flex; align-items: center; gap: 8px;">$1 $2</h2>');
  
  // Convertir encabezados normales ## -> <h2>
  html = html.replace(/^## (.*$)/gim, '<h2 style="color: #ff6b35; font-size: 18px; font-weight: 600; margin: 20px 0 12px 0; padding: 8px 0; border-bottom: 2px solid #ff6b35;">$1</h2>');
  
  // Convertir texto en negrita **texto** -> <strong>texto</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ff6b35; font-weight: 600;">$1</strong>');
  
  // Procesar listas: convertir - item en <li>item</li>
  const lines = html.split('\n');
  let processedLines = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('- ')) {
      if (!inList) {
        processedLines.push('<ul style="margin: 12px 0; padding-left: 20px;">');
        inList = true;
      }
      // Procesar contenido de la lista
      let listContent = line.substring(2);
      listContent = listContent.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ff6b35; font-weight: 600;">$1</strong>');
      processedLines.push(`<li style="margin: 6px 0; padding: 4px 0; line-height: 1.5; list-style-type: disc;">${listContent}</li>`);
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
            processedLines.push(`<p style="margin: 8px 0;"><strong style="color: #ff6b35; font-weight: 600;">${label}:</strong> ${content}</p>`);
          } else {
            processedLines.push(`<p style="margin: 8px 0;"><strong style="color: #ff6b35; font-weight: 600;">${label}:</strong></p>`);
          }
        } else if (!line.startsWith('<h')) {
          processedLines.push(`<p style="margin: 8px 0; line-height: 1.4;">${line}</p>`);
        } else {
          processedLines.push(line);
        }
      } else {
        processedLines.push('<br style="margin: 5px 0;">');
      }
    }
  }
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines.join('\n');
};

// Función principal para enviar el email de lista de compra usando EmailJS
export const sendShoppingListEmail = async (emailData) => {
  try {
    console.log('📧 Preparando envío de email de lista de compra con EmailJS...');
    console.log('Datos del email:', emailData);
    
    // Debug: Mostrar qué credenciales se están cargando
    console.log('🔍 Credenciales de EmailJS para lista de compra:');
    console.log('Service ID:', EMAILJS_CONFIG.shoppingServiceId);
    console.log('Template ID:', EMAILJS_CONFIG.shoppingTemplateId);
    console.log('Public Key:', EMAILJS_CONFIG.shoppingPublicKey ? '✅ Configurada' : '❌ No configurada');
    
    // Validar configuración de EmailJS para lista de compra (nueva cuenta)
    if (!EMAILJS_CONFIG.shoppingServiceId || !EMAILJS_CONFIG.shoppingTemplateId || !EMAILJS_CONFIG.shoppingPublicKey) {
      const missingVars = [];
      if (!EMAILJS_CONFIG.shoppingServiceId) missingVars.push('REACT_APP_EMAILJS_SHOPPING_SERVICE_ID');
      if (!EMAILJS_CONFIG.shoppingTemplateId) missingVars.push('REACT_APP_EMAILJS_SHOPPING_TEMPLATE_ID');
      if (!EMAILJS_CONFIG.shoppingPublicKey) missingVars.push('REACT_APP_EMAILJS_SHOPPING_PUBLIC_KEY o REACT_APP_EMAILJS_PUBLIC_KEY');
      
      throw new Error(`EmailJS para lista de compra no está configurado correctamente. Variables de entorno faltantes: ${missingVars.join(', ')}`);
    }
    
    // Generar contenido procesado para EmailJS template
    const listContentProcessed = processShoppingListMarkdownToHTML(emailData.listContent);
    
    // Preparar datos para EmailJS (nueva cuenta)
    const templateParams = {
      to_email: emailData.to,
      to_name: emailData.userName,
      subject: emailData.subject,
      list_title: emailData.listTitle,
      list_content: listContentProcessed,
      week_info: emailData.weekInfo,
      people_count: emailData.peopleCount,
      generated_date: new Date().toLocaleDateString('es-ES', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      }),
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
    
    console.log('📤 Enviando email de lista de compra con EmailJS (nueva cuenta)...');
    console.log('📋 Usando Service ID:', EMAILJS_CONFIG.shoppingServiceId);
    console.log('📋 Usando Template ID:', EMAILJS_CONFIG.shoppingTemplateId);
    
    // Usar la nueva cuenta específica para listas de compra
    const result = await emailjs.send(
      EMAILJS_CONFIG.shoppingServiceId, // Nueva cuenta service
      EMAILJS_CONFIG.shoppingTemplateId, // Nueva plantilla
      templateParams,
      EMAILJS_CONFIG.shoppingPublicKey // Nueva public key
    );
    
    console.log('✅ Email de lista de compra enviado exitosamente con EmailJS (nueva cuenta):', result);
    
    return {
      success: true,
      messageId: result.text || result.status || 'emailjs_shopping_success',
      message: 'Email de lista de compra enviado exitosamente'
    };
    
  } catch (error) {
    console.error('Error al enviar el email de lista de compra con EmailJS:', error);
    
    // Mensajes de error específicos para EmailJS
    if (error.text) {
      if (error.text.includes('Template')) {
        throw new Error('Error en la plantilla de EmailJS para lista de compra. Verifica que la plantilla template_qga4ooe esté configurada correctamente.');
      } else if (error.text.includes('Service')) {
        throw new Error('Error en el servicio de EmailJS para lista de compra. Verifica la configuración de service_m8hn4cp.');
      } else if (error.text.includes('Invalid')) {
        throw new Error('Credenciales de EmailJS inválidas para lista de compra. Verifica tu Public Key de la nueva cuenta.');
      } else if (error.text.includes('Variables size limit')) {
        throw new Error('El contenido de la lista es demasiado grande. Intenta generar una lista más corta.');
      } else if (error.text.includes('not found')) {
        throw new Error(`El Service ID "${EMAILJS_CONFIG.shoppingServiceId}" no se encuentra. Verifica que el Service ID sea correcto y que el servicio esté activo en tu cuenta de EmailJS.`);
      }
      throw new Error(`Error de EmailJS: ${error.text}`);
    }
    
    throw error;
  }
}; 