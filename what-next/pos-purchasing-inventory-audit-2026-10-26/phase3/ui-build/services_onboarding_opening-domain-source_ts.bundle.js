"use strict";
(self["webpackChunkSTOQUIFY"] = self["webpackChunkSTOQUIFY"] || []).push([["services_onboarding_opening-domain-source_ts"],{

/***/ "./lib/item/form-validation.ts":
/*!*************************************!*\
  !*** ./lib/item/form-validation.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   itemImageReferenceSchema: () => (/* binding */ itemImageReferenceSchema),
/* harmony export */   itemNameEnSchema: () => (/* binding */ itemNameEnSchema),
/* harmony export */   itemNonNegativeNumberSchema: () => (/* binding */ itemNonNegativeNumberSchema),
/* harmony export */   itemOrganizationIdSchema: () => (/* binding */ itemOrganizationIdSchema),
/* harmony export */   itemSkuSchema: () => (/* binding */ itemSkuSchema),
/* harmony export */   nullableTrimmedItemText: () => (/* binding */ nullableTrimmedItemText),
/* harmony export */   validateItemStockRange: () => (/* binding */ validateItemStockRange)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/types.js");
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/ZodError.js");

const itemOrganizationIdSchema = zod__WEBPACK_IMPORTED_MODULE_0__.string().min(1, "Organization ID is required");
const itemNameEnSchema = zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(1, "English name is required").max(255);
const itemSkuSchema = zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(1, "SKU is required").max(128);
function itemNonNegativeNumberSchema(message) {
    const schema = zod__WEBPACK_IMPORTED_MODULE_0__.coerce.number();
    return message ? schema.min(0, message) : schema.min(0);
}
const nullableTrimmedItemText = (max)=>zod__WEBPACK_IMPORTED_MODULE_0__.preprocess((value)=>typeof value === "string" && value.trim() === "" ? null : value, zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().max(max).nullable().optional());
const itemImageReferenceSchema = zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(1, "Product image is required").refine((value)=>value.startsWith("/") || zod__WEBPACK_IMPORTED_MODULE_0__.string().url().safeParse(value).success, "Product image must be a valid URL");
function validateItemStockRange(data, ctx) {
    if (data.maxStockLevel !== null && data.maxStockLevel !== undefined && data.maxStockLevel < data.minStockLevel) {
        ctx.addIssue({
            code: zod__WEBPACK_IMPORTED_MODULE_1__.ZodIssueCode.custom,
            message: "Maximum stock level must be greater than or equal to minimum stock level",
            path: [
                "maxStockLevel"
            ]
        });
    }
}


/***/ }),

/***/ "./lib/media/policy.ts":
/*!*****************************!*\
  !*** ./lib/media/policy.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MEDIA_URL_PREFIX: () => (/* binding */ MEDIA_URL_PREFIX),
/* harmony export */   PICTURE_MAX_BYTES: () => (/* binding */ PICTURE_MAX_BYTES),
/* harmony export */   PICTURE_MIME_TYPES: () => (/* binding */ PICTURE_MIME_TYPES),
/* harmony export */   mediaIdFromUrl: () => (/* binding */ mediaIdFromUrl)
/* harmony export */ });
// Permanent picture uploads use managed online storage; local files are legacy reads.
const PICTURE_MAX_BYTES = 4 * 1024 * 1024;
const PICTURE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
];
const MEDIA_URL_PREFIX = "/api/media/";
function mediaIdFromUrl(url) {
    return /^\/api\/media\/([0-9a-f-]{36})$/.exec(url)?.[1] ?? null;
}


/***/ }),

/***/ "./services/customer/customer.schemas.ts":
/*!***********************************************!*\
  !*** ./services/customer/customer.schemas.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CustomerCreateSchema: () => (/* binding */ CustomerCreateSchema),
/* harmony export */   CustomerExportCommandSchema: () => (/* binding */ CustomerExportCommandSchema),
/* harmony export */   CustomerExportFiltersSchema: () => (/* binding */ CustomerExportFiltersSchema),
/* harmony export */   CustomerExportRequestSchema: () => (/* binding */ CustomerExportRequestSchema),
/* harmony export */   CustomerExportScopeSchema: () => (/* binding */ CustomerExportScopeSchema),
/* harmony export */   CustomerListParamsSchema: () => (/* binding */ CustomerListParamsSchema),
/* harmony export */   CustomerUpdateSchema: () => (/* binding */ CustomerUpdateSchema)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/types.js");
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/ZodError.js");
/* harmony import */ var _lib_validation_bounded_array__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/lib/validation/bounded-array */ "./lib/validation/bounded-array.ts");


const trimmedNonEmpty = zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().min(1);
const optionalNullableTrimmed = zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().min(1).nullish().transform((v)=>v === "" || v === undefined ? null : v);
const CustomerCreateSchema = zod__WEBPACK_IMPORTED_MODULE_1__.object({
    name: trimmedNonEmpty.max(200, "Name must be at most 200 characters"),
    code: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().min(1).max(50).nullish(),
    email: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().email("Invalid email").nullish().or(zod__WEBPACK_IMPORTED_MODULE_1__.literal("").transform(()=>null)),
    phone: optionalNullableTrimmed,
    address: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().max(500).nullish(),
    taxId: optionalNullableTrimmed,
    creditLimit: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().min(0).nullish(),
    paymentTerms: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().int().min(0).max(365).nullish(),
    notes: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().max(2000).nullish(),
    isActive: zod__WEBPACK_IMPORTED_MODULE_1__.boolean().default(true),
    preferredLocale: zod__WEBPACK_IMPORTED_MODULE_1__["enum"]([
        "EN",
        "FR"
    ]).default("EN")
});
const CustomerUpdateSchema = CustomerCreateSchema.partial();
const CustomerListParamsSchema = zod__WEBPACK_IMPORTED_MODULE_1__.object({
    page: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().int().min(1).default(1),
    pageSize: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().int().min(1).max(200).default(50),
    search: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().default(""),
    isActive: zod__WEBPACK_IMPORTED_MODULE_1__.boolean().optional()
});
const CustomerExportScopeSchema = zod__WEBPACK_IMPORTED_MODULE_1__["enum"]([
    "customers",
    "customer",
    "customer-orders"
]);
const CustomerExportFiltersSchema = zod__WEBPACK_IMPORTED_MODULE_1__.object({
    status: zod__WEBPACK_IMPORTED_MODULE_1__["enum"]([
        "all",
        "active",
        "inactive"
    ]).optional().default("all"),
    activity: zod__WEBPACK_IMPORTED_MODULE_1__["enum"]([
        "all",
        "open-orders",
        "unpaid",
        "over-limit",
        "with-orders",
        "no-orders"
    ]).optional().default("all"),
    preferredLocale: zod__WEBPACK_IMPORTED_MODULE_1__["enum"]([
        "all",
        "EN",
        "FR"
    ]).optional().default("all"),
    search: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().max(200).optional().default(""),
    orderStatus: zod__WEBPACK_IMPORTED_MODULE_1__["enum"]([
        "all",
        "DRAFT",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED"
    ]).optional().default("all")
});
const CustomerExportRequestSchema = zod__WEBPACK_IMPORTED_MODULE_1__.object({
    scope: CustomerExportScopeSchema.optional().default("customers"),
    customerId: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().min(1).optional(),
    customerIds: (0,_lib_validation_bounded_array__WEBPACK_IMPORTED_MODULE_0__.boundedArray)(zod__WEBPACK_IMPORTED_MODULE_1__.array(zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().min(1)).max(5000), 5000).optional(),
    purpose: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().min(3).max(160).optional().default("CUSTOMER_DATA_EXPORT"),
    fileType: zod__WEBPACK_IMPORTED_MODULE_1__.literal("csv").optional().default("csv"),
    filters: CustomerExportFiltersSchema.optional().default({})
}).superRefine((value, ctx)=>{
    if (value.scope !== "customers" && !value.customerId) {
        ctx.addIssue({
            code: zod__WEBPACK_IMPORTED_MODULE_2__.ZodIssueCode.custom,
            path: [
                "customerId"
            ],
            message: "Customer is required for this export scope"
        });
    }
});
const dateInputSchema = zod__WEBPACK_IMPORTED_MODULE_1__.union([
    zod__WEBPACK_IMPORTED_MODULE_1__.date(),
    zod__WEBPACK_IMPORTED_MODULE_1__.string(),
    zod__WEBPACK_IMPORTED_MODULE_1__.number()
]).optional();
const CustomerExportCommandSchema = CustomerExportRequestSchema.and(zod__WEBPACK_IMPORTED_MODULE_1__.object({
    organizationId: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().min(1),
    actorId: zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().min(1).optional().nullable(),
    actorPermissions: zod__WEBPACK_IMPORTED_MODULE_1__.array(zod__WEBPACK_IMPORTED_MODULE_1__.string().trim().min(1)).optional().default([]),
    lastAuthAt: dateInputSchema,
    now: dateInputSchema
}));


/***/ }),

/***/ "./services/item/item.schemas.ts":
/*!***************************************!*\
  !*** ./services/item/item.schemas.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ItemCreateSchema: () => (/* binding */ ItemCreateSchema),
/* harmony export */   ItemUpdateSchema: () => (/* binding */ ItemUpdateSchema),
/* harmony export */   PaginatedQuerySchema: () => (/* binding */ PaginatedQuerySchema)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/types.js");
/* harmony import */ var _lib_item_form_validation__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/lib/item/form-validation */ "./lib/item/form-validation.ts");


const NAME_MAX = 200;
const DESC_MAX = 1000;
const ItemCreateSchema = zod__WEBPACK_IMPORTED_MODULE_1__.object({
    nameEn: zod__WEBPACK_IMPORTED_MODULE_1__.string().min(1, "English name is required").max(NAME_MAX, `English name must be at most ${NAME_MAX} characters`).trim(),
    nameFr: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(NAME_MAX, `French name must be at most ${NAME_MAX} characters`).trim().nullish().transform((v)=>v && v.length > 0 ? v : null),
    descriptionEn: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(DESC_MAX).trim().nullish().transform((v)=>v && v.length > 0 ? v : null),
    descriptionFr: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(DESC_MAX).trim().nullish().transform((v)=>v && v.length > 0 ? v : null),
    sku: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(100).trim().optional(),
    slug: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(220).optional(),
    costPrice: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().min(0, "Cost price cannot be negative").default(0),
    sellingPrice: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().min(0, "Selling price cannot be negative").default(0),
    imageUrls: zod__WEBPACK_IMPORTED_MODULE_1__.union([
        _lib_item_form_validation__WEBPACK_IMPORTED_MODULE_0__.itemImageReferenceSchema,
        zod__WEBPACK_IMPORTED_MODULE_1__.array(_lib_item_form_validation__WEBPACK_IMPORTED_MODULE_0__.itemImageReferenceSchema)
    ]).optional(),
    thumbnail: zod__WEBPACK_IMPORTED_MODULE_1__.string().nullable().optional(),
    categoryId: zod__WEBPACK_IMPORTED_MODULE_1__.string().nullish(),
    brandId: zod__WEBPACK_IMPORTED_MODULE_1__.string().nullish(),
    unitId: zod__WEBPACK_IMPORTED_MODULE_1__.string().nullish(),
    taxRateId: zod__WEBPACK_IMPORTED_MODULE_1__.string().nullish(),
    locationId: zod__WEBPACK_IMPORTED_MODULE_1__.string().optional(),
    initialQuantity: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().int().min(0).optional(),
    unitCost: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().min(0).optional()
});
const ItemUpdateSchema = zod__WEBPACK_IMPORTED_MODULE_1__.object({
    nameEn: zod__WEBPACK_IMPORTED_MODULE_1__.string().min(1).max(NAME_MAX).trim().optional(),
    nameFr: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(NAME_MAX).trim().nullish().transform((v)=>v && v.length > 0 ? v : null),
    descriptionEn: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(DESC_MAX).trim().nullish().transform((v)=>v && v.length > 0 ? v : null),
    descriptionFr: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(DESC_MAX).trim().nullish().transform((v)=>v && v.length > 0 ? v : null),
    costPrice: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().min(0).optional(),
    sellingPrice: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().min(0).optional(),
    sku: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(100).trim().optional(),
    thumbnail: zod__WEBPACK_IMPORTED_MODULE_1__.string().nullable().optional(),
    imageUrls: zod__WEBPACK_IMPORTED_MODULE_1__.array(_lib_item_form_validation__WEBPACK_IMPORTED_MODULE_0__.itemImageReferenceSchema).optional(),
    isActive: zod__WEBPACK_IMPORTED_MODULE_1__.boolean().optional(),
    isDiscontinued: zod__WEBPACK_IMPORTED_MODULE_1__.boolean().optional()
});
const PaginatedQuerySchema = zod__WEBPACK_IMPORTED_MODULE_1__.object({
    page: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().int().min(1).default(1),
    pageSize: zod__WEBPACK_IMPORTED_MODULE_1__.coerce.number().int().min(1).max(100).default(50),
    search: zod__WEBPACK_IMPORTED_MODULE_1__.string().max(200).trim().default("")
});


/***/ }),

/***/ "./services/onboarding/master-data-csv.ts":
/*!************************************************!*\
  !*** ./services/onboarding/master-data-csv.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MASTER_DATA_IMPORT_MAX_BYTES: () => (/* binding */ MASTER_DATA_IMPORT_MAX_BYTES),
/* harmony export */   MASTER_DATA_IMPORT_MAX_ROWS: () => (/* binding */ MASTER_DATA_IMPORT_MAX_ROWS),
/* harmony export */   MASTER_DATA_IMPORT_SCHEMA_VERSION: () => (/* binding */ MASTER_DATA_IMPORT_SCHEMA_VERSION),
/* harmony export */   MASTER_DATA_IMPORT_TARGETS: () => (/* binding */ MASTER_DATA_IMPORT_TARGETS),
/* harmony export */   MASTER_DATA_TARGET_CONFIG: () => (/* binding */ MASTER_DATA_TARGET_CONFIG),
/* harmony export */   analyzeMasterDataCsv: () => (/* binding */ analyzeMasterDataCsv),
/* harmony export */   buildTenantCsvTemplate: () => (/* binding */ buildTenantCsvTemplate),
/* harmony export */   defaultFieldMap: () => (/* binding */ defaultFieldMap),
/* harmony export */   hashCsvContent: () => (/* binding */ hashCsvContent),
/* harmony export */   hashStablePayload: () => (/* binding */ hashStablePayload),
/* harmony export */   masterDataSchemaVersion: () => (/* binding */ masterDataSchemaVersion),
/* harmony export */   normalizeBusinessKey: () => (/* binding */ normalizeBusinessKey),
/* harmony export */   parseMasterDataDomainRow: () => (/* binding */ parseMasterDataDomainRow),
/* harmony export */   stableStringify: () => (/* binding */ stableStringify),
/* harmony export */   validateFieldMap: () => (/* binding */ validateFieldMap)
/* harmony export */ });
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:crypto */ "node:crypto");
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_crypto__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/types.js");
/* harmony import */ var _lib_media_policy__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/media/policy */ "./lib/media/policy.ts");
/* harmony import */ var _services_customer_customer_schemas__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/services/customer/customer.schemas */ "./services/customer/customer.schemas.ts");
/* harmony import */ var _services_item_item_schemas__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/services/item/item.schemas */ "./services/item/item.schemas.ts");
/* harmony import */ var _services_supplier_supplier_schemas__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/services/supplier/supplier.schemas */ "./services/supplier/supplier.schemas.ts");
/* harmony import */ var _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @/services/_shared/action-errors */ "./services/_shared/action-errors.ts");







const MASTER_DATA_IMPORT_SCHEMA_VERSION = "1";
const masterDataSchemaVersion = (target)=>target === "ITEM" ? "2" : MASTER_DATA_IMPORT_SCHEMA_VERSION;
const ItemImportSchema = _services_item_item_schemas__WEBPACK_IMPORTED_MODULE_3__.ItemCreateSchema.extend({
    imageUrls: zod__WEBPACK_IMPORTED_MODULE_6__.string().trim().refine((value)=>(0,_lib_media_policy__WEBPACK_IMPORTED_MODULE_1__.mediaIdFromUrl)(value) !== null, "Use an uploaded item image reference")
});
const MASTER_DATA_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const MASTER_DATA_IMPORT_MAX_ROWS = 1000;
const MASTER_DATA_IMPORT_TARGETS = [
    "CUSTOMER",
    "SUPPLIER",
    "ITEM"
];
const MASTER_DATA_TARGET_CONFIG = {
    CUSTOMER: {
        label: "customers",
        filename: "customers",
        fields: [
            "code",
            "name",
            "email",
            "phone",
            "address",
            "taxId",
            "paymentTerms",
            "creditLimit",
            "preferredLocale",
            "isActive"
        ],
        requiredFields: [
            "code",
            "name"
        ],
        businessKey: "code"
    },
    SUPPLIER: {
        label: "suppliers",
        filename: "suppliers",
        fields: [
            "code",
            "name",
            "contactPerson",
            "email",
            "phone",
            "address",
            "city",
            "state",
            "zipCode",
            "country",
            "taxId",
            "paymentTerms",
            "creditLimit",
            "preferredLocale",
            "isActive"
        ],
        requiredFields: [
            "code",
            "name"
        ],
        businessKey: "code"
    },
    ITEM: {
        label: "items",
        filename: "items",
        fields: [
            "sku",
            "nameEn",
            "nameFr",
            "descriptionEn",
            "descriptionFr",
            "costPrice",
            "sellingPrice",
            "imageUrls"
        ],
        requiredFields: [
            "sku",
            "nameEn",
            "imageUrls"
        ],
        businessKey: "sku"
    }
};
function sha256(value) {
    return `sha256:${(0,node_crypto__WEBPACK_IMPORTED_MODULE_0__.createHash)("sha256").update(value).digest("hex")}`;
}
function hashCsvContent(content) {
    return sha256(Buffer.from(content, "utf8"));
}
function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
        const record = value;
        return `{${Object.keys(record).sort().map((key)=>`${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
    }
    return JSON.stringify(value) ?? "null";
}
function hashStablePayload(value) {
    return sha256(stableStringify(value));
}
function normalizeBusinessKey(value) {
    return value.trim().toLocaleLowerCase("en-US");
}
function defaultFieldMap(target) {
    return Object.fromEntries(MASTER_DATA_TARGET_CONFIG[target].fields.map((field)=>[
            field,
            field
        ]));
}
function validateFieldMap(target, fieldMap) {
    const config = MASTER_DATA_TARGET_CONFIG[target];
    const allowedTargets = new Set(config.fields);
    const seenTargets = new Set();
    for (const [sourceColumn, targetField] of Object.entries(fieldMap)){
        if (!sourceColumn.trim()) throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_5__.BusinessRuleError("Mapping source columns must not be empty");
        if (!allowedTargets.has(targetField)) {
            throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_5__.BusinessRuleError(`Unsupported ${config.label} target field: ${targetField}`);
        }
        if (seenTargets.has(targetField)) {
            throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_5__.BusinessRuleError(`Target field ${targetField} may only be mapped once`);
        }
        seenTargets.add(targetField);
    }
    for (const requiredField of config.requiredFields){
        if (!seenTargets.has(requiredField)) {
            throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_5__.BusinessRuleError(`Required target field ${requiredField} must be mapped`);
        }
    }
}
function buildTenantCsvTemplate(organizationId, target) {
    const config = MASTER_DATA_TARGET_CONFIG[target];
    const content = `${config.fields.join(",")}\r\n`;
    return {
        organizationId,
        target,
        schemaVersion: masterDataSchemaVersion(target),
        filename: `${organizationId}-${config.filename}-v${masterDataSchemaVersion(target)}.csv`,
        mimeType: "text/csv",
        content,
        contentHash: hashCsvContent(content),
        requiredFields: [
            ...config.requiredFields
        ]
    };
}
function parseCsv(content) {
    const source = content.replace(/^\uFEFF/, "");
    const records = [];
    const rowNumbers = [];
    let record = [];
    let field = "";
    let quoted = false;
    let line = 1;
    let recordStartLine = 1;
    for(let index = 0; index < source.length; index += 1){
        const char = source[index];
        if (quoted) {
            if (char === '"' && source[index + 1] === '"') {
                field += '"';
                index += 1;
            } else if (char === '"') {
                quoted = false;
            } else {
                field += char;
                if (char === "\n") line += 1;
            }
            continue;
        }
        if (char === '"' && field.length === 0) {
            quoted = true;
        } else if (char === ",") {
            record.push(field);
            field = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && source[index + 1] === "\n") index += 1;
            record.push(field);
            if (record.some((value)=>value.trim() !== "")) {
                records.push(record);
                rowNumbers.push(recordStartLine);
            }
            record = [];
            field = "";
            line += 1;
            recordStartLine = line;
        } else {
            field += char;
        }
    }
    if (quoted) {
        return {
            headers: [],
            rows: [],
            issues: [
                {
                    rowNumber: recordStartLine,
                    field: null,
                    severity: "ERROR",
                    code: "CSV_UNTERMINATED_QUOTE",
                    safeMessage: "The CSV contains an unterminated quoted field."
                }
            ]
        };
    }
    record.push(field);
    if (record.some((value)=>value.trim() !== "")) {
        records.push(record);
        rowNumbers.push(recordStartLine);
    }
    const headers = (records.shift() ?? []).map((header)=>header.trim());
    rowNumbers.shift();
    const duplicateHeaders = headers.filter((header, index)=>headers.indexOf(header) !== index);
    const issues = duplicateHeaders.map((header)=>({
            rowNumber: 1,
            field: null,
            severity: "ERROR",
            code: "CSV_DUPLICATE_HEADER",
            safeMessage: "Each CSV header must be unique."
        }));
    const rows = records.map((values, index)=>({
            rowNumber: rowNumbers[index] ?? index + 2,
            values
        }));
    return {
        headers,
        rows,
        issues
    };
}
function safeSchemaIssue(rowNumber, field) {
    return {
        rowNumber,
        field,
        severity: "ERROR",
        code: "FIELD_INVALID",
        safeMessage: field ? `The ${field} field is invalid.` : "The row does not match the target schema."
    };
}
function parseOptionalNumber(value) {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value.trim())) return value;
    return Number(value);
}
function parseOptionalBoolean(value) {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string") return value;
    const normalized = value.trim().toLowerCase();
    if ([
        "true",
        "1",
        "yes"
    ].includes(normalized)) return true;
    if ([
        "false",
        "0",
        "no"
    ].includes(normalized)) return false;
    return value;
}
function prepareDomainData(target, mapped) {
    const data = {};
    for (const [key, value] of Object.entries(mapped)){
        data[key] = value.trim() === "" ? undefined : value.trim();
    }
    if ("paymentTerms" in data) data.paymentTerms = parseOptionalNumber(data.paymentTerms);
    if ("creditLimit" in data) data.creditLimit = parseOptionalNumber(data.creditLimit);
    if ("costPrice" in data) data.costPrice = parseOptionalNumber(data.costPrice);
    if ("sellingPrice" in data) data.sellingPrice = parseOptionalNumber(data.sellingPrice);
    if ("isActive" in data) data.isActive = parseOptionalBoolean(data.isActive);
    if (typeof data.preferredLocale === "string") data.preferredLocale = data.preferredLocale.toUpperCase();
    const schema = target === "CUSTOMER" ? _services_customer_customer_schemas__WEBPACK_IMPORTED_MODULE_2__.CustomerCreateSchema : target === "SUPPLIER" ? _services_supplier_supplier_schemas__WEBPACK_IMPORTED_MODULE_4__.SupplierCreateSchema : ItemImportSchema;
    return schema.safeParse(data);
}
function parseMasterDataDomainRow(target, data) {
    const schema = target === "CUSTOMER" ? _services_customer_customer_schemas__WEBPACK_IMPORTED_MODULE_2__.CustomerCreateSchema : target === "SUPPLIER" ? _services_supplier_supplier_schemas__WEBPACK_IMPORTED_MODULE_4__.SupplierCreateSchema : ItemImportSchema;
    return schema.safeParse(data);
}
function isSpreadsheetFormula(value) {
    const trimmed = value.trimStart();
    return /^[=@]/.test(trimmed) || /^[+-](?!\d+(?:\.\d+)?$)/.test(trimmed);
}
function analyzeMasterDataCsv(input) {
    validateFieldMap(input.target, input.fieldMap);
    const config = MASTER_DATA_TARGET_CONFIG[input.target];
    const parsed = parseCsv(input.content);
    const issues = [
        ...parsed.issues
    ];
    const normalizedHeaderMap = new Map(parsed.headers.map((header, index)=>[
            header.toLowerCase(),
            index
        ]));
    const normalizedMappings = Object.entries(input.fieldMap).map(([source, target])=>({
            source,
            target,
            index: normalizedHeaderMap.get(source.trim().toLowerCase())
        }));
    for (const mapping of normalizedMappings){
        if (mapping.index === undefined) {
            issues.push({
                rowNumber: 1,
                field: mapping.source,
                severity: "ERROR",
                code: "CSV_MISSING_MAPPED_COLUMN",
                safeMessage: "A mapped CSV column is missing from the header."
            });
        }
    }
    const mappedHeaders = new Set(Object.keys(input.fieldMap).map((header)=>header.trim().toLowerCase()));
    for (const header of parsed.headers){
        if (!mappedHeaders.has(header.toLowerCase())) {
            issues.push({
                rowNumber: 1,
                field: null,
                severity: "ERROR",
                code: "CSV_UNMAPPED_COLUMN",
                safeMessage: "Every source column must be included in the selected mapping version."
            });
        }
    }
    if (parsed.rows.length > MASTER_DATA_IMPORT_MAX_ROWS) {
        issues.push({
            rowNumber: 1,
            field: null,
            severity: "ERROR",
            code: "CSV_ROW_LIMIT_EXCEEDED",
            safeMessage: `This first slice accepts at most ${MASTER_DATA_IMPORT_MAX_ROWS} rows per batch.`
        });
    }
    const rows = [];
    const sourceRequiredFieldTotals = Object.fromEntries(config.requiredFields.map((field)=>[
            field,
            0
        ]));
    const fileKeyCounts = new Map();
    for (const csvRow of parsed.rows.slice(0, MASTER_DATA_IMPORT_MAX_ROWS)){
        const rowIssues = [];
        const mapped = {};
        if (csvRow.values.length !== parsed.headers.length) {
            rowIssues.push({
                rowNumber: csvRow.rowNumber,
                field: null,
                severity: "ERROR",
                code: "CSV_COLUMN_COUNT_MISMATCH",
                safeMessage: "The row column count does not match the CSV header."
            });
        }
        for (const mapping of normalizedMappings){
            const value = mapping.index === undefined ? "" : csvRow.values[mapping.index] ?? "";
            mapped[mapping.target] = value;
            if (isSpreadsheetFormula(value)) {
                rowIssues.push({
                    rowNumber: csvRow.rowNumber,
                    field: mapping.target,
                    severity: "ERROR",
                    code: "CSV_FORMULA_REJECTED",
                    safeMessage: "Spreadsheet formulas are not accepted in onboarding imports."
                });
            }
        }
        for (const requiredField of config.requiredFields){
            if ((mapped[requiredField] ?? "").trim()) sourceRequiredFieldTotals[requiredField] += 1;
            else {
                rowIssues.push({
                    rowNumber: csvRow.rowNumber,
                    field: requiredField,
                    severity: "ERROR",
                    code: "REQUIRED_FIELD_MISSING",
                    safeMessage: `The ${requiredField} field is required.`
                });
            }
        }
        const validation = prepareDomainData(input.target, mapped);
        const normalizedData = validation.success ? validation.data : mapped;
        if (input.target === "ITEM" && validation.success && input.availableItemMedia && !input.availableItemMedia.has(String(validation.data.imageUrls))) {
            rowIssues.push({
                rowNumber: csvRow.rowNumber,
                field: "imageUrls",
                severity: "ERROR",
                code: "ITEM_MEDIA_UNAVAILABLE",
                safeMessage: "Use an available image uploaded to this organization, then validate a corrected file."
            });
        }
        if (!validation.success) {
            for (const schemaIssue of validation.error.issues){
                const field = typeof schemaIssue.path[0] === "string" ? schemaIssue.path[0] : null;
                if (!rowIssues.some((issue)=>issue.field === field && issue.code === "REQUIRED_FIELD_MISSING")) {
                    rowIssues.push(safeSchemaIssue(csvRow.rowNumber, field));
                }
            }
        }
        const rawKey = mapped[config.businessKey]?.trim() ?? "";
        const businessKey = rawKey ? normalizeBusinessKey(rawKey) : null;
        if (businessKey) fileKeyCounts.set(businessKey, (fileKeyCounts.get(businessKey) ?? 0) + 1);
        rows.push({
            rowNumber: csvRow.rowNumber,
            sourceRowHash: hashStablePayload(csvRow.values),
            businessKey,
            normalizedData: normalizedData,
            valid: rowIssues.length === 0,
            issues: rowIssues
        });
    }
    const existingKeys = input.existingBusinessKeys ?? new Set();
    for (const row of rows){
        if (row.businessKey && (fileKeyCounts.get(row.businessKey) ?? 0) > 1) {
            row.issues.push({
                rowNumber: row.rowNumber,
                field: config.businessKey,
                severity: "ERROR",
                code: "DUPLICATE_IN_FILE",
                safeMessage: `The ${config.businessKey} is duplicated within this file.`
            });
        }
        if (row.businessKey && existingKeys.has(row.businessKey)) {
            row.issues.push({
                rowNumber: row.rowNumber,
                field: config.businessKey,
                severity: "ERROR",
                code: "DUPLICATE_IN_TENANT",
                safeMessage: `The ${config.businessKey} already exists in this tenant.`
            });
        }
        row.valid = row.issues.length === 0;
        issues.push(...row.issues);
    }
    const duplicateRows = new Set(issues.filter((issue)=>issue.code === "DUPLICATE_IN_FILE" || issue.code === "DUPLICATE_IN_TENANT").map((issue)=>issue.rowNumber));
    const errorRows = new Set(issues.filter((issue)=>issue.severity === "ERROR").map((issue)=>issue.rowNumber));
    return {
        rows,
        issues,
        sourceRecordCount: rows.length,
        validRecordCount: rows.filter((row)=>row.valid).length,
        errorRecordCount: errorRows.size,
        duplicateRecordCount: duplicateRows.size,
        sourceRequiredFieldTotals
    };
}


/***/ }),

/***/ "./services/onboarding/opening-domain-source.ts":
/*!******************************************************!*\
  !*** ./services/onboarding/opening-domain-source.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   approvedOpeningSourceInTx: () => (/* binding */ approvedOpeningSourceInTx),
/* harmony export */   openingDate: () => (/* binding */ openingDate),
/* harmony export */   openingJson: () => (/* binding */ openingJson),
/* harmony export */   openingMoney: () => (/* binding */ openingMoney),
/* harmony export */   retainOpeningOperationInTx: () => (/* binding */ retainOpeningOperationInTx)
/* harmony export */ });
Object(function webpackMissingModule() { var e = new Error("Cannot find module 'server-only'"); e.code = 'MODULE_NOT_FOUND'; throw e; }());
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @prisma/client */ "./node_modules/@prisma/client/index-browser.js");
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/services/_shared/action-errors */ "./services/_shared/action-errors.ts");
/* harmony import */ var _opening_position_contract__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./opening-position.contract */ "./services/onboarding/opening-position.contract.ts");
/* harmony import */ var _master_data_csv__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./master-data-csv */ "./services/onboarding/master-data-csv.ts");





const openingJson = (value)=>JSON.parse(JSON.stringify(value));
const openingDate = (date)=>new Date(`${date}T00:00:00+01:00`);
const openingMoney = (value)=>new _prisma_client__WEBPACK_IMPORTED_MODULE_4__.Prisma.Decimal(value).toDecimalPlaces(2, _prisma_client__WEBPACK_IMPORTED_MODULE_4__.Prisma.Decimal.ROUND_HALF_UP);
/** Internal domain adapters derive every value from retained evidence. No caller-supplied balances. */ async function approvedOpeningSourceInTx(tx, organizationId, executionId) {
    const execution = await tx.financialOpeningExecution.findFirst({
        where: {
            id: executionId,
            organizationId
        },
        include: {
            revision: true
        }
    });
    if (!execution) throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_1__.NotFoundError("Opening approval is unavailable.");
    if (execution.status !== "APPROVED" || execution.revision.reviewDigest !== execution.manifestDigest) throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_1__.ConflictError("Opening approval is not applicable.");
    const source = _opening_position_contract__WEBPACK_IMPORTED_MODULE_2__.openingSourceSchema.parse(JSON.parse(execution.revision.sourceContent));
    const mappings = _opening_position_contract__WEBPACK_IMPORTED_MODULE_2__.openingMappingsSchema.parse(execution.revision.mappings);
    const target = (group, value)=>{
        const matches = mappings[group].filter((row)=>row.source === value);
        if (matches.length !== 1) throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_1__.ConflictError("An opening mapping is ambiguous or missing.");
        return matches[0].targetId;
    };
    return {
        execution,
        source,
        target,
        at: openingDate(source.cutoverDate)
    };
}
async function retainOpeningOperationInTx(tx, input) {
    return tx.financialOpeningOperation.create({
        data: {
            organizationId: input.organizationId,
            executionId: input.executionId,
            domain: input.domain,
            sourceId: input.sourceId,
            sourceHash: (0,_master_data_csv__WEBPACK_IMPORTED_MODULE_3__.hashStablePayload)(input.source),
            receipt: openingJson(input.receipt),
            receiptHash: (0,_master_data_csv__WEBPACK_IMPORTED_MODULE_3__.hashStablePayload)(input.receipt)
        }
    });
}


/***/ }),

/***/ "./services/onboarding/opening-position.contract.ts":
/*!**********************************************************!*\
  !*** ./services/onboarding/opening-position.contract.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   OPENING_DOMAINS: () => (/* binding */ OPENING_DOMAINS),
/* harmony export */   OPENING_MAX_BYTES: () => (/* binding */ OPENING_MAX_BYTES),
/* harmony export */   OPENING_MAX_ROWS: () => (/* binding */ OPENING_MAX_ROWS),
/* harmony export */   openingControlsSchema: () => (/* binding */ openingControlsSchema),
/* harmony export */   openingMappingsSchema: () => (/* binding */ openingMappingsSchema),
/* harmony export */   openingReviewSchema: () => (/* binding */ openingReviewSchema),
/* harmony export */   openingScopeSchema: () => (/* binding */ openingScopeSchema),
/* harmony export */   openingSourceSchema: () => (/* binding */ openingSourceSchema),
/* harmony export */   openingStageSchema: () => (/* binding */ openingStageSchema)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/types.js");

const OPENING_MAX_BYTES = 100000;
const OPENING_MAX_ROWS = 100;
const OPENING_DOMAINS = [
    "AR",
    "AP",
    "STOCK",
    "CASH",
    "EQUITY"
];
const text = zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(1).max(120);
const value = zod__WEBPACK_IMPORTED_MODULE_0__.string().max(40);
const id = zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(1).max(150);
const hash = zod__WEBPACK_IMPORTED_MODULE_0__.string().regex(/^sha256:[a-f0-9]{64}$/);
const openingSourceSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    version: zod__WEBPACK_IMPORTED_MODULE_0__.literal("opening-position-v1"),
    country: zod__WEBPACK_IMPORTED_MODULE_0__.literal("CM"),
    currency: zod__WEBPACK_IMPORTED_MODULE_0__.literal("XAF"),
    cutoverDate: zod__WEBPACK_IMPORTED_MODULE_0__.literal("2026-10-01"),
    timezone: zod__WEBPACK_IMPORTED_MODULE_0__.literal("Africa/Douala"),
    evidenceReference: text,
    stock: zod__WEBPACK_IMPORTED_MODULE_0__.array(zod__WEBPACK_IMPORTED_MODULE_0__.object({
        sourceId: text,
        item: text,
        location: text,
        unit: text,
        account: text,
        quantity: value,
        unitCost: value,
        value: value
    }).strict()).max(OPENING_MAX_ROWS),
    openItems: zod__WEBPACK_IMPORTED_MODULE_0__.array(zod__WEBPACK_IMPORTED_MODULE_0__.object({
        sourceId: text,
        kind: zod__WEBPACK_IMPORTED_MODULE_0__["enum"]([
            "AR",
            "AP"
        ]),
        counterparty: text,
        document: text,
        account: text,
        sourceDate: value,
        dueDate: value,
        currency: value,
        original: value,
        settled: value,
        outstanding: value
    }).strict()).max(OPENING_MAX_ROWS),
    ledger: zod__WEBPACK_IMPORTED_MODULE_0__.array(zod__WEBPACK_IMPORTED_MODULE_0__.object({
        sourceId: text,
        account: text,
        domain: zod__WEBPACK_IMPORTED_MODULE_0__["enum"](OPENING_DOMAINS),
        side: zod__WEBPACK_IMPORTED_MODULE_0__["enum"]([
            "DEBIT",
            "CREDIT"
        ]),
        amount: value,
        currency: value,
        covers: zod__WEBPACK_IMPORTED_MODULE_0__.array(text).max(OPENING_MAX_ROWS)
    }).strict()).min(1).max(OPENING_MAX_ROWS)
}).strict().refine((s)=>s.stock.length + s.openItems.length + s.ledger.length <= OPENING_MAX_ROWS, "At most 100 total rows.");
const openingControlsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    version: zod__WEBPACK_IMPORTED_MODULE_0__.literal("opening-controls-v1"),
    evidenceReference: text,
    country: zod__WEBPACK_IMPORTED_MODULE_0__.literal("CM"),
    currency: zod__WEBPACK_IMPORTED_MODULE_0__.literal("XAF"),
    cutoverDate: zod__WEBPACK_IMPORTED_MODULE_0__.literal("2026-10-01"),
    stock: value,
    ar: value,
    ap: value,
    debit: value,
    credit: value,
    quantities: zod__WEBPACK_IMPORTED_MODULE_0__.array(zod__WEBPACK_IMPORTED_MODULE_0__.object({
        unit: text,
        quantity: value
    }).strict()).max(OPENING_MAX_ROWS)
}).strict();
const mapping = zod__WEBPACK_IMPORTED_MODULE_0__.array(zod__WEBPACK_IMPORTED_MODULE_0__.object({
    source: text,
    targetId: id
}).strict()).max(OPENING_MAX_ROWS);
const openingMappingsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    accounts: mapping,
    customers: mapping,
    suppliers: mapping,
    items: mapping,
    locations: mapping
}).strict();
const openingScopeSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    clientOrganizationId: id.optional()
}).strict();
const openingStageSchema = openingScopeSchema.extend({
    sourceFilename: text,
    sourceContent: zod__WEBPACK_IMPORTED_MODULE_0__.string().min(1).max(OPENING_MAX_BYTES),
    controlsFilename: text,
    controlsContent: zod__WEBPACK_IMPORTED_MODULE_0__.string().min(1).max(OPENING_MAX_BYTES),
    mappings: openingMappingsSchema,
    expectedRevision: zod__WEBPACK_IMPORTED_MODULE_0__.number().int().min(0),
    idempotencyKey: zod__WEBPACK_IMPORTED_MODULE_0__.string().min(8).max(100)
}).strict();
const openingReviewSchema = openingScopeSchema.extend({
    revisionId: id,
    expectedDigest: hash,
    decision: zod__WEBPACK_IMPORTED_MODULE_0__["enum"]([
        "REVIEWED",
        "CHANGES_REQUESTED"
    ]),
    conclusion: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(10).max(2000),
    idempotencyKey: zod__WEBPACK_IMPORTED_MODULE_0__.string().min(8).max(100)
}).strict();


/***/ }),

/***/ "./services/supplier/supplier.schemas.ts":
/*!***********************************************!*\
  !*** ./services/supplier/supplier.schemas.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SupplierCreateSchema: () => (/* binding */ SupplierCreateSchema),
/* harmony export */   SupplierListParamsSchema: () => (/* binding */ SupplierListParamsSchema),
/* harmony export */   SupplierSearchSchema: () => (/* binding */ SupplierSearchSchema),
/* harmony export */   SupplierUpdateSchema: () => (/* binding */ SupplierUpdateSchema)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/types.js");

const optionalString = zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().max(500).nullish().transform((v)=>v === "" || v === undefined ? null : v);
const SupplierCreateSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    name: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(2, "Supplier name must be at least 2 characters").max(200),
    code: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(1).max(50).nullish(),
    contactPerson: optionalString,
    email: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().email("Invalid email").nullish().or(zod__WEBPACK_IMPORTED_MODULE_0__.literal("").transform(()=>null)),
    phone: optionalString,
    address: optionalString,
    city: optionalString,
    state: optionalString,
    zipCode: optionalString,
    country: optionalString,
    taxId: optionalString,
    paymentTerms: zod__WEBPACK_IMPORTED_MODULE_0__.coerce.number().int().min(0).max(365).nullish().default(30),
    creditLimit: zod__WEBPACK_IMPORTED_MODULE_0__.coerce.number().min(0).nullish(),
    notes: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().max(2000).nullish(),
    isActive: zod__WEBPACK_IMPORTED_MODULE_0__.boolean().default(true),
    preferredLocale: zod__WEBPACK_IMPORTED_MODULE_0__["enum"]([
        "EN",
        "FR"
    ]).default("EN")
});
const SupplierUpdateSchema = SupplierCreateSchema.partial();
const SupplierListParamsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    page: zod__WEBPACK_IMPORTED_MODULE_0__.coerce.number().int().min(1).default(1),
    pageSize: zod__WEBPACK_IMPORTED_MODULE_0__.coerce.number().int().min(1).max(200).default(20),
    search: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().default(""),
    isActive: zod__WEBPACK_IMPORTED_MODULE_0__.boolean().optional(),
    sortBy: zod__WEBPACK_IMPORTED_MODULE_0__["enum"]([
        "name",
        "code",
        "createdAt",
        "updatedAt"
    ]).default("name"),
    sortOrder: zod__WEBPACK_IMPORTED_MODULE_0__["enum"]([
        "asc",
        "desc"
    ]).default("asc")
});
const SupplierSearchSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    q: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().default(""),
    limit: zod__WEBPACK_IMPORTED_MODULE_0__.coerce.number().int().min(1).max(50).default(10)
});


/***/ })

}]);