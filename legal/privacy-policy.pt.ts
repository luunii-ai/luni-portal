import type { LegalDocument } from './types';

/** Política de Privacidade (LGPD). */
export const privacyPolicyPt: LegalDocument = {
  id: 'privacy',
  title: 'Política de Privacidade',
  subtitle: 'Como a luni trata dados pessoais na plataforma, em conformidade com a LGPD (Lei nº 13.709/2018).',
  sections: [
    {
      title: '1. Quem somos',
      paragraphs: [
        'A luni opera uma plataforma B2B para clínicas e profissionais de estética e cirurgia eletiva. Esta política descreve o tratamento de dados pessoais de clientes (profissionais/clínicas) e de pacientes cujos dados são inseridos pelos clientes.',
      ],
    },
    {
      title: '2. Dados que tratamos',
      paragraphs: [
        'Dados de clientes: nome, e-mail, telefone, clínica, credenciais de acesso, dados de assinatura e faturamento (via Stripe).',
        'Dados de pacientes (inseridos pelo cliente): nome, contato, fotos, histórico de simulações, notas e metadados de procedimentos.',
        'Dados técnicos: logs de acesso, endereço IP, identificadores de sessão e registros de consentimento.',
      ],
    },
    {
      title: '3. Finalidades e bases legais',
      paragraphs: [
        'Prestação do serviço contratado (execução de contrato).',
        'Processamento de simulações por IA mediante consentimento do paciente obtido pelo controlador (cliente).',
        'Cumprimento de obrigações legais, segurança da plataforma e prevenção a fraudes (legítimo interesse ou obrigação legal).',
        'Comunicações sobre assinatura, suporte e atualizações do produto.',
      ],
    },
    {
      title: '4. Compartilhamento e subprocessadores',
      paragraphs: [
        'Compartilhamos dados apenas na medida necessária para operar o serviço, com provedores que processam dados em nosso nome, incluindo: Google (processamento de imagens por IA), Cloudflare (armazenamento R2), MongoDB (banco de dados), Stripe (pagamentos).',
        'Não vendemos dados pessoais. Não utilizamos fotos de pacientes para treinar modelos de IA próprios.',
      ],
    },
    {
      title: '5. Segurança',
      paragraphs: [
        'Adotamos medidas técnicas e organizacionais compatíveis com o risco, incluindo comunicação criptografada em trânsito (HTTPS/TLS), autenticação por token (JWT), controle de acesso por conta e armazenamento em infraestrutura de cloud com controles de segurança dos provedores.',
      ],
    },
    {
      title: '6. Retenção e exclusão',
      paragraphs: [
        'Mantemos dados enquanto a conta estiver ativa e conforme necessário para cumprir obrigações legais. O cliente controlador pode solicitar exclusão de pacientes e simulações via plataforma, sujeito a backups e prazos legais aplicáveis.',
      ],
    },
    {
      title: '7. Direitos do titular',
      paragraphs: [
        'Titulares de dados (pacientes) devem, em regra, exercer direitos de acesso, correção, exclusão, portabilidade e revogação de consentimento junto à clínica controladora. A luni apoiará o cliente na atendimento de solicitações quando aplicável.',
        'Clientes B2B podem contatar nosso canal de privacidade para questões relacionadas à conta.',
      ],
    },
    {
      title: '8. Contato',
      paragraphs: [
        'Canal de privacidade: privacidade@luni.ai (substituir pelo e-mail oficial antes de produção).',
        'Encarregado/DPO: a designar conforme escala operacional.',
      ],
    },
  ],
};
