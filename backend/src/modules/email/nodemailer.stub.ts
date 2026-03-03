// Stub for nodemailer - install actual dependency for production use
// npm install nodemailer @types/nodemailer

export interface Transporter {
  sendMail(options: any): Promise<any>;
}

export function createTransport(config: any): Transporter {
  return {
    sendMail: async (options: any) => {
      console.log('[EMAIL STUB] Would send email:', options);
      return { messageId: 'stub-' + Date.now() };
    }
  };
}
