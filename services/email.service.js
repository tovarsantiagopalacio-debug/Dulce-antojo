const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetEmail = async (to, resetUrl) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `Dulce Antojo <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Recupera tu contraseña — Dulce Antojo',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#34D399;">Dulce Antojo</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el botón para crear una nueva contraseña. El enlace expira en <strong>1 hora</strong>.</p>
        <a href="${resetUrl}"
          style="display:inline-block;margin:16px 0;padding:12px 28px;background:#34D399;color:#0A0A0A;font-weight:bold;border-radius:999px;text-decoration:none;">
          Restablecer contraseña
        </a>
        <p style="color:#888;font-size:12px;">Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.</p>
        <p style="color:#888;font-size:12px;">O copia este enlace en tu navegador:<br>${resetUrl}</p>
      </div>`,
  });
};

const sendWelcomeEmail = async (to, name) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `Dulce Antojo <${process.env.EMAIL_USER}>`,
    to,
    subject: '¡Bienvenido a Dulce Antojo! 🧃',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#34D399;">¡Hola, ${name}!</h2>
        <p>Tu cuenta en <strong>Dulce Antojo</strong> fue creada exitosamente.</p>
        <p>Ya puedes ingresar al catálogo y realizar tus pedidos.</p>
        <a href="${process.env.APP_URL || 'https://dulce-antojo-web-production.up.railway.app'}"
          style="display:inline-block;margin:16px 0;padding:12px 28px;background:#34D399;color:#0A0A0A;font-weight:bold;border-radius:999px;text-decoration:none;">
          Ver catálogo
        </a>
      </div>`,
  });
};

module.exports = { sendResetEmail, sendWelcomeEmail };
