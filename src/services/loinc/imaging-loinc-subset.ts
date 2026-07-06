/**
 * Local subset of abdominal ultrasound LOINC codes.
 * Shared between client and server for instant fallback and suggestions.
 * Codes marked as `verified: false` should be validated with the LOINC API
 * before being used in production.
 */

import type { LoincEntry } from "./types";

export const ABDOMINAL_ULTRASOUND_LOINC_SUBSET: LoincEntry[] = [
  {
    code: "79377-4",
    display: "Ultrasound abdomen",
    spanishDisplay: "Ecografía de abdomen",
    aliases: [
      "abdomen ultrasound",
      "ecografia abdominal",
      "ultrasonido abdomen",
    ],
    component: "Ultrasound abdomen",
    system: "Abdomen",
    scale: "Nar",
    verified: false,
  },
  {
    code: "14590-3",
    display: "Kidney size [Length] by US",
    spanishDisplay: "Tamaño renal (longitud) por ecografía",
    aliases: ["kidney size", "renal length", "tamaño riñon", "longitud renal"],
    component: "Kidney size",
    system: "Kidney",
    scale: "Qn",
    verified: false,
  },
  {
    code: "14591-1",
    display: "Liver size [Length] by US",
    spanishDisplay: "Tamaño hepático (longitud) por ecografía",
    aliases: ["liver size", "liver length", "tamaño higado", "longitud higado"],
    component: "Liver size",
    system: "Liver",
    scale: "Qn",
    verified: false,
  },
  {
    code: "14592-9",
    display: "Spleen size [Length] by US",
    spanishDisplay: "Tamaño esplénico (longitud) por ecografía",
    aliases: ["spleen size", "spleen length", "tamaño bazo", "longitud bazo"],
    component: "Spleen size",
    system: "Spleen",
    scale: "Qn",
    verified: false,
  },
  {
    code: "14593-7",
    display: "Bladder volume [Volume] by US",
    spanishDisplay: "Volumen vesical por ecografía",
    aliases: ["bladder volume", "volumen vejiga", "vejiga"],
    component: "Bladder volume",
    system: "Bladder",
    scale: "Qn",
    verified: false,
  },
  {
    code: "14594-5",
    display: "Gallbladder wall thickness [Length] by US",
    spanishDisplay: "Grosor de pared vesicular por ecografía",
    aliases: ["gallbladder wall", "vesicula", "pared vesicular"],
    component: "Gallbladder wall thickness",
    system: "Gallbladder",
    scale: "Qn",
    verified: false,
  },
];
