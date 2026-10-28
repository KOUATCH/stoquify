import {
  CAMEROON_COUNTRY_CODE,
  CAMEROON_DGI_E_SERVICES_CHANNEL,
  CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
  CAMEROON_PAYMENT_PROVIDER_CODES,
} from "./cameroon.constants";
import { sealCountryPack } from "./hash";
import type { CountryPack } from "./schemas";

const VERIFIED_ON = "2026-06-11";
const VERIFIED_BY =
  "Codex regulatory source pass; legal-owner approval required before statutory publication";
const CNPS_REGULATOR_CONFIRMED_ON = "2026-06-26";
const CNPS_REGULATOR_CONFIRMED_BY =
  "Official CNPS-published contribution decree and employer-rules source review; regulator source URLs recorded in legal references";
const IRPP_EXPERT_REVIEW_REQUIRED_VALUE = {
  productionCalculationSupported: false,
  calculationMode: "OFFICIAL_IRPP_FORMULA_REVIEW_REQUIRED",
  employeeWithholdingRequired: true,
  declarationCode: "IRPP",
  requiredReviewedCoverage: [
    "taxableSalaryBase",
    "familyQuotientOrDependentTreatment",
    "bracketsAndRates",
    "deductibleEmployeeContributions",
    "withholdingRounding",
    "monthlyAndAnnualRegularization",
  ],
} as const;

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
      "payroll.irpp": "REQUIRES_EXPERT_REVIEW",
      "identifiers.niu": "SUPPORTED",
      "identifiers.rccm": "PARTIALLY_SUPPORTED",
      filings: "SUPPORTED",
      labels: "SUPPORTED",
      holidays: "PARTIALLY_SUPPORTED",
      "payments.mobileMoney": "PARTIALLY_SUPPORTED",
      "compliance.eInvoicing": "REQUIRES_EXPERT_REVIEW",
    },
    legalRefs: [
      {
        id: "CM_DGI_CGI_2025",
        title: "Code General des Impots mis a jour au 1er janvier 2025",
        jurisdiction: "CM",
        issuedBy: "Direction Generale des Impots du Cameroun",
        sourceUrl:
          "https://www.impots.cm/fr/code-general-des-impots-mis-jour-au-1er-janvier-2025",
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
        id: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
        title:
          "Cameroon e-invoicing and fiscal certification metadata requiring official technical and legal review",
        jurisdiction: "CM",
        issuedBy: "Direction Generale des Impots du Cameroun",
        sourceUrl: "https://www.impots.cm/",
        retrievedOn: VERIFIED_ON,
        notes:
          "Placeholder reference for roadmap metadata only. Exact e-invoicing mandate, API, portal workflow, certification timing, and artifact requirements require official DGI specifications and qualified expert review before production automation.",
      },
      {
        id: "CM_CNPS_CONTRIBUTION_DECREE_2016",
        title:
          "Decret fixant les taux de cotisations sociales et les plafonds des remunerations",
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
        sourceUrl:
          "https://www.cnps.cm/fr/employeurs/regles-generales-pour-les-employeurs1.html",
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
            taxpayerId: {
              en: "Unique Taxpayer Identification Number",
              fr: "Numero d'Identifiant Unique",
            },
            tradeRegister: {
              en: "Trade and Personal Property Credit Register",
              fr: "Registre du Commerce",
            },
            annualTaxReturn: {
              en: "Annual Statistical and Tax Return",
              fr: "Declaration Statistique et Fiscale",
            },
            payrollReturn: {
              en: "Employer payroll and social declaration",
              fr: "Declaration employeur et sociale",
            },
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
            formatHint:
              "Assigned by DGI online immatriculation; do not infer validity from length alone.",
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
            formatHint:
              "Capture as issued on the RCCM document; exact registry pattern is jurisdiction and office dependent.",
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
            verifiedOn: CNPS_REGULATOR_CONFIRMED_ON,
            verifiedBy: CNPS_REGULATOR_CONFIRMED_BY,
            verificationStatus: "REGULATOR_CONFIRMED",
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
            verifiedOn: CNPS_REGULATOR_CONFIRMED_ON,
            verifiedBy: CNPS_REGULATOR_CONFIRMED_BY,
            verificationStatus: "REGULATOR_CONFIRMED",
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
            verifiedOn: CNPS_REGULATOR_CONFIRMED_ON,
            verifiedBy: CNPS_REGULATOR_CONFIRMED_BY,
            verificationStatus: "REGULATOR_CONFIRMED",
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
            verifiedOn: CNPS_REGULATOR_CONFIRMED_ON,
            verifiedBy: CNPS_REGULATOR_CONFIRMED_BY,
            verificationStatus: "REGULATOR_CONFIRMED",
          },
        ],
      },
      irpp: {
        incomeTaxRules: [
          {
            value: IRPP_EXPERT_REVIEW_REQUIRED_VALUE,
            legalRef: "CM_DGI_CGI_2025",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "REQUIRES_EXPERT_REVIEW",
            notes:
              "Blocks production payroll income-tax withholding until reviewed IRPP formulas, bases, reliefs, caps, rounding, and YTD regularization fixtures are loaded.",
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
            affectedDomains: [
              "payroll",
              "bank_settlement",
              "tax_deadline_adjustment",
            ],
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
              legalStatus:
                code === "OTHER"
                  ? "MANUAL_LEGAL_REVIEW_REQUIRED"
                  : "SUPPORTED_WITH_PROVIDER_KYC",
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
    compliance: {
      eInvoicing: {
        capability: [
          {
            value: {
              status: "REQUIRES_EXPERT_REVIEW",
              productionAutomationAllowed: false,
              automationBlockReason:
                "Cameroon e-invoicing/fiscal certification details require official DGI technical specifications and qualified legal/accounting review before any production adapter or certification workflow is enabled.",
              supportedDocumentTypes: [
                "POS_RECEIPT",
                "SALES_INVOICE",
                "CREDIT_NOTE",
              ],
              requiresPostedLedgerSource: true,
              requiresOfficialTechnicalSpec: true,
              requiredExpertReviewBeforeAdapter: true,
            },
            legalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "REQUIRES_EXPERT_REVIEW",
            notes:
              "Capability metadata is intentionally non-certified. It exists so the Compliance Center can block production automation while preserving the Cameroon-first roadmap shape.",
          },
        ],
        requiredFields: [
          {
            value: {
              documentTypes: ["POS_RECEIPT", "SALES_INVOICE", "CREDIT_NOTE"],
              fields: [
                {
                  scope: "SELLER",
                  field: "taxpayerIdentifier",
                  required: true,
                  notes:
                    "NIU expected; exact statutory mention requires expert review.",
                },
                { scope: "SELLER", field: "legalName", required: true },
                { scope: "SELLER", field: "registeredAddress", required: true },
                {
                  scope: "BUYER",
                  field: "taxpayerIdentifier",
                  required: true,
                  when: "Buyer is a professional taxpayer or the final DGI rules require buyer identification.",
                  notes:
                    "Consumer/B2B threshold rules require official confirmation.",
                },
                { scope: "DOCUMENT", field: "documentType", required: true },
                { scope: "DOCUMENT", field: "issueDate", required: true },
                { scope: "DOCUMENT", field: "currencyCode", required: true },
                { scope: "LINE", field: "description", required: true },
                { scope: "LINE", field: "quantity", required: true },
                { scope: "LINE", field: "unitPriceMinorUnits", required: true },
                { scope: "TAX", field: "vatBreakdown", required: true },
                { scope: "PAYMENT", field: "settlementMethod", required: true },
                {
                  scope: "SOURCE_TRACE",
                  field: "postedLedgerSourceLink",
                  required: true,
                },
              ],
              missingFieldPolicy: "REQUIRES_EXPERT_REVIEW",
            },
            legalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "REQUIRES_EXPERT_REVIEW",
            notes:
              "Minimum canonical field map for future adapter design. Exact mandatory mentions, buyer rules, and taxable/tax-exempt line requirements require official validation.",
          },
        ],
        certificationPolicy: [
          {
            value: {
              certificationTiming: "REQUIRES_EXPERT_REVIEW",
              legalDeliveryWhenUncertified: "BLOCK",
              offlineFinalNumberPolicy: "SERVER_ASSIGNED_ONLY",
              requiresLedgerSourceTrace: true,
              authorityCallInsideSaleTransactionAllowed: false,
            },
            legalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "REQUIRES_EXPERT_REVIEW",
            notes:
              "Conservative default for the roadmap: no statutory delivery should be enabled until certification timing is confirmed by official sources.",
          },
        ],
        authorityChannels: [
          {
            value: [
              {
                code: CAMEROON_DGI_E_SERVICES_CHANNEL,
                authorityName: "Direction Generale des Impots du Cameroun",
                channelType: "PORTAL",
                adapterReadiness: "REQUIRES_EXPERT_REVIEW",
                adapterKey: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
                sandboxOnly: true,
                supportedDocumentTypes: [
                  "POS_RECEIPT",
                  "SALES_INVOICE",
                  "CREDIT_NOTE",
                ],
                requiresTenantCredentials: true,
                credentialStoragePolicy: "VAULT_ONLY",
                endpointMetadata: {
                  officialSpecStatus: "REQUIRES_EXPERT_REVIEW",
                  documentationUrl: "https://www.impots.cm/",
                  secretsAllowedInPack: false,
                  notes:
                    "Country packs may describe public channel metadata only. Tenant credentials and any future endpoint secrets must live in the adapter configuration vault, never in the pack.",
                },
              },
            ],
            legalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "REQUIRES_EXPERT_REVIEW",
          },
        ],
        manualPortalFallback: [
          {
            value: {
              availability: "REQUIRES_EXPERT_REVIEW",
              allowedWhen: [
                "OFFICIAL_API_NOT_AVAILABLE",
                "AUTHORITY_PORTAL_REQUIRED",
                "AUTHORITY_OUTAGE_WITH_APPROVAL",
              ],
              requiresFreshAuth: true,
              requiresApproval: true,
              evidenceRequired: [
                "portalSubmissionReference",
                "submittedPayloadHash",
                "submittedAt",
                "submittedBy",
                "approvalActorId",
                "portalReceiptOrScreenshotHash",
                "fallbackReasonCode",
              ],
              immutableEvidenceHashRequired: true,
            },
            legalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "REQUIRES_EXPERT_REVIEW",
            notes:
              "Fallback is a controlled evidence workflow placeholder, not permission to bypass certification. Exact portal fallback legality requires expert review.",
          },
        ],
        artifactExpectations: [
          {
            value: {
              hashRequired: true,
              immutableStorageRequired: true,
              expectedArtifacts: [
                {
                  code: "AUTHORITY_REFERENCE",
                  source: "AUTHORITY",
                  required: false,
                  verificationStatus: "REQUIRES_EXPERT_REVIEW",
                  notes:
                    "Exact final reference format requires official DGI specification.",
                },
                {
                  code: "QR_CODE_PAYLOAD",
                  source: "AUTHORITY",
                  required: false,
                  verificationStatus: "REQUIRES_EXPERT_REVIEW",
                  notes:
                    "Do not render QR codes as statutory evidence until confirmed by official specification.",
                },
                {
                  code: "SUBMITTED_PAYLOAD_HASH",
                  source: "PLATFORM",
                  required: true,
                  verificationStatus: "SOURCE_CHECKED",
                },
                {
                  code: "MANUAL_PORTAL_PROOF",
                  source: "MANUAL_PORTAL",
                  required: true,
                  verificationStatus: "REQUIRES_EXPERT_REVIEW",
                },
              ],
              receiptDisplayFields: [
                "certificationStatus",
                "authorityReference",
                "qrCodePayload",
              ],
            },
            legalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            verifiedOn: VERIFIED_ON,
            verifiedBy: VERIFIED_BY,
            verificationStatus: "REQUIRES_EXPERT_REVIEW",
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
      calculationScenario: {
        input: {
          grossAmount: "1000000.00",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          grossAmount: "1000000.00",
          socialBaseAmount: "750000.00",
          employeePensionRateBps: "420",
          employerPensionRateBps: "420",
          employeePensionContributionAmount: "31500.00",
          employerPensionContributionAmount: "31500.00",
          totalPensionContributionAmount: "63000.00",
          currency: "XAF",
        },
        reviewStatus: "REGULATOR_CONFIRMED",
        reviewEvidence: {
          reviewedBy: CNPS_REGULATOR_CONFIRMED_BY,
          reviewedOn: CNPS_REGULATOR_CONFIRMED_ON,
          legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
          sourceEvidenceHash: "sha256:cm-cnps-regulator-confirmed-2026",
        },
        notes:
          "Pins the CNPS pension ceiling plus employee and employer contribution rates from the regulator-confirmed country-pack envelope.",
      },
    },
    {
      id: "cm-cnps-family-allowance-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "payroll.cnps.familyAllowanceRatesBps",
      date: "2026-06-11",
      purpose: "PAYROLL_CNPS_FAMILY_ALLOWANCE",
      expectedValue: {
        general: 700,
        agriculture: 565,
        privateEducation: 370,
        paidBy: "EMPLOYER",
      },
      expectedLegalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      expectedPackVersion: "CM-2026.1",
      calculationScenario: {
        input: {
          contributionBaseAmount: "100000.00",
          sector: "GENERAL",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          contributionBaseAmount: "100000.00",
          familyAllowanceSector: "GENERAL",
          familyAllowanceRateBps: "700",
          familyAllowanceContributionAmount: "7000.00",
          currency: "XAF",
        },
        reviewStatus: "REGULATOR_CONFIRMED",
        reviewEvidence: {
          reviewedBy: CNPS_REGULATOR_CONFIRMED_BY,
          reviewedOn: CNPS_REGULATOR_CONFIRMED_ON,
          legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
          sourceEvidenceHash: "sha256:cm-cnps-regulator-confirmed-2026",
        },
        notes:
          "Pins the general-sector CNPS family allowance employer contribution from the regulator-confirmed country-pack envelope.",
      },
    },
    {
      id: "cm-cnps-family-allowance-agriculture-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "payroll.cnps.familyAllowanceRatesBps",
      date: "2026-06-11",
      purpose: "PAYROLL_CNPS_FAMILY_ALLOWANCE_AGRICULTURE",
      expectedValue: {
        general: 700,
        agriculture: 565,
        privateEducation: 370,
        paidBy: "EMPLOYER",
      },
      expectedLegalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      expectedPackVersion: "CM-2026.1",
      calculationScenario: {
        input: {
          contributionBaseAmount: "100000.00",
          sector: "AGRICULTURE",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          contributionBaseAmount: "100000.00",
          familyAllowanceSector: "AGRICULTURE",
          familyAllowanceRateBps: "565",
          familyAllowanceContributionAmount: "5650.00",
          currency: "XAF",
        },
        reviewStatus: "REGULATOR_CONFIRMED",
        reviewEvidence: {
          reviewedBy: CNPS_REGULATOR_CONFIRMED_BY,
          reviewedOn: CNPS_REGULATOR_CONFIRMED_ON,
          legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
          sourceEvidenceHash: "sha256:cm-cnps-regulator-confirmed-2026",
        },
        notes:
          "Pins the agriculture-sector CNPS family allowance employer contribution from the regulator-confirmed country-pack envelope.",
      },
    },
    {
      id: "cm-cnps-family-allowance-private-education-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "payroll.cnps.familyAllowanceRatesBps",
      date: "2026-06-11",
      purpose: "PAYROLL_CNPS_FAMILY_ALLOWANCE_PRIVATE_EDUCATION",
      expectedValue: {
        general: 700,
        agriculture: 565,
        privateEducation: 370,
        paidBy: "EMPLOYER",
      },
      expectedLegalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      expectedPackVersion: "CM-2026.1",
      calculationScenario: {
        input: {
          contributionBaseAmount: "100000.00",
          sector: "PRIVATE_EDUCATION",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          contributionBaseAmount: "100000.00",
          familyAllowanceSector: "PRIVATE_EDUCATION",
          familyAllowanceRateBps: "370",
          familyAllowanceContributionAmount: "3700.00",
          currency: "XAF",
        },
        reviewStatus: "REGULATOR_CONFIRMED",
        reviewEvidence: {
          reviewedBy: CNPS_REGULATOR_CONFIRMED_BY,
          reviewedOn: CNPS_REGULATOR_CONFIRMED_ON,
          legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
          sourceEvidenceHash: "sha256:cm-cnps-regulator-confirmed-2026",
        },
        notes:
          "Pins the private-education-sector CNPS family allowance employer contribution from the regulator-confirmed country-pack envelope.",
      },
    },
    {
      id: "cm-cnps-occupational-risk-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "payroll.cnps.occupationalRiskRatesBps",
      date: "2026-06-11",
      purpose: "PAYROLL_CNPS_OCCUPATIONAL_RISK",
      expectedValue: {
        groupA: 175,
        groupB: 250,
        groupC: 500,
        paidBy: "EMPLOYER",
        classificationRequired: true,
      },
      expectedLegalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      expectedPackVersion: "CM-2026.1",
      calculationScenario: {
        input: {
          contributionBaseAmount: "100000.00",
          group: "A",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          contributionBaseAmount: "100000.00",
          occupationalRiskGroup: "A",
          occupationalRiskRateBps: "175",
          occupationalRiskContributionAmount: "1750.00",
          currency: "XAF",
        },
        reviewStatus: "REGULATOR_CONFIRMED",
        reviewEvidence: {
          reviewedBy: CNPS_REGULATOR_CONFIRMED_BY,
          reviewedOn: CNPS_REGULATOR_CONFIRMED_ON,
          legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
          sourceEvidenceHash: "sha256:cm-cnps-regulator-confirmed-2026",
        },
        notes:
          "Pins the group A CNPS occupational-risk employer contribution from the regulator-confirmed country-pack envelope.",
      },
    },
    {
      id: "cm-cnps-occupational-risk-group-b-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "payroll.cnps.occupationalRiskRatesBps",
      date: "2026-06-11",
      purpose: "PAYROLL_CNPS_OCCUPATIONAL_RISK_GROUP_B",
      expectedValue: {
        groupA: 175,
        groupB: 250,
        groupC: 500,
        paidBy: "EMPLOYER",
        classificationRequired: true,
      },
      expectedLegalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      expectedPackVersion: "CM-2026.1",
      calculationScenario: {
        input: {
          contributionBaseAmount: "100000.00",
          group: "B",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          contributionBaseAmount: "100000.00",
          occupationalRiskGroup: "B",
          occupationalRiskRateBps: "250",
          occupationalRiskContributionAmount: "2500.00",
          currency: "XAF",
        },
        reviewStatus: "REGULATOR_CONFIRMED",
        reviewEvidence: {
          reviewedBy: CNPS_REGULATOR_CONFIRMED_BY,
          reviewedOn: CNPS_REGULATOR_CONFIRMED_ON,
          legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
          sourceEvidenceHash: "sha256:cm-cnps-regulator-confirmed-2026",
        },
        notes:
          "Pins the group B CNPS occupational-risk employer contribution from the regulator-confirmed country-pack envelope.",
      },
    },
    {
      id: "cm-cnps-occupational-risk-group-c-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "payroll.cnps.occupationalRiskRatesBps",
      date: "2026-06-11",
      purpose: "PAYROLL_CNPS_OCCUPATIONAL_RISK_GROUP_C",
      expectedValue: {
        groupA: 175,
        groupB: 250,
        groupC: 500,
        paidBy: "EMPLOYER",
        classificationRequired: true,
      },
      expectedLegalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      expectedPackVersion: "CM-2026.1",
      calculationScenario: {
        input: {
          contributionBaseAmount: "100000.00",
          group: "C",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          contributionBaseAmount: "100000.00",
          occupationalRiskGroup: "C",
          occupationalRiskRateBps: "500",
          occupationalRiskContributionAmount: "5000.00",
          currency: "XAF",
        },
        reviewStatus: "REGULATOR_CONFIRMED",
        reviewEvidence: {
          reviewedBy: CNPS_REGULATOR_CONFIRMED_BY,
          reviewedOn: CNPS_REGULATOR_CONFIRMED_ON,
          legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
          sourceEvidenceHash: "sha256:cm-cnps-regulator-confirmed-2026",
        },
        notes:
          "Pins the group C CNPS occupational-risk employer contribution from the regulator-confirmed country-pack envelope.",
      },
    },
    {
      id: "cm-cnps-employer-rules-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "payroll.cnps.employerRules",
      date: "2026-06-11",
      purpose: "PAYROLL_EMPLOYER_RULES",
      expectedValue: {
        registrationRequired: true,
        employeeDeclarationRequired: true,
        payrollBaseRequiresCnpsReview: true,
      },
      expectedLegalRef: "CM_CNPS_EMPLOYER_RULES",
      expectedPackVersion: "CM-2026.1",
    },
    {
      id: "cm-irpp-income-tax-rules-review-required-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "payroll.irpp.incomeTaxRules",
      date: "2026-06-11",
      purpose: "PAYROLL_IRPP_INCOME_TAX",
      expectedValue: IRPP_EXPERT_REVIEW_REQUIRED_VALUE,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: "CM-2026.1",
      notes:
        "Explicit full-production blocker until reviewed IRPP calculation fixtures are loaded.",
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
        formatHint:
          "Assigned by DGI online immatriculation; do not infer validity from length alone.",
      },
      expectedLegalRef: "CM_DGI_IMMATRICULATION",
      expectedPackVersion: "CM-2026.1",
    },
    {
      id: "cm-einvoicing-capability-review-required-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "compliance.eInvoicing.capability",
      date: "2026-06-11",
      purpose: "COMPLIANCE_CENTER_READINESS",
      expectedValue: {
        status: "REQUIRES_EXPERT_REVIEW",
        productionAutomationAllowed: false,
        automationBlockReason:
          "Cameroon e-invoicing/fiscal certification details require official DGI technical specifications and qualified legal/accounting review before any production adapter or certification workflow is enabled.",
        supportedDocumentTypes: ["POS_RECEIPT", "SALES_INVOICE", "CREDIT_NOTE"],
        requiresPostedLedgerSource: true,
        requiresOfficialTechnicalSpec: true,
        requiredExpertReviewBeforeAdapter: true,
      },
      expectedLegalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
      expectedPackVersion: "CM-2026.1",
    },
    {
      id: "cm-einvoicing-certification-policy-2026",
      countryCode: CAMEROON_COUNTRY_CODE,
      parameterPath: "compliance.eInvoicing.certificationPolicy",
      date: "2026-06-11",
      purpose: "COMPLIANCE_CENTER_CERTIFICATION_GATE",
      expectedValue: {
        certificationTiming: "REQUIRES_EXPERT_REVIEW",
        legalDeliveryWhenUncertified: "BLOCK",
        offlineFinalNumberPolicy: "SERVER_ASSIGNED_ONLY",
        requiresLedgerSourceTrace: true,
        authorityCallInsideSaleTransactionAllowed: false,
      },
      expectedLegalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
      expectedPackVersion: "CM-2026.1",
    },
  ],
};

export const cameroonCountryPack = sealCountryPack(cameroonCountryPackUnsealed);
