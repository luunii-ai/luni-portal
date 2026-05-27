import type { LegalDocument } from './types';

/** Termos de Uso B2B da plataforma luni. */
export const termsOfUsePt: LegalDocument = {
  id: 'terms',
  title: 'Termos de Uso',
  subtitle: 'Contrato entre a luni e clínicas/consultórios profissionais (clientes B2B).',
  sections: [
    {
      title: '1. Objeto',
      paragraphs: [
        'A luni é uma plataforma de software (SaaS) que oferece simulação estética com inteligência artificial, simulador de preços e gestão de pacientes para profissionais e clínicas da área estética e cirúrgica eletiva.',
        'Estes Termos regem o acesso e uso da plataforma pelo cliente contratante (clínica, consultório ou profissional habilitado).',
      ],
    },
    {
      title: '2. Natureza das simulações',
      paragraphs: [
        'As simulações geradas por IA são projeções ilustrativas para apoio à consulta comercial e planejamento estético. Não constituem diagnóstico médico, prescrição, garantia de resultado clínico ou substituto do consentimento informado para procedimentos reais.',
        'O profissional contratante é responsável por comunicar essa limitação ao paciente.',
      ],
    },
    {
      title: '3. Papéis na LGPD',
      paragraphs: [
        'Em relação aos dados pessoais dos pacientes cadastrados e fotos enviados, o cliente contratante atua como controlador dos dados e a luni como operadora, processando dados conforme instruções do cliente e para prestação do serviço contratado.',
        'O cliente deve obter consentimento válido dos pacientes antes de enviar fotos ou dados à plataforma.',
      ],
    },
    {
      title: '4. Subprocessadores',
      paragraphs: [
        'Para operar o serviço, a luni pode utilizar provedores de infraestrutura e tecnologia, incluindo, entre outros: processamento de IA (Google Gemini), armazenamento de objetos (Cloudflare R2), banco de dados (MongoDB), pagamentos (Stripe) e envio de e-mail transacional.',
        'A lista atualizada de subprocessadores relevantes consta na Política de Privacidade.',
      ],
    },
    {
      title: '5. Conta e acesso',
      paragraphs: [
        'O acesso é pessoal e intransferível. O cliente é responsável por manter credenciais seguras e por todas as ações realizadas em sua conta.',
        'Contas podem ser criadas mediante assinatura paga ou convite administrativo (contas parceiro). Cadastro público self-service no portal não está disponível.',
      ],
    },
    {
      title: '6. Uso aceitável',
      paragraphs: [
        'É proibido enviar imagens de terceiros sem autorização, usar a plataforma para fins ilícitos, tentar burlar limites técnicos ou de quota, ou utilizar simulações de forma enganosa em publicidade sem autorização específica do paciente.',
      ],
    },
    {
      title: '7. Limitação de responsabilidade',
      paragraphs: [
        'Na extensão permitida pela lei aplicável, a luni não se responsabiliza por decisões clínicas, comerciais ou de marketing tomadas com base nas simulações, nem por uso indevido da plataforma pelo cliente.',
        'A responsabilidade total da luni limita-se ao valor pago pelo cliente nos últimos 12 meses, salvo disposição legal em contrário.',
      ],
    },
    {
      title: '8. Alterações',
      paragraphs: [
        'Estes Termos podem ser atualizados. Alterações relevantes serão comunicadas por e-mail ou aviso na plataforma. O uso continuado após a vigência de nova versão implica aceite, salvo rescisão conforme contrato de assinatura.',
      ],
    },
  ],
};
