export type FileSliderItem = {
  id: string;
  title: string;
  description: string;
  tabLabel: string;
};

export const FILE_SLIDER_ITEMS_LEFT: FileSliderItem[] = [
  {
    id: "hemograma",
    title: "Hemograma Completo",
    description:
      "Análisis hematológico con conteo diferencial de leucocitos, eritrocitos y plaquetas. Verificado on-chain.",
    tabLabel: "LAB",
  },
  {
    id: "rx-torax",
    title: "Radiografía de Tórax",
    description:
      "Estudio imagenológico posteroanterior y lateral. Sin hallazgos patológicos significativos.",
    tabLabel: "IMG",
  },
  {
    id: "perfil-bioquimico",
    title: "Perfil Bioquímico",
    description:
      "Panel metabólico completo incluyendo glucosa, creatinina, electrolitos y función hepática.",
    tabLabel: "BIO",
  },
  {
    id: "electrocardiograma",
    title: "Electrocardiograma",
    description:
      "Registro de actividad eléctrica cardíaca en reposo. Ritmo sinusal normal, sin alteraciones.",
    tabLabel: "ECG",
  },
  {
    id: "orden-medica",
    title: "Orden Médica",
    description:
      "Solicitud de exámenes de control anual emitida por médico tratante. Firmada digitalmente.",
    tabLabel: "ORD",
  },
];

export const FILE_SLIDER_ITEMS_RIGHT: FileSliderItem[] = [
  {
    id: "receta",
    title: "Receta Médica",
    description:
      "Prescripción farmacológica con dosificación y duración del tratamiento. Firmada por profesional habilitado.",
    tabLabel: "RX",
  },
  {
    id: "informe-quirurgico",
    title: "Informe Quirúrgico",
    description:
      "Detalle de procedimiento realizado, técnica utilizada y hallazgos intraoperatorios.",
    tabLabel: "QX",
  },
  {
    id: "consentimiento",
    title: "Consentimiento Informado",
    description:
      "Documento de autorización del paciente para procedimientos médicos. Validado con firma digital.",
    tabLabel: "CI",
  },
  {
    id: "epicrisis",
    title: "Epicrisis",
    description:
      "Resumen de hospitalización incluyendo diagnósticos, tratamientos realizados e indicaciones al alta.",
    tabLabel: "EPI",
  },
  {
    id: "licencia",
    title: "Licencia Médica",
    description:
      "Certificado de reposo laboral emitido por médico tratante. Registro inmutable en blockchain.",
    tabLabel: "LIC",
  },
];
