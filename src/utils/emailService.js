// Servicio de Email para Fitness4All usando EmailJS
// Este archivo maneja el envío de correos electrónicos usando el servicio EmailJS

import emailjs from '@emailjs/browser';

// Configuración de EmailJS
const EMAILJS_CONFIG = {
  serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_default',
  templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'template_default', 
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'your_public_key'
};

// Función para procesar Markdown y convertirlo a HTML bonito
const processMarkdownToHTML = (markdownContent) => {
  let html = markdownContent;
  
  // Convertir encabezados ## -> <h2>, ### -> <h3>
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  
  // Convertir texto en negrita **texto** -> <strong>texto</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Procesar listas: convertir - item en <li>item</li>
  const lines = html.split('\n');
  let processedLines = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('- ')) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${line.substring(2)}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (line) {
        processedLines.push(`<p>${line}</p>`);
      } else {
        processedLines.push('<br>');
      }
    }
  }
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines.join('');
};

// Función para generar el contenido HTML del email simplificado
export const generateExercisePlanEmailHTML = (planContent, planTitle, userName) => {
  const processedContent = processMarkdownToHTML(planContent);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fitness4All - Tu Plan de Entrenamiento</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8f9fa;
          margin: 0;
          padding: 20px;
          line-height: 1.6;
          color: #333333;
        }
        .email-container {
          max-width: 700px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .plan-title {
          color: #2c3e50;
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 25px;
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 2px solid #e9ecef;
        }
        .plan-content {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 25px;
          margin: 20px 0;
          line-height: 1.7;
        }
        .plan-content h2 {
          color: #2c3e50;
          font-size: 18px;
          font-weight: 600;
          margin: 25px 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #667eea;
        }
        .plan-content h3 {
          color: #495057;
          font-size: 16px;
          font-weight: 600;
          margin: 20px 0 10px 0;
        }
        .plan-content ul {
          padding-left: 20px;
          margin: 10px 0;
        }
        .plan-content li {
          margin: 6px 0;
          line-height: 1.5;
        }
        .plan-content strong {
          color: #2c3e50;
          font-weight: 600;
        }
        .plan-content p {
          margin: 10px 0;
        }
        .tips {
          background: linear-gradient(135deg, #e8f5e8 0%, #f0f9ff 100%);
          border-left: 4px solid #28a745;
          border-radius: 6px;
          padding: 20px;
          margin: 25px 0;
        }
        .tips h4 {
          color: #155724;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .tips ul {
          margin: 0;
          color: #155724;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #dee2e6;
          color: #6c757d;
          font-size: 14px;
        }
        @media (max-width: 600px) {
          body { padding: 10px; }
          .content, .header, .footer { padding: 20px; }
          .plan-content { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>🏋️ FITNESS4ALL</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Tu entrenador personal virtual</p>
        </div>
        
        <div class="content">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">¡Hola ${userName}! 💪</h2>
          
          <p>Aquí tienes tu plan de entrenamiento personalizado, diseñado específicamente para tus objetivos.</p>
          
          <div class="plan-title">${planTitle}</div>
          
          <div class="plan-content">${processedContent}</div>
          
          <div class="tips">
            <h4>💡 Consejos importantes:</h4>
            <ul>
              <li><strong>Calentamiento:</strong> Siempre realízalo antes de entrenar</li>
              <li><strong>Hidratación:</strong> Mantente bien hidratado durante el ejercicio</li>
              <li><strong>Descanso:</strong> Respeta los días de recuperación</li>
              <li><strong>Escucha tu cuerpo:</strong> Si sientes dolor, para y consulta un profesional</li>
            </ul>
          </div>
          
          <p style="text-align: center; margin-top: 30px; color: #667eea; font-weight: 600; font-size: 16px;">
            ¡A por todas! 🚀
          </p>
        </div>
        
        <div class="footer">
          <strong>Fitness4All</strong> - Entrenamiento Personalizado con IA<br>
          © 2024 Todos los derechos reservados
        </div>
      </div>
    </body>
    </html>
  `;
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
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey ||
        EMAILJS_CONFIG.serviceId === 'service_default' || 
        EMAILJS_CONFIG.templateId === 'template_default' ||
        EMAILJS_CONFIG.publicKey === 'your_public_key') {
      throw new Error('EmailJS no está configurado correctamente. Verifica las variables de entorno REACT_APP_EMAILJS_*');
    }
    
    // Generar contenido HTML y texto
    const htmlContent = generateExercisePlanEmailHTML(
      emailData.planContent, 
      emailData.planTitle, 
      emailData.userName
    );
    
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
      plan_content: emailData.planContent,
      html_content: htmlContent,
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
    
    // Enviar email usando EmailJS
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
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

// Configuración de email (para uso futuro con backend)
export const EMAIL_CONFIG = {
  templates: {
    exercisePlan: {
      subject: 'Tu Plan de Entrenamiento Personalizado - Fitness4All',
      from: 'Fitness4All <noreply@fitness4all.com>'
    }
  }
}; 