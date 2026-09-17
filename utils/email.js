const { Resend } = require("resend");

const sendEmail = async (options) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: "E-Commerce <onboarding@resend.dev>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  });

  if (error) {
    throw new Error(`Resend HTTP API Error: ${error.message}`);
  }

  return data;
};

module.exports = sendEmail;