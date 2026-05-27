import type { LegalDocument } from './types';

/** Modelo de consentimento do paciente para uso na clínica e registro digital na luni. */
export const patientConsentPt: LegalDocument = {
  id: 'patient-consent',
  title: 'Consentimento do Paciente',
  subtitle: 'Autorização para uso de foto e simulação estética com inteligência artificial.',
  sections: [
    {
      title: 'Identificação',
      paragraphs: [
        'Eu, ________________________________ (paciente), autorizo a clínica/profissional ________________________________ a utilizar minha fotografia para simulação estética na plataforma luni.',
      ],
    },
    {
      title: 'Finalidade',
      paragraphs: [
        'A foto será utilizada exclusivamente para gerar projeções ilustrativas (antes/depois) de procedimentos estéticos ou cirúrgicos eletivos discutidos na consulta, auxiliando meu entendimento sobre possíveis resultados.',
        'Compreendo que a simulação é gerada por inteligência artificial e não garante o resultado final de qualquer procedimento real.',
      ],
    },
    {
      title: 'Tratamento de dados',
      paragraphs: [
        'Autorizo o processamento da imagem por sistemas de IA operados pela luni e seus provedores de tecnologia (incluindo serviços de nuvem), bem como o armazenamento seguro da foto original e das simulações vinculadas ao meu cadastro na clínica.',
        'A clínica atua como controladora dos meus dados; a luni atua como operadora de dados em nome da clínica.',
      ],
    },
    {
      title: 'Compartilhamento e uso secundário',
      paragraphs: [
        'Não autorizo, por este termo, o uso da minha imagem em publicidade, redes sociais, portfólio ou materiais de marketing, salvo se assinado termo específico para essa finalidade.',
      ],
    },
    {
      title: 'Direitos LGPD',
      paragraphs: [
        'Tenho ciência de que posso solicitar acesso, correção, exclusão ou revogação deste consentimento junto à clínica, observadas limitações legais e contratuais aplicáveis.',
      ],
    },
    {
      title: 'Assinatura',
      paragraphs: [
        'Local e data: ________________________________',
        'Assinatura do paciente: ________________________________',
        'Profissional responsável: ________________________________',
        'Registro digital na luni (quando aplicável): data/hora, versão do termo e identificação do profissional logado.',
      ],
    },
  ],
};
