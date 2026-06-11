import { CAMEROON_COUNTRY_CODE, CAMEROON_PAYMENT_PROVIDER_CODES } from "./cameroon.constants"
import { sealCountryPack } from "./hash"
import type { CountryPack } from "./schemas"

const VERIFIED_ON = "2026-06-11"
const VERIFIED_BY = "Codex regulatory source pass; legal-owner approval required before statutory publication"

const cameroonCountryPackUnsealed: CountryPack = {
  header: {
    countryCode: CAMEROON_COUNTRY_CODE,
    countryName: {
      en: "Cameroon",
      fr: "Cameroun",
    },
    currencyCode: "XAF",
    packVersion: "CM-2026.1",
    schemaVersion: "country-pack.v1",
    status: "PUBLISHED",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    verifiedOn: VERIFIED_ON,
    verifiedBy: VERIFIED_BY,
    hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    capabilityMatrix: {
      "taxes.vat": "SUPPORTED",
      "taxes.filing": "SUPPORTED",
      "payroll.cnps": "SUPPORTED",
      "identifiers.niu": "SUPPORTED",
      "identifiers.rccm": "PARTIALLY_SUPPORTED",
      filings: "SUPPORTED",
      labels: "SUPPORTED",
      holidays: "PARTIALLY_SUPPORTED",
      "payments.mobileMoney": "PARTIALLY_SUPPORTED",
    },
    legalRefs: [
      {
        id: "CM_DGI_CGI_2025",
        title: "Code General des Impots mis a jour au 1er janvier 2025",
        jurisdiction: "CM",
        issuedBy: "Direction Generale des Impots du Cameroun",
        sourceUrl: "https://www.impots.cm/fr/code-general-des-impots-mis-jour-au-1er-janvier-2025",
        documentDate: "2025-01-01",
        retrievedOn: VERIFIED_ON,
      },
      {
        id: "CM_DGI_CALENDRIER_FISCAL",
        title: "Calendrier fiscal",
        jurisdiction: "CM",
        issuedBy: "Direction Generale des Impots du Cameroun",
        sourceUrl: "https://www.impots.cm/fr/calendrier-fiscal",
        retrievedOn: VERIFIED_ON,
      },
      {
        id: "CM_DGI_IMMATRICULATION",
        title: "Immatriculation fiscale des contribuables",
        jurisdiction: "CM",
        issuedBy: "Direction Generale des Impots du Cameroun",
        sourceUrl: "https://www.impots.cm/fr/immatriculation",
        retrievedOn: VERIFIED_ON,
      },
      {
        id: "CM_DGI_ESERVICES",
        title: "DGI e-services and DSF submission services",
        jurisdiction: "CM",
        issuedBy: "Direction Generale des Impots du Cameroun",
        sourceUrl: "https://www.impots.cm/",
        retrievedOn: VERIFIED_ON,
      },
      {
        id: "CM_CNPS_CONTRIBUTION_DECREE_2016",
        title: "Decret fixant les taux de cotisations sociales et les plafonds des remunerations",
        jurisdiction: "CM",
        issuedBy: "Presidence de la Republique du Cameroun / CNPS",
        sourceUrl:
          "https://www.cnps.cm/images/documentutile/decret%20fixant%20taux%20de%20cotisations%20sociales%20et%20plafonds%20des%20rmunrations_baremes.pdf",
        documentDate: "2016-02-15",
        retrievedOn: VERIFIED_ON,
      },
      {
        id: "CM_CNPS_EMPLOYER_RULES",
        title: "Regles generales pour les employeurs",
        jurisdiction: "CM",
        issuedBy: "Caisse Nationale de Prevoyance Sociale",
        sourceUrl: "https://www.cnps.cm/fr/employeurs/regles-generales-pour-les-employeurs1.html",
        retrievedOn: VERIFIED_ON,
      },
      {
        id: "CM_HOLIDAY_LEGAL_CALENDAR",
        title: "Cameroon public holiday calendar control",
        jurisdiction: "CM",
        issuedBy: "Government of Cameroon",
        sourceUrl: "https://www.spm.gov.cm/",
        retrievedOn: VERIFIED_ON,
        notes:
          "Annual public-holiday exceptions and movable religious holidays must be loaded from official government communiques before payroll or banking cut-off automation.",
      },
    ],
  },
  parameters: {
    labels: {
      business: [
        {
          value: {
            taxpayerId: { en: "Unique Taxpayer Identification Number", fr: "Numero d'Identifiant Unique" },
            tradeRegister: { en: "Trade and Personal Property Credit Register", fr: "Registre du Commerce" },
            annualTaxReturn: { en: "Annual Statistical and Tax Return", fr: "Declaration Statistique et Fiscale" },
            payrollReturn: { en: "Employer payroll and social declaration", fr: "Declaration employeur et sociale" },
          },
          legalRef: "CM_DGI_IMMATRICULATION",
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          verifiedOn: VERIFIED_ON,
          verifiedBy: VERIFIED_BY,
          verificationStatus: "SOURCE_CHECKED",
        },
      ],
    },
    identifiers: {
      niu: [
        {
          value: {
            required: true,
            issuingAuthority: "DGI",
            localName: "NIU",
            validationMode: "EXTERNAL_REGISTRY_REQUIRED",
            formatHint: "Assigned by DGI online immatriculation; do not infer validity from length alone.",
          },
          legalRef: "CM_DGI_IMMATRICULATION",
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          verifiedOn: VERIFIED_ON,
          verifiedBy: VERIFIED_BY,
          verificationStatus: "SOURCE_CHECKED",
        },
      ],
      rccm: [
        {
          value: {
            requiredForProfessionalTaxpayer: true,
            validationMode: "DOCUMENT_REQUIRED",
            formatHint: "Capture as issued on the RCCM document; exact registry pattern is jurisdiction and office dependent.",
          },
          legalRef: "CM_DGI_IMMATRICULATION",
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          verifiedOn: VERIFIED_ON,
          verifiedBy: VERIFIED_BY,
          verificationStatus: "SOURCE_CHECKED",
        },
      ],
    },
    taxes: {
      vat: {
        standardRateBps: [
          {
            value: 1925,
            legalRef: "CM_DGI_CGI_2025",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "SOURCE_CHECKED",
            notes:
              "Stored in basis points to avoid float drift. Legal owner must re-check against the active CGI before statutory pack promotion.",
          },
        ],
        baseRateBps: [
          {
            value: 1750,
            legalRef: "CM_DGI_CGI_2025",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "SOURCE_CHECKED",
          },
        ],
        additionalCouncilCentimesBps: [
          {
            value: 175,
            legalRef: "CM_DGI_CGI_2025",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "SOURCE_CHECKED",
          },
        ],
        labels: [
          {
            value: {
              en: "Value-added tax",
              fr: "Taxe sur la valeur ajoutee",
              abbreviation: "TVA",
            },
            legalRef: "CM_DGI_CGI_2025",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "SOURCE_CHECKED",
          },
        ],
        filing: {
          monthlyDeclaration: [
            {
              value: {
                name: "Monthly VAT declaration and payment",
                periodicity: "MONTHLY",
                dueRule: "15_DAYS_AFTER_MONTH_END",
                dueDayOfMonth: 15,
              },
              legalRef: "CM_DGI_CALENDRIER_FISCAL",
              effectiveFrom: "2026-01-01",
              effectiveTo: null,
              verifiedOn: VERIFIED_ON,
              verifiedBy: VERIFIED_BY,
              verificationStatus: "SOURCE_CHECKED",
            },
          ],
          annualBalance: [
            {
              value: {
                name: "Annual balance / DSF",
                periodicity: "ANNUAL",
                month: 3,
                day: 15,
              },
              legalRef: "CM_DGI_CALENDRIER_FISCAL",
              effectiveFrom: "2026-01-01",
              effectiveTo: null,
              verifiedOn: VERIFIED_ON,
              verifiedBy: VERIFIED_BY,
              verificationStatus: "SOURCE_CHECKED",
            },
          ],
        },
      },
    },
    filings: {
      taxFilingNames: [
        {
          value: [
            {
              code: "DSF",
              nameEn: "Annual Statistical and Tax Return",
              nameFr: "Declaration Statistique et Fiscale",
              channel: "DGI_TELEDECLARATION",
            },
            {
              code: "VAT_MONTHLY",
              nameEn: "Monthly VAT declaration",
              nameFr: "Declaration mensuelle TVA",
              channel: "DGI_TELEDECLARATION",
            },
            {
              code: "IRPP",
              nameEn: "Personal income tax declaration",
              nameFr: "Declaration IRPP",
              channel: "DGI_TELEDECLARATION",
            },
          ],
          legalRef: "CM_DGI_ESERVICES",
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          verifiedOn: VERIFIED_ON,
          verifiedBy: VERIFIED_BY,
          verificationStatus: "SOURCE_CHECKED",
        },
      ],
    },
    payroll: {
      cnps: {
        familyAllowanceRatesBps: [
          {
            value: {
              general: 700,
              agriculture: 565,
              privateEducation: 370,
              paidBy: "EMPLOYER",
            },
            legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "SOURCE_CHECKED",
          },
        ],
        pensionRatesBps: [
          {
            value: {
              total: 840,
              employer: 420,
              employee: 420,
              monthlyCeilingMinorUnits: 750000,
              annualCeilingMinorUnits: 9000000,
            },
            legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "SOURCE_CHECKED",
          },
        ],
        occupationalRiskRatesBps: [
          {
            value: {
              groupA: 175,
              groupB: 250,
              groupC: 500,
              paidBy: "EMPLOYER",
              classificationRequired: true,
            },
            legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "SOURCE_CHECKED",
          },
        ],
        employerRules: [
          {
            value: {
              registrationRequired: true,
              employeeDeclarationRequired: true,
              payrollBaseRequiresCnpsReview: true,
            },
            legalRef: "CM_CNPS_EMPLOYER_RULES",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "SOURCE_CHECKED",
          },
        ],
      },
    },
    holidays: {
      fixed: [
        {
          value: [
            { month: 1, day: 1, code: "NEW_YEAR" },
            { month: 2, day: 11, code: "YOUTH_DAY" },
            { month: 5, day: 1, code: "LABOUR_DAY" },
            { month: 5, day: 20, code: "NATIONAL_DAY" },
            { month: 8, day: 15, code: "ASSUMPTION" },
            { month: 12, day: 25, code: "CHRISTMAS" },
          ],
          legalRef: "CM_HOLIDAY_LEGAL_CALENDAR",
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          verifiedOn: VERIFIED_ON,
          verifiedBy: VERIFIED_BY,
          verificationStatus: "SOURCE_CHECKED",
          notes:
            "Use only for non-statutory scheduling hints until an official annual calendar source is attached.",
        },
      ],
      movableRules: [
        {
          value: {
            officialAnnualCalendarRequired: true,
            supportedAutomation: "NONE_WITHOUT_OFFICIAL_CALENDAR",
            affectedDomains: ["payroll", "bank_settlement", "tax_deadline_adjustment"],
          },
          legalRef: "CM_HOLIDAY_LEGAL_CALENDAR",
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          verifiedOn: VERIFIED_ON,
          verifiedBy: VERIFIED_BY,
          verificationStatus: "SOURCE_CHECKED",
        },
      ],
    },
    payments: {
      providerLegality: {
        mobileMoney: [
          {
            value: CAMEROON_PAYMENT_PROVIDER_CODES.map((code) => ({
              code,
              legalStatus: code === "OTHER" ? "MANUAL_LEGAL_REVIEW_REQUIRED" : "SUPPORTED_WITH_PROVIDER_KYC",
              settlementEvidenceRequired: true,
              duplicateProviderReferenceBlocked: true,
            })),
            legalRef: "CM_DGI_ESERVICES",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "SOURCE_CHECKED",
            notes:
              "This pack controls platform acceptance. Individual provider license, merchant contract, and settlement evidence must be attached per tenant before automated reconciliation sign-off.",
          },
        ],
      },
    },
  },
  goldenFixtures: [
    {
      id: "cm-vat-standard-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "taxes.vat.standardRateBps",
      date: "2026-06-11",
      purpose: "POS_SALE_TAX",
      expectedValue: 1925,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: "CM-2026.1",
    },
    {
      id: "cm-vat-monthly-deadline-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "taxes.vat.filing.monthlyDeclaration",
      date: "2026-06-11",
      purpose: "TAX_FILING",
      expectedValue: {
        name: "Monthly VAT declaration and payment",
        periodicity: "MONTHLY",
        dueRule: "15_DAYS_AFTER_MONTH_END",
        dueDayOfMonth: 15,
      },
      expectedLegalRef: "CM_DGI_CALENDRIER_FISCAL",
      expectedPackVersion: "CM-2026.1",
    },
    {
      id: "cm-cnps-pension-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "payroll.cnps.pensionRatesBps",
      date: "2026-06-11",
      purpose: "PAYROLL",
      expectedValue: {
        total: 840,
        employer: 420,
        employee: 420,
        monthlyCeilingMinorUnits: 750000,
        annualCeilingMinorUnits: 9000000,
      },
      expectedLegalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      expectedPackVersion: "CM-2026.1",
    },
    {
      id: "cm-niu-required-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "identifiers.niu",
      date: "2026-06-11",
      purpose: "TENANT_ONBOARDING",
      expectedValue: {
        required: true,
        issuingAuthority: "DGI",
        localName: "NIU",
        validationMode: "EXTERNAL_REGISTRY_REQUIRED",
        formatHint: "Assigned by DGI online immatriculation; do not infer validity from length alone.",
      },
      expectedLegalRef: "CM_DGI_IMMATRICULATION",
      expectedPackVersion: "CM-2026.1",
    },
  ],
}

export const cameroonCountryPack = sealCountryPack(cameroonCountryPackUnsealed)
